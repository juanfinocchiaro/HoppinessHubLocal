import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Maps MercadoPago payment_method_id / payment_type_id to our MetodoPago.
 */
function mapPaymentMethod(paymentData: Record<string, unknown>): string {
  const typeId = paymentData.payment_type_id as string | undefined;
  const methodId = paymentData.payment_method_id as string | undefined;

  if (typeId === "debit_card") return "tarjeta_debito";
  if (typeId === "credit_card") return "tarjeta_credito";
  if (typeId === "account_money") return "mercadopago_qr";

  if (methodId === "debit_card") return "tarjeta_debito";
  if (methodId === "credit_card") return "tarjeta_credito";
  if (methodId === "account_money") return "mercadopago_qr";

  return "mercadopago_qr";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify webhook signature if secret is configured
    const mpWebhookSecret = Deno.env.get("MP_WEBHOOK_SECRET");
    if (mpWebhookSecret) {
      const xSignature = req.headers.get("x-signature");
      const xRequestId = req.headers.get("x-request-id");
      if (!xSignature || !xRequestId) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const parts = Object.fromEntries(
        xSignature.split(",").map((p: string) => {
          const [k, v] = p.split("=");
          return [k.trim(), v?.trim()];
        }),
      );
      const ts = parts["ts"];
      const hash = parts["v1"];
      const url = new URL(req.url);
      const dataId = url.searchParams.get("data.id") ?? "";
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(mpWebhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
      const computed = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (computed !== hash) {
        console.error("Webhook signature mismatch");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();

    if (
      body.type !== "payment" &&
      body.action !== "payment.created" &&
      body.action !== "payment.updated"
    ) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to resolve branch from external_reference (pedido_id) first to avoid N+1
    let matchedBranchId: string | null = null;
    let paymentData: Record<string, unknown> | null = null;
    let matchedToken: string | null = null;

    const extRef = body.data?.external_reference;
    if (extRef) {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("branch_id")
        .eq("id", extRef)
        .maybeSingle();
      if (pedido?.branch_id) {
        const { data: cfg } = await supabase
          .from("mercadopago_config")
          .select("branch_id, access_token")
          .eq("branch_id", pedido.branch_id)
          .eq("connection_status", "conectado")
          .single();
        if (cfg?.access_token) {
          matchedBranchId = cfg.branch_id;
          matchedToken = cfg.access_token;
        }
      }
    }

    // Fallback: iterate connected branches
    if (!matchedToken) {
      const { data: configs } = await supabase
        .from("mercadopago_config")
        .select("branch_id, access_token")
        .eq("connection_status", "conectado");

      if (!configs?.length) {
        return new Response(
          JSON.stringify({ error: "No connected branches" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      for (const cfg of configs) {
        const res = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          { headers: { Authorization: `Bearer ${cfg.access_token}` } },
        );
        if (res.ok) {
          paymentData = await res.json();
          matchedBranchId = cfg.branch_id;
          break;
        }
      }
    }

    // Fetch payment data if we found the branch via fast path
    if (matchedToken && !paymentData) {
      const res = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${matchedToken}` } },
      );
      if (res.ok) {
        paymentData = await res.json();
      }
    }

    if (!paymentData || !matchedBranchId) {
      return new Response(
        JSON.stringify({ error: "Payment not found in any branch" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const status = paymentData.status as string;
    const externalReference = paymentData.external_reference as string | null;
    const transactionAmount = Number(paymentData.transaction_amount);

    if (externalReference && status === "approved") {
      // Idempotency: check if this payment was already processed
      const { data: existing } = await supabase
        .from("pedido_pagos")
        .select("id")
        .eq("mp_payment_id", String(paymentId))
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const metodo = mapPaymentMethod(paymentData);

        // Insert the payment record with reconciliation data
        await supabase.from("pedido_pagos").insert({
          pedido_id: externalReference,
          metodo,
          monto: transactionAmount,
          monto_recibido: transactionAmount,
          vuelto: 0,
          mp_payment_id: String(paymentId),
          conciliado: true,
          conciliado_at: new Date().toISOString(),
        });

        // Fetch current order state to decide transition
        const { data: pedido } = await supabase
          .from("pedidos")
          .select("id, estado, origen, branch_id")
          .eq("id", externalReference)
          .eq("branch_id", matchedBranchId)
          .single();

        if (pedido) {
          const updates: Record<string, unknown> = {
            mp_payment_id: String(paymentId),
            pago_estado: "confirmado",
          };

          // Transition pendiente_pago -> pendiente (makes order visible to kitchen)
          if (pedido.estado === "pendiente_pago") {
            if (pedido.origen === "webapp") {
              const { data: wconfig } = await supabase
                .from("webapp_config")
                .select("auto_accept_orders, recepcion_modo")
                .eq("branch_id", matchedBranchId)
                .single();

              const autoAccept =
                wconfig?.auto_accept_orders === true ||
                wconfig?.recepcion_modo === "auto";

              updates.estado = autoAccept ? "en_preparacion" : "pendiente";
              if (autoAccept) {
                updates.tiempo_inicio_prep = new Date().toISOString();
              }
            } else {
              updates.estado = "pendiente";
            }
          }

          await supabase
            .from("pedidos")
            .update(updates)
            .eq("id", externalReference)
            .eq("branch_id", matchedBranchId);
        }
      }
    }

    // Handle refunds, chargebacks, and rejections
    if (externalReference && (status === "refunded" || status === "charged_back")) {
      await supabase
        .from("pedidos")
        .update({ pago_estado: "reembolsado" })
        .eq("id", externalReference)
        .eq("branch_id", matchedBranchId);
    }

    if (externalReference && (status === "rejected" || status === "cancelled")) {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("estado")
        .eq("id", externalReference)
        .eq("branch_id", matchedBranchId)
        .single();

      if (pedido?.estado === "pendiente_pago") {
        await supabase
          .from("pedidos")
          .update({ pago_estado: "rechazado", estado: "cancelado" })
          .eq("id", externalReference)
          .eq("branch_id", matchedBranchId);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        payment_id: paymentId,
        status,
        branch_id: matchedBranchId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("MP webhook error:", err);
    return new Response(
      JSON.stringify({
        error: (err as Error).message ?? "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PointPaymentRequest {
  branch_id: string;
  pedido_id: string;
  amount: number;
  ticket_number?: string;
  cancel_order_id?: string;
  check_order_id?: string;
  /** If true, cancel any pending order on the device before creating a new one */
  force_cancel_pending?: boolean;
}

/**
 * Creates a payment order on the MercadoPago Point Smart device using the
 * official /v1/orders API (replaces legacy /point/integration-api/devices).
 *
 * Flow:
 *  1. Auth + access check
 *  2. If force_cancel_pending, cancel the last known pending order
 *  3. Create the order via POST /v1/orders
 *  4. If 409 (device busy), attempt to cancel the blocking order and retry once
 *  5. Save the order_id on the pedido for later cancellation/tracking
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return json(401, { error: "Unauthorized" });

    const body: PointPaymentRequest = await req.json();
    const { branch_id, pedido_id, amount, ticket_number, force_cancel_pending, cancel_order_id, check_order_id } = body;

    // Access check via normalized model
    const [{ data: hasAccessV2 }, { data: localRole }] = await Promise.all([
      supabase.rpc("has_branch_access_v2", { p_user_id: user.id, p_branch_id: branch_id }),
      supabase
        .from("user_role_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("branch_id", branch_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);
    if (!hasAccessV2 && !localRole) return json(403, { error: "No tenés acceso a este local" });

    if (!branch_id || !pedido_id || (!amount && !cancel_order_id && !check_order_id)) {
      return json(400, { error: "branch_id, pedido_id y amount son requeridos" });
    }

    const { data: config } = await supabase
      .from("mercadopago_config")
      .select("access_token, device_id, connection_status")
      .eq("branch_id", branch_id)
      .single();

    if (!config?.access_token || config.connection_status !== "conectado") {
      return json(400, { error: "MercadoPago no está conectado para este local" });
    }
    if (!config.device_id) {
      return json(400, { error: "No hay Point Smart vinculado. Configuralo en Configuración > MercadoPago." });
    }

    const accessToken = config.access_token;
    const deviceId = config.device_id;

    if (check_order_id) {
      const orderStatus = await getOrderStatus(accessToken, check_order_id);
      if (!orderStatus.ok) {
        return json(orderStatus.status || 502, {
          error: orderStatus.data?.message || "No se pudo consultar el estado del cobro",
          detail: orderStatus.data,
        });
      }

      const status = orderStatus.data?.status ?? null;
      const paymentId = orderStatus.data?.transactions?.payments?.[0]?.id
        ? String(orderStatus.data.transactions.payments[0].id)
        : null;

      if (status === "processed" && paymentId) {
        await reconcileApprovedPayment({
          supabase,
          accessToken,
          branchId: branch_id,
          pedidoId: pedido_id,
          paymentId,
        });
      }

      const { data: existingPayment } = await supabase
        .from("order_payments")
        .select("method, amount, mp_payment_id, conciliado")
        .eq("pedido_id", pedido_id)
        .not("mp_payment_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return json(200, {
        ok: true,
        order_id: check_order_id,
        status,
        reconciled: !!existingPayment?.mp_payment_id,
        payment: existingPayment
          ? {
              method: existingPayment.method,
              amount: existingPayment.amount,
              mp_payment_id: existingPayment.mp_payment_id,
            }
          : null,
      });
    }

    if (cancel_order_id) {
      const cancelResult = await cancelOrder(accessToken, cancel_order_id);
      const manualCancelRequired =
        !cancelResult.ok &&
        cancelResult.data?.errors?.some((err: { code?: string }) => err.code === "cannot_cancel_order");

      return json(manualCancelRequired || cancelResult.ok ? 200 : 502, {
        ok: cancelResult.ok,
        cancelled_order_id: cancel_order_id,
        manual_cancel_required: manualCancelRequired,
        error: manualCancelRequired
          ? "El cobro sigue activo en el Point Smart. Cancelalo manualmente desde el dispositivo."
          : undefined,
        detail: cancelResult.data,
      });
    }

    // ── Force-cancel any known pending order ────────────────────────────
    if (force_cancel_pending) {
      const { data: pendingPedido } = await supabase
        .from("orders")
        .select("mp_payment_intent_id")
        .eq("branch_id", branch_id)
        .not("mp_payment_intent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingPedido?.mp_payment_intent_id) {
        await cancelOrder(accessToken, pendingPedido.mp_payment_intent_id);
      }
    }

    // ── Create the order via /v1/orders ────────────────────────────────
    const amountStr = amount.toFixed(2);
    const idempotencyKey = crypto.randomUUID();

    let result = await createPointOrder(accessToken, {
      terminal_id: deviceId,
      amount: amountStr,
      external_reference: pedido_id,
      ticket_number: ticket_number || pedido_id.slice(0, 8).toUpperCase(),
      idempotency_key: idempotencyKey,
    });

    // ── Handle 409: device busy → cancel pending + retry once ──────────
    if (result.status === 409) {
      // Try to find and cancel the blocking order
      const { data: lastPedido } = await supabase
        .from("orders")
        .select("mp_payment_intent_id")
        .eq("branch_id", branch_id)
        .not("mp_payment_intent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPedido?.mp_payment_intent_id) {
        const cancelResult = await cancelOrder(accessToken, lastPedido.mp_payment_intent_id);
        if (cancelResult.ok) {
          // Wait a moment for the device to process the cancellation
          await new Promise((r) => setTimeout(r, 1500));
          // Retry with a new idempotency key
          result = await createPointOrder(accessToken, {
            terminal_id: deviceId,
            amount: amountStr,
            external_reference: pedido_id,
            ticket_number: ticket_number || pedido_id.slice(0, 8).toUpperCase(),
            idempotency_key: crypto.randomUUID(),
          });
        }
      }

      // Still 409 after retry
      if (result.status === 409) {
        return json(409, {
          error: "El Point Smart tiene un cobro activo que no se pudo cancelar desde la API. Cancelalo manualmente desde el dispositivo: tocá la X o el botón rojo en la pantalla del Point.",
          can_force_cancel: true,
        });
      }
    }

    if (!result.ok) {
      return json(502, {
        error: result.data?.message || "Error al enviar cobro al Point Smart",
        detail: result.data,
      });
    }

    const orderId = result.data.id;
    const paymentId = result.data.transactions?.payments?.[0]?.id;

    // Save the order ID on the pedido for future cancellation/tracking
    await supabase
      .from("orders")
      .update({ mp_payment_intent_id: orderId } as any)
      .eq("id", pedido_id)
      .eq("branch_id", branch_id);

    return json(200, {
      payment_intent_id: orderId,
      payment_id: paymentId,
      device_id: deviceId,
      amount,
    });
  } catch (err) {
    return json(500, { error: (err as Error).message ?? "Internal error" });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────

interface CreateOrderParams {
  terminal_id: string;
  amount: string;
  external_reference: string;
  ticket_number: string;
  idempotency_key: string;
}

async function createPointOrder(
  accessToken: string,
  params: CreateOrderParams,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotency_key,
    },
    body: JSON.stringify({
      type: "point",
      external_reference: params.external_reference,
      expiration_time: "PT15M",
      transactions: {
        payments: [{ amount: params.amount }],
      },
      config: {
        point: {
          terminal_id: params.terminal_id,
          print_on_terminal: "no_ticket",
          ticket_number: params.ticket_number,
        },
      },
      description: "Hoppiness Club POS",
    }),
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function cancelOrder(
  accessToken: string,
  orderId: string,
): Promise<{ ok: boolean; data?: any }> {
  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
      },
    );
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: false };
  }
}

async function getOrderStatus(
  accessToken: string,
  orderId: string,
): Promise<{ ok: boolean; status: number; data?: any }> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 500 };
  }
}

async function getPaymentStatus(
  accessToken: string,
  paymentId: string,
): Promise<{ ok: boolean; status: number; data?: any }> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 500 };
  }
}

function mapPaymentMethod(paymentData: Record<string, unknown>): string {
  const typeId = paymentData.payment_type_id as string | undefined;
  const methodId = paymentData.payment_method_id as string | undefined;

  if (typeId === "debit_card" || methodId === "debit_card") return "tarjeta_debito";
  if (typeId === "credit_card" || methodId === "credit_card") return "tarjeta_credito";
  if (typeId === "account_money" || methodId === "account_money") return "mercadopago_qr";
  if (typeId === "bank_transfer" || methodId === "bank_transfer") return "transferencia";

  return "mercadopago_qr";
}

async function reconcileApprovedPayment({
  supabase,
  accessToken,
  branchId,
  pedidoId,
  paymentId,
}: {
  supabase: ReturnType<typeof createClient>;
  accessToken: string;
  branchId: string;
  pedidoId: string;
  paymentId: string;
}) {
  const { data: existing } = await supabase
    .from("order_payments")
    .select("id")
    .eq("mp_payment_id", paymentId)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const paymentStatus = await getPaymentStatus(accessToken, paymentId);
    if (!paymentStatus.ok || paymentStatus.data?.status !== "approved") return;

    const paymentData = paymentStatus.data as Record<string, unknown>;
    const transactionAmount = Number(paymentData.transaction_amount ?? 0);

    await supabase.from("order_payments").insert({
      pedido_id: pedidoId,
      method: mapPaymentMethod(paymentData),
      amount: transactionAmount,
      received_amount: transactionAmount,
      vuelto: 0,
      mp_payment_id: paymentId,
      conciliado: true,
      conciliado_at: new Date().toISOString(),
    });
  }

  const { data: pedido } = await supabase
    .from("orders")
    .select("id, status, source")
    .eq("id", pedidoId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!pedido) return;

  const updates: Record<string, unknown> = {
    pago_online_id: paymentId,
    pago_estado: "confirmado",
  };

  if (pedido.status === "pendiente_pago") {
    updates.status = pedido.source === "webapp" ? "pendiente" : "pendiente";
  }

  await supabase
    .from("orders")
    .update(updates)
    .eq("id", pedidoId)
    .eq("branch_id", branchId);
}

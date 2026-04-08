import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Changes the operating mode of a Point Smart terminal.
 * Uses PATCH /terminals/v1/setup (official MP API).
 * After updating MP, persists the new mode in mercadopago_config.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { branch_id, terminal_id, operating_mode } = await req.json();

    if (!branch_id || !terminal_id || !operating_mode) {
      return new Response(
        JSON.stringify({ error: "branch_id, terminal_id y operating_mode son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["PDV", "STANDALONE"].includes(operating_mode)) {
      return new Response(
        JSON.stringify({ error: "operating_mode debe ser PDV o STANDALONE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: config } = await supabase
      .from("mercadopago_config")
      .select("access_token, connection_status")
      .eq("branch_id", branch_id)
      .single();

    if (!config?.access_token || config.connection_status !== "conectado") {
      return new Response(
        JSON.stringify({ error: "MercadoPago no está conectado para este local" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call MP API to update operating mode
    const mpRes = await fetch("https://api.mercadopago.com/terminals/v1/setup", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        terminals: [{ id: terminal_id, operating_mode }],
      }),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      const errorMessages: Record<string, string> = {
        store_pos_not_found: "La terminal no tiene sucursal ni caja asociada en MercadoPago. Creá una desde mercadopago.com.ar → Tu negocio → Locales y cajas.",
        terminal_not_allowed_action: "Este modelo de terminal no soporta cambio de modo via API. Cambialo desde el dispositivo: Más opciones → Ajustes → Modo de vinculación.",
        "Only one pos-store with PDV mode ON or SUSPENDED is allowed": "Ya hay otra terminal en modo PDV para esta caja. Desvincularla primero.",
      };
      const mpError = mpData?.message || mpData?.error || "Error al cambiar modo en MercadoPago";
      const friendlyMsg = errorMessages[mpError] || errorMessages[mpData?.cause?.[0]?.code] || mpError;
      return new Response(
        JSON.stringify({ error: friendlyMsg, detail: mpData }),
        { status: mpRes.status >= 500 ? 502 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Persist the new mode in our DB
    await supabase
      .from("mercadopago_config")
      .update({ device_operating_mode: operating_mode, updated_at: new Date().toISOString() } as any)
      .eq("branch_id", branch_id);

    return new Response(
      JSON.stringify({ ok: true, operating_mode, terminals: mpData.terminals }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

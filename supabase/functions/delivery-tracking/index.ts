import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Delivery Tracking edge function — cadete GPS tracking via QR scan.
 * No auth required (token-based access).
 *
 * GET  ?token=<uuid>  — Returns tracking info for cadete display
 * POST { token, lat, lng, action: 'start' | 'update' | 'complete' }
 */

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

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token || !uuidRe.test(token))
        return json(400, { error: "Token inválido" });

      const { data: tracking, error } = await supabase
        .from("delivery_tracking")
        .select("*")
        .eq("tracking_token", token)
        .single();

      if (error || !tracking)
        return json(404, { error: "Tracking no encontrado" });

      const { data: pedido } = await supabase
        .from("pedidos")
        .select(
          "order_number, cliente_nombre, cliente_direccion, cliente_telefono, estado, branch_id",
        )
        .eq("id", tracking.pedido_id)
        .single();

      const { data: branch } = await supabase
        .from("branches")
        .select("name, address")
        .eq("id", pedido?.branch_id)
        .single();

      return json(200, {
        tracking_token: tracking.tracking_token,
        pedido: {
          numero_pedido: pedido?.order_number,
          cliente_nombre: pedido?.cliente_nombre,
          cliente_direccion: pedido?.cliente_direccion,
          cliente_telefono: pedido?.cliente_telefono,
          estado: pedido?.estado,
        },
        branch: {
          name: branch?.name,
          address: branch?.address,
        },
        store_lat: tracking.store_lat,
        store_lng: tracking.store_lng,
        dest_lat: tracking.dest_lat,
        dest_lng: tracking.dest_lng,
        tracking_started: !!tracking.tracking_started_at,
        tracking_completed: !!tracking.tracking_completed_at,
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { token, lat, lng, action } = body;

      if (!token || !uuidRe.test(token))
        return json(400, { error: "Token inválido" });

      if (!action || !["start", "update", "complete"].includes(action))
        return json(400, { error: "action debe ser start, update o complete" });

      // Verify tracking exists
      const { data: tracking, error: fetchErr } = await supabase
        .from("delivery_tracking")
        .select("id, pedido_id, tracking_completed_at")
        .eq("tracking_token", token)
        .single();

      if (fetchErr || !tracking)
        return json(404, { error: "Tracking no encontrado" });

      if (tracking.tracking_completed_at)
        return json(400, { error: "Este envío ya fue completado" });

      const now = new Date().toISOString();

      if (action === "start") {
        const { error: updateErr } = await supabase
          .from("delivery_tracking")
          .update({
            tracking_started_at: now,
            cadete_lat: lat ?? null,
            cadete_lng: lng ?? null,
            updated_at: now,
          })
          .eq("id", tracking.id);

        if (updateErr) return json(500, { error: "Error al iniciar rastreo" });

        await supabase
          .from("pedidos")
          .update({
            estado: "en_camino",
            tiempo_en_camino: now,
          } as any)
          .eq("id", tracking.pedido_id);

        return json(200, { ok: true, action: "started" });
      }

      if (action === "update") {
        if (lat == null || lng == null)
          return json(400, { error: "lat y lng son requeridos" });

        const { error: updateErr } = await supabase
          .from("delivery_tracking")
          .update({
            cadete_lat: lat,
            cadete_lng: lng,
            updated_at: now,
          })
          .eq("id", tracking.id);

        if (updateErr)
          return json(500, { error: "Error al actualizar posición" });
        return json(200, { ok: true, action: "updated" });
      }

      if (action === "complete") {
        const { error: updateErr } = await supabase
          .from("delivery_tracking")
          .update({
            tracking_completed_at: now,
            cadete_lat: lat ?? null,
            cadete_lng: lng ?? null,
            updated_at: now,
          })
          .eq("id", tracking.id);

        if (updateErr)
          return json(500, { error: "Error al completar envío" });

        await supabase
          .from("pedidos")
          .update({
            estado: "entregado",
            tiempo_entregado: now,
          } as any)
          .eq("id", tracking.pedido_id);

        return json(200, { ok: true, action: "completed" });
      }
    }

    return json(405, { error: "Método no soportado" });
  } catch (err: unknown) {
    console.error("delivery-tracking error:", err);
    return json(500, { error: "Error interno" });
  }
});

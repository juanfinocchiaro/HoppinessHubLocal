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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const trackingCode = url.searchParams.get("code");

    if (!trackingCode) return json(400, { error: "code es requerido" });

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(trackingCode))
      return json(400, { error: "Formato de código inválido" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch order (non-sensitive fields only)
    const { data: pedido, error: pedErr } = await supabase
      .from("orders")
      .select(
        `id, order_number, status, type, service_type,
         subtotal, delivery_cost, descuento, total,
         promised_time, prep_started_at_time, ready_at_time, delivered_at_time,
         confirmed_at_time, on_route_at_time,
         pago_estado, created_at, customer_name,
         branch_id`,
      )
      .eq("webapp_tracking_code", trackingCode)
      .maybeSingle();

    if (pedErr || !pedido)
      return json(404, { error: "Pedido no encontrado" });

    // Fetch items + modifiers
    const { data: items } = await supabase
      .from("order_items")
      .select(
        `id, name, quantity, unit_price, subtotal, notes,
         order_item_modifiers(type, description, extra_price)`,
      )
      .eq("pedido_id", pedido.id)
      .order("created_at", { ascending: true });

    // Fetch branch public info
    const { data: branch } = await supabase
      .from("branches")
      .select("name, address, city, phone")
      .eq("id", pedido.branch_id)
      .single();

    // Build timeline
    const estado = pedido.status;
    const timeline: Array<{ estado: string; timestamp: string | null }> = [
      { estado: "pendiente", timestamp: pedido.created_at },
    ];

    const pastConfirmado = estado !== "pendiente" && estado !== "cancelado";
    if (pastConfirmado) {
      timeline.push({
        estado: "confirmado",
        timestamp: pedido.confirmed_at_time ?? pedido.prep_started_at_time ?? null,
      });
    }

    const pastPrep = ["en_preparacion", "listo", "en_camino", "entregado"].includes(estado);
    if (pastPrep) {
      timeline.push({
        estado: "en_preparacion",
        timestamp: pedido.prep_started_at_time,
      });
    }

    const pastListo = ["listo", "en_camino", "entregado"].includes(estado);
    if (pastListo) {
      timeline.push({ estado: "listo", timestamp: pedido.ready_at_time });
    }

    const pastEnCamino = ["en_camino", "entregado"].includes(estado);
    if (pastEnCamino && pedido.service_type === "delivery") {
      timeline.push({
        estado: "en_camino",
        timestamp: pedido.on_route_at_time ?? null,
      });
    }

    if (estado === "entregado") {
      timeline.push({
        estado: "entregado",
        timestamp: pedido.delivered_at_time,
      });
    }

    if (estado === "cancelado") {
      timeline.push({ estado: "cancelado", timestamp: null });
    }

    // Delivery tracking (cadete GPS)
    let deliveryTracking = null;
    if (pedido.service_type === "delivery") {
      const { data: dt } = await supabase
        .from("delivery_tracking")
        .select(
          "cadete_lat, cadete_lng, store_lat, store_lng, dest_lat, dest_lng, tracking_started_at, tracking_completed_at",
        )
        .eq("pedido_id", pedido.id)
        .maybeSingle();

      if (dt) {
        deliveryTracking = {
          active: !!dt.tracking_started_at && !dt.tracking_completed_at,
          cadete_lat: dt.cadete_lat,
          cadete_lng: dt.cadete_lng,
          store_lat: dt.store_lat,
          store_lng: dt.store_lng,
          dest_lat: dt.dest_lat,
          dest_lng: dt.dest_lng,
          completed: !!dt.tracking_completed_at,
        };
      }
    }

    return json(200, {
      pedido: {
        id: pedido.id,
        numero_pedido: pedido.order_number,
        estado: pedido.status,
        tipo_servicio: pedido.service_type,
        subtotal: pedido.subtotal,
        costo_delivery: pedido.delivery_cost,
        descuento: pedido.descuento,
        total: pedido.total,
        pago_estado: pedido.pago_estado,
        tiempo_prometido: pedido.promised_time,
        created_at: pedido.created_at,
        cliente_nombre: pedido.customer_name,
      },
      items: (items ?? []).map((it: any) => ({
        nombre: it.name,
        cantidad: it.quantity,
        precio_unitario: it.unit_price,
        subtotal: it.subtotal,
        notas: it.notes,
        modificadores: (it.order_item_modifiers ?? []).map((m: any) => ({
          tipo: m.type,
          descripcion: m.description,
          precio_extra: m.extra_price,
        })),
      })),
      branch: branch ?? null,
      timeline,
      delivery_tracking: deliveryTracking,
    });
  } catch (err: unknown) {
    console.error("webapp-order-tracking error:", err);
    return json(500, { error: "Error interno" });
  }
});

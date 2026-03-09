import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Public edge function — creates a webapp order (guest checkout, no auth).
 *
 * Flow:
 *  1. Validate input
 *  2. Verify branch + webapp_config (open, service type enabled)
 *  3. Generate numero_pedido via RPC
 *  4. Insert pedido → pedido_items → pedido_item_modificadores
 *  5. Return { pedido_id, tracking_code, numero_pedido }
 */

interface OrderItemInput {
  item_carta_id: string;
  articulo_id?: string;
  articulo_tipo?: "base" | "promo";
  promocion_id?: string | null;
  promocion_item_id?: string | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  notas?: string | null;
  extras?: Array<{ nombre: string; precio: number; cantidad?: number }>;
  incluidos?: Array<{ nombre: string; cantidad?: number }>;
  removidos?: string[];
}

interface CreateWebappOrderBody {
  branch_id: string;
  tipo_servicio: "retiro" | "delivery" | "comer_aca";
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string | null;
  cliente_direccion?: string | null;
  cliente_piso?: string | null;
  cliente_referencia?: string | null;
  cliente_notas?: string | null;
  metodo_pago: "mercadopago" | "efectivo";
  delivery_zone_id?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_cost_calculated?: number | null;
  delivery_distance_km?: number | null;
  items: OrderItemInput[];
}

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
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: CreateWebappOrderBody = await req.json();

    // ── Extract authenticated user (if any) ─────────────────────
    let clienteUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        clienteUserId = user.id;

        // Auto-fill from profile if not provided
        if (!body.cliente_nombre?.trim() || !body.cliente_telefono?.trim()) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .single();

          if (profile) {
            if (!body.cliente_nombre?.trim()) body.cliente_nombre = profile.full_name || "";
            if (!body.cliente_telefono?.trim()) body.cliente_telefono = profile.phone || "";
          }
        }
      }
    }

    // ── Validation ──────────────────────────────────────────────
    if (!body.branch_id) return json(400, { error: "branch_id es requerido" });
    if (!body.cliente_nombre?.trim())
      return json(400, { error: "cliente_nombre es requerido" });
    if (!body.cliente_telefono?.trim())
      return json(400, { error: "cliente_telefono es requerido" });
    if (!Array.isArray(body.items) || body.items.length === 0)
      return json(400, { error: "Se requiere al menos un item" });
    if (
      body.tipo_servicio === "delivery" &&
      !body.cliente_direccion?.trim()
    )
      return json(400, { error: "La dirección es requerida para delivery" });
    if (body.tipo_servicio === "comer_aca")
      return json(400, { error: "Comer acá no disponible por web" });

    // ── Verify branch & webapp config ───────────────────────────
    const { data: config, error: cfgErr } = await supabase
      .from("webapp_config")
      .select("*")
      .eq("branch_id", body.branch_id)
      .single();

    if (cfgErr || !config)
      return json(400, { error: "Local no encontrado o webapp no configurada" });

    if (!config.webapp_activa)
      return json(400, { error: "La webapp de este local no está activa" });

    if (config.estado !== "abierto")
      return json(400, {
        error: config.mensaje_pausa || "El local no está recibiendo pedidos en este momento",
      });

    if (body.tipo_servicio === "delivery" && !config.delivery_habilitado)
      return json(400, { error: "Delivery no disponible en este local" });
    if (body.tipo_servicio === "retiro" && !config.retiro_habilitado)
      return json(400, { error: "Retiro no disponible en este local" });

    // ── Resolve item prices & station server-side ───────────────
    const itemIds = body.items.map((i) => i.item_carta_id);
    const { data: cartaItems, error: itemsErr } = await supabase
      .from("items_carta")
      .select("id, nombre, precio_base, categoria_carta_id, kitchen_station_id, disponible_webapp, kitchen_stations(name)")
      .in("id", itemIds);

    if (itemsErr)
      return json(500, { error: "Error al verificar productos" });

    const cartaMap = new Map(
      (cartaItems ?? []).map((ci: any) => [ci.id, ci]),
    );

    // Fetch active promo prices for these items
    const { data: promoItems } = await supabase
      .from("promocion_items")
      .select("id, item_carta_id, precio_promo, promocion_id, promociones!inner(activa, canales, fecha_inicio, fecha_fin)")
      .in("item_carta_id", itemIds);

    const promoMap = new Map<string, number>();
    const promoItemMap = new Map<string, { id: string; item_carta_id: string; precio_promo: number; promocion_id: string }>();
    for (const pi of promoItems ?? []) {
      const promo = (pi as any).promociones;
      if (!promo?.activa) continue;
      const canales: string[] = promo.canales ?? [];
      if (canales.length > 0 && !canales.includes("webapp")) continue;
      const now = new Date().toISOString().slice(0, 10);
      if (promo.fecha_inicio && now < promo.fecha_inicio) continue;
      if (promo.fecha_fin && now > promo.fecha_fin) continue;
      promoItemMap.set(pi.id, {
        id: pi.id,
        item_carta_id: pi.item_carta_id,
        precio_promo: Number(pi.precio_promo),
        promocion_id: pi.promocion_id,
      });
      const existing = promoMap.get(pi.item_carta_id);
      if (existing == null || pi.precio_promo < existing) {
        promoMap.set(pi.item_carta_id, pi.precio_promo);
      }
    }

    // Validate all items exist and are webapp-enabled
    for (const item of body.items) {
      const ci = cartaMap.get(item.item_carta_id);
      if (!ci)
        return json(400, { error: `Producto no encontrado: ${item.nombre}` });
      if (ci.disponible_webapp === false)
        return json(400, { error: `"${ci.nombre}" no está disponible para pedidos online` });
    }

    // ── Calculate totals server-side (using server prices) ─────
    let subtotal = 0;
    for (const item of body.items) {
      const ci = cartaMap.get(item.item_carta_id)!;
      let serverPrice = ci.precio_base;
      if (item.promocion_item_id) {
        const promoItem = promoItemMap.get(item.promocion_item_id);
        if (!promoItem || promoItem.item_carta_id !== item.item_carta_id) {
          return json(400, { error: `Promoción inválida para "${item.nombre}"` });
        }
        serverPrice = promoItem.precio_promo;
      } else if (item.articulo_tipo === "promo") {
        return json(400, { error: `Falta referencia de promoción para "${item.nombre}"` });
      } else {
        // Legacy compatibility: old clients without promo metadata still get best active promo.
        serverPrice = promoMap.get(item.item_carta_id) ?? ci.precio_base;
      }
      const extrasTotal = (item.extras ?? []).reduce((s, e) => s + e.precio * (e.cantidad ?? 1), 0);
      subtotal += (serverPrice + extrasTotal) * item.cantidad;
    }

    // ── Resolve delivery cost ──────────────────────────────────
    let costoDelivery = 0;
    let deliveryZoneId: string | null = null;
    let tiempoEstimadoZona: number | null = null;

    if (body.tipo_servicio === "delivery") {
      if (body.delivery_lat != null && body.delivery_lng != null) {
        // Re-calculate delivery cost server-side (never trust client value)
        const { data: calcResult, error: calcErr } = await supabase.functions.invoke(
          "calculate-delivery",
          { body: { branch_id: body.branch_id, lat: body.delivery_lat, lng: body.delivery_lng } },
        );
        if (!calcErr && calcResult?.available && calcResult?.cost != null) {
          costoDelivery = calcResult.cost;
        } else if (body.delivery_cost_calculated != null) {
          costoDelivery = body.delivery_cost_calculated;
        }
      } else if (body.delivery_zone_id) {
        // Legacy zone-based pricing
        const { data: zone, error: zoneErr } = await supabase
          .from("delivery_zones")
          .select("id, costo_envio, pedido_minimo, tiempo_estimado_min, is_active")
          .eq("id", body.delivery_zone_id)
          .eq("branch_id", body.branch_id)
          .single();

        if (zoneErr || !zone)
          return json(400, { error: "Zona de delivery no encontrada" });
        if (!zone.is_active)
          return json(400, { error: "Esta zona de delivery no está disponible" });

        costoDelivery = zone.costo_envio ?? 0;
        deliveryZoneId = zone.id;
        tiempoEstimadoZona = zone.tiempo_estimado_min;

        if (zone.pedido_minimo && subtotal < zone.pedido_minimo) {
          return json(400, {
            error: `El pedido mínimo para esta zona es $${zone.pedido_minimo}`,
          });
        }
      } else {
        costoDelivery = config.delivery_costo ?? 0;

        if (
          config.delivery_pedido_minimo &&
          subtotal < config.delivery_pedido_minimo
        ) {
          return json(400, {
            error: `El pedido mínimo para delivery es $${config.delivery_pedido_minimo}`,
          });
        }
      }
    }

    const total = subtotal + costoDelivery;

    // ── Generate order_number ──────────────────────────────────
    const { data: numeroPedido, error: numErr } = await supabase.rpc(
      "generate_order_number",
      { p_branch_id: body.branch_id },
    );
    if (numErr)
      return json(500, { error: "Error al generar número de pedido" });

    // ── Determine auto-accept ───────────────────────────────────
    const autoAccept = config.auto_accept_orders === true ||
      config.recepcion_modo === "auto";

    // Orders with MercadoPago start in pendiente_pago (invisible to kitchen)
    // until webhook confirms payment. Cash orders go straight to kitchen.
    const isMpPayment = body.metodo_pago === "mercadopago";

    // ── Estimated time (dynamic, queue-aware) ──────────────────
    let tiempoEstimado: number | null = null;
    if (body.tipo_servicio === "comer_aca") {
      tiempoEstimado = config.prep_time_comer_aca ?? 15;
    } else {
      const tipoServ = body.tipo_servicio === "delivery" ? "delivery" : "retiro";
      const { data: dynamicData } = await supabase.rpc("get_dynamic_prep_time", {
        p_branch_id: body.branch_id,
        p_tipo_servicio: tipoServ,
      });
      const dynamicRow = Array.isArray(dynamicData) && dynamicData[0] ? dynamicData[0] : null;
      if (dynamicRow) {
        tiempoEstimado = tiempoEstimadoZona ?? dynamicRow.prep_time_min;
      } else if (body.tipo_servicio === "delivery") {
        tiempoEstimado = tiempoEstimadoZona ?? config.prep_time_delivery ?? config.tiempo_estimado_delivery_min ?? 40;
      } else {
        tiempoEstimado = config.prep_time_retiro ?? config.tiempo_estimado_retiro_min ?? 15;
      }
    }

    // ── Insert pedido ───────────────────────────────────────────
    const pedidoId = crypto.randomUUID();
    const trackingCode = crypto.randomUUID();
    const now = new Date().toISOString();

    const pagoEstado =
      body.metodo_pago === "mercadopago" ? "pendiente" : "pendiente_entrega";

    const estadoInicial = isMpPayment
      ? "pendiente_pago"
      : autoAccept
        ? "en_preparacion"
        : "pendiente";

    const { error: pedidoErr } = await supabase.from("pedidos").insert({
      id: pedidoId,
      branch_id: body.branch_id,
      order_number: numeroPedido as number,
      tipo: "webapp",
      estado: estadoInicial,
      canal_venta: "webapp",
      tipo_servicio: body.tipo_servicio === "retiro" ? "takeaway" : body.tipo_servicio,
      subtotal,
      descuento: 0,
      total,
      propina: 0,
      costo_delivery: costoDelivery,
      pago_estado: pagoEstado,
      cliente_nombre: body.cliente_nombre.trim(),
      cliente_telefono: body.cliente_telefono.trim(),
      cliente_email: body.cliente_email ?? null,
      cliente_direccion: body.cliente_direccion ?? null,
      direccion_entrega: body.cliente_direccion ?? null,
      cliente_notas: body.cliente_notas ?? null,
      delivery_zone_id: deliveryZoneId,
      delivery_lat: body.delivery_lat ?? null,
      delivery_lng: body.delivery_lng ?? null,
      delivery_distance_km: body.delivery_distance_km ?? null,
      webapp_tracking_code: trackingCode,
      tiempo_prometido: tiempoEstimado
        ? new Date(Date.now() + tiempoEstimado * 60_000).toISOString()
        : null,
      tiempo_inicio_prep: !isMpPayment && autoAccept ? now : null,
      origen: "webapp",
      cliente_user_id: clienteUserId,
    } as any);

    if (pedidoErr) {
      console.error("Pedido insert error:", pedidoErr);
      return json(500, { error: "Error al crear el pedido" });
    }

    // ── Insert pedido_items ─────────────────────────────────────
    for (const item of body.items) {
      const ci = cartaMap.get(item.item_carta_id)!;
      let serverPrice = ci.precio_base;
      if (item.promocion_item_id) {
        serverPrice = promoItemMap.get(item.promocion_item_id)?.precio_promo ?? ci.precio_base;
      } else if (item.articulo_tipo !== "promo") {
        serverPrice = promoMap.get(item.item_carta_id) ?? ci.precio_base;
      }
      const stationName =
        (ci.kitchen_stations as any)?.name ?? "armado";
      const extrasTotal = (item.extras ?? []).reduce(
        (s: number, e: { precio: number; cantidad?: number }) => s + e.precio * (e.cantidad ?? 1),
        0,
      );
      const lineSubtotal = (serverPrice + extrasTotal) * item.cantidad;

      const { data: insertedItem, error: itemErr } = await supabase
        .from("pedido_items")
        .insert({
          pedido_id: pedidoId,
          item_carta_id: item.item_carta_id,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: serverPrice,
          subtotal: lineSubtotal,
          estacion: stationName,
          notas: item.notas ?? null,
          categoria_carta_id: ci.categoria_carta_id ?? null,
          articulo_id: item.articulo_id ?? item.item_carta_id,
          articulo_tipo: item.articulo_tipo ?? (item.promocion_item_id ? "promo" : "base"),
          promocion_id: item.promocion_id ?? null,
          promocion_item_id: item.promocion_item_id ?? null,
        } as any)
        .select("id")
        .single();

      if (itemErr) {
        console.error("Item insert error:", itemErr);
        await supabase.from("pedidos").delete().eq("id", pedidoId);
        return json(500, { error: "Error al crear los items del pedido" });
      }

      // Insert modifiers (extras + removidos)
      const modifiers: Array<{
        pedido_item_id: string;
        tipo: string;
        descripcion: string;
        precio_extra: number | null;
      }> = [];

      for (const extra of item.extras ?? []) {
        const qty = Math.max(1, extra.cantidad ?? 1);
        for (let ei = 0; ei < qty; ei++) {
          modifiers.push({
            pedido_item_id: insertedItem!.id,
            tipo: "extra",
            descripcion: extra.nombre,
            precio_extra: extra.precio,
          });
        }
      }
      for (const inc of item.incluidos ?? []) {
        const qty = Math.max(1, Number(inc.cantidad ?? 1));
        modifiers.push({
          pedido_item_id: insertedItem!.id,
          tipo: "incluido",
          descripcion: qty > 1 ? `${qty}x ${inc.nombre}` : inc.nombre,
          precio_extra: null,
        });
      }
      for (const rem of item.removidos ?? []) {
        modifiers.push({
          pedido_item_id: insertedItem!.id,
          tipo: "sin",
          descripcion: rem,
          precio_extra: null,
        });
      }

      if (modifiers.length > 0) {
        const { error: modErr } = await supabase
          .from("pedido_item_modificadores")
          .insert(modifiers as any);
        if (modErr) {
          console.error("Modifier insert error:", modErr);
          await supabase.from("pedidos").delete().eq("id", pedidoId);
          return json(500, { error: "Error al guardar modificadores del pedido" });
        }
      }
    }

    return json(200, {
      pedido_id: pedidoId,
      tracking_code: trackingCode,
      order_number: numeroPedido,
      estado: estadoInicial,
      tiempo_estimado_min: tiempoEstimado,
    });
  } catch (err: unknown) {
    console.error("create-webapp-order error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: "Error interno", details: message });
  }
});

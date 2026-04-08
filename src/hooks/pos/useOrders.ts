/**
 * useOrders - CRUD de pedidos
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { OrderConfig } from "@/types/pos";
import {
  fetchOrders,
  generateOrderNumber,
  getAuthUser,
  insertPedido,
  insertPedidoItems,
  insertPedidoPagos,
  saveClienteAddress,
  findOpenCashShift,
  insertCashMovement,
} from "@/services/posService";
import { normalizePhone } from "@/lib/normalizePhone";

export interface PedidoItemInput {
  item_carta_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
  estacion?: string;
  reference_price?: number;
  categoria_carta_id?: string | null;
  promo_descuento?: number;
}

export interface PaymentLineInput {
  method: string;
  amount: number;
  montoRecibido?: number;
}

export interface CreatePedidoParams {
  items: PedidoItemInput[];
  tipo?: "mostrador" | "delivery" | "webapp";
  descuento?: number;
  metodoPago?: string;
  montoRecibido?: number;
  payments?: PaymentLineInput[];
  propina?: number;
  orderConfig?: OrderConfig;
  estadoInicial?: "pendiente" | "pendiente_pago";
}

export function useOrders(branchId: string) {
  return useQuery({
    queryKey: ["pos-orders", branchId],
    queryFn: () => fetchOrders(branchId),
    enabled: !!branchId,
  });
}

function resolveTipo(orderConfig?: OrderConfig): "mostrador" | "delivery" | "webapp" {
  if (!orderConfig) return "mostrador";
  if (orderConfig.canalVenta === "apps") return "webapp";
  if (orderConfig.tipoServicio === "delivery") return "delivery";
  return "mostrador";
}

export function useCreatePedido(branchId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreatePedidoParams) => {
      const user = await getAuthUser();
      if (!user) throw new Error("No autenticado");

      const numeroPedido = await generateOrderNumber(branchId);

      const subtotal = params.items.reduce((s, i) => s + i.subtotal, 0);
      const promoDesc = params.items.reduce((s, i) => s + (i.promo_descuento ?? 0) * i.quantity, 0);
      const descuentoPlat = params.orderConfig?.descuentoPlataforma ?? 0;
      const descuentoRestRaw = params.orderConfig?.descuentoRestaurante ?? 0;
      const descuentoRest =
        params.orderConfig?.descuentoModo === "porcentaje"
          ? Math.round((subtotal * descuentoRestRaw) / 100)
          : descuentoRestRaw;
      const descuento = params.descuento ?? descuentoPlat + descuentoRest + promoDesc;
      const costoDelivery = params.orderConfig?.costoDelivery ?? 0;
      const totalOrder = subtotal - descuento + costoDelivery;
      const propina = params.propina ?? 0;
      const totalToPay = totalOrder + propina;

      const cfg = params.orderConfig;
      const tipo = resolveTipo(cfg);

      const insertPayload: Record<string, unknown> = {
        branch_id: branchId,
        order_number: numeroPedido,
        type: tipo,
        status: params.estadoInicial ?? "pendiente",
        subtotal,
        descuento,
        total: totalOrder,
        propina,
        created_by: user.id,
      };

      if (costoDelivery > 0) insertPayload.costo_delivery = costoDelivery;

      const descuentoPlataforma = cfg?.descuentoPlataforma ?? 0;
      const descuentoRestaurante =
        cfg?.descuentoModo === "porcentaje"
          ? Math.round((subtotal * (cfg?.descuentoRestaurante ?? 0)) / 100)
          : (cfg?.descuentoRestaurante ?? 0);
      if (descuentoPlataforma > 0) insertPayload.descuento_plataforma = descuentoPlataforma;
      if (descuentoRestaurante > 0) insertPayload.descuento_restaurante = descuentoRestaurante;

      if (cfg) {
        if (cfg.numeroLlamador) insertPayload.caller_number = parseInt(cfg.numeroLlamador, 10);
        if (cfg.customerName) insertPayload.customer_name = cfg.customerName;
        if (cfg.customerPhone) {
          const normalized = normalizePhone(cfg.customerPhone);
          insertPayload.customer_phone = normalized || cfg.customerPhone;
        }
        if (cfg.customerAddress) insertPayload.customer_address = cfg.customerAddress;
        if (cfg.clienteUserId) insertPayload.cliente_user_id = cfg.clienteUserId;
        insertPayload.canal_venta = cfg.canalVenta;
        insertPayload.service_type = cfg.tipoServicio;
        if (cfg.canalVenta === "apps") {
          insertPayload.canal_app = cfg.canalApp;
          //if (cfg.referenciaApp) insertPayload.referencia_app = cfg.referenciaApp;
        }
      }

      const pedido = await insertPedido(insertPayload);

      if (cfg?.tipoServicio === "delivery" && cfg.clienteUserId && cfg.customerAddress?.trim()) {
        saveClienteAddress(cfg.clienteUserId, cfg.customerAddress).catch(() => {});
      }

      const itemRows = params.items.map((it) => ({
        pedido_id: pedido.id,
        item_carta_id: it.item_carta_id,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.subtotal,
        notes: it.notes ?? null,
        estacion: it.estacion ?? "armado",
        reference_price: it.reference_price ?? null,
        categoria_carta_id: it.categoria_carta_id ?? null,
      }));
      await insertPedidoItems(itemRows);

      const isAppsOrder = cfg?.canalVenta === "apps";
      const isPendientePago = params.estadoInicial === "pendiente_pago";
      const useSplit = params.payments && params.payments.length > 0;
      if (!isPendientePago && !isAppsOrder && !useSplit && !params.metodoPago) {
        throw new Error("Se requiere un método de pago");
      }
      const paymentRows =
        isPendientePago || isAppsOrder
          ? []
          : useSplit
            ? params.payments!
            : [{ method: params.metodoPago!, amount: totalToPay, montoRecibido: params.montoRecibido ?? totalToPay }];

      if (paymentRows.length > 0) {
        const pagoRows = paymentRows.map((row) => {
          const montoRecibido = row.montoRecibido ?? row.amount;
          return {
            pedido_id: pedido.id,
            method: row.method,
            amount: row.amount,
            received_amount: montoRecibido,
            vuelto: montoRecibido - row.amount,
            created_by: user.id,
          };
        });
        await insertPedidoPagos(pagoRows);
      }

      const openShift = await findOpenCashShift(branchId);
      for (const row of paymentRows) {
        const isCash = String(row.method).toLowerCase() === "cash";
        if (isCash && row.amount > 0 && openShift) {
          const { error: errMov } = await insertCashMovement({
            shift_id: openShift.id,
            branch_id: branchId,
            type: "income",
            payment_method: row.method,
            amount: row.amount,
            concept: `Venta pedido #${numeroPedido}`,
            order_id: pedido.id,
            recorded_by: user.id,
          });
          if (errMov) {
            console.error("Error registrando movimiento de caja:", errMov);
            toast.warning("Pedido creado pero no se registró en caja. Ajustá manualmente.");
          }
        }
      }

      return pedido;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["kitchen-pedidos", branchId] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      qc.invalidateQueries({ queryKey: ["kitchen-pedidos", branchId] });
    },
  });
}

/**
 * ClosureHelpManual - Complete step-by-step guide for shift closure
 */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export function ClosureHelpManual() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <BookOpen className="w-4 h-4" />
          Manual de Cierre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Manual de Cierre de Turno
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)] px-6 pb-6">
          <div className="space-y-6 text-sm">
            {/* Paso 1 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  1
                </span>
                Obtener datos de Núcleo
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-8">
                <li>Ingresá a Núcleo con tu usuario</li>
                <li>
                  Andá a{' '}
                  <strong className="text-foreground">Estadísticas → Pedidos por productos</strong>
                </li>
                <li>
                  Filtrá por el{' '}
                  <strong className="text-foreground">turno que estás cerrando</strong>
                </li>
                <li>
                  Filtrá el canal de venta que corresponda:
                  <ul className="list-disc ml-6 mt-1 space-y-1">
                    <li>
                      <strong className="text-foreground">Mostrador, TAKE AWAY</strong>
                    </li>
                    <li>
                      <strong className="text-foreground">Mostrador, SALON</strong>
                    </li>
                    <li>
                      <strong className="text-foreground">MOSTRADOR, Delivery Manual</strong>
                    </li>
                  </ul>
                </li>
              </ol>
              <div className="ml-8 bg-muted p-3 rounded-lg mt-3">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Info className="w-4 h-4 text-blue-500" />
                  Tips importantes
                </p>
                <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                  <li>
                    • <strong className="text-foreground">Delivery Manual:</strong> Cuando un
                    cliente no pudo hacer su pedido por la WebApp y se carga manual.
                  </li>
                  <li>
                    • <strong className="text-foreground">Llamadores:</strong> Cargar como cliente
                    "LLAMADOR" con canal "MOSTRADOR, SALON". No usar SALON para números de
                    llamadores.
                  </li>
                  <li>
                    • Atendemos a todos los clientes en el{' '}
                    <strong className="text-foreground">mostrador</strong> (WhatsApp, presencial,
                    etc.), no en salón.
                  </li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* Paso 2 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  2
                </span>
                Cargar Ventas de Mostrador
              </h3>
              <ul className="space-y-2 text-muted-foreground ml-8">
                <li>
                  • Separá las ventas por canal:{' '}
                  <strong className="text-foreground">Salón, Takeaway, Delivery Manual</strong>
                </li>
                <li>• Para cada canal, ingresá el monto de cada forma de pago</li>
              </ul>
            </section>

            <Separator />

            {/* Paso 3 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  3
                </span>
                Comparar con el Posnet
              </h3>
              <ul className="space-y-2 text-muted-foreground ml-8">
                <li>
                  • Hacé el <strong className="text-foreground">cierre del Posnet</strong> (terminal
                  de tarjetas)
                </li>
                <li>• Ingresá el total que imprime el ticket</li>
                <li>• El sistema calcula si hay diferencia con lo de Núcleo</li>
              </ul>
              <div className="ml-8 bg-muted p-3 rounded-lg">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Info className="w-4 h-4 text-blue-500" />
                  Formas de pago que van al Posnet
                </p>
                <p className="text-muted-foreground mt-1">Débito + Crédito + QR MercadoPago</p>
              </div>
            </section>

            <Separator />

            {/* Paso 4 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  4
                </span>
                Cargar Ventas de Apps
              </h3>
              <div className="ml-8 overflow-x-auto">
                <table className="w-full text-left text-muted-foreground">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-4 font-medium text-foreground">App</th>
                      <th className="py-2 pr-4 font-medium text-foreground">Integrada</th>
                      <th className="py-2 font-medium text-foreground">No Integrada</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">MásDelivery</td>
                      <td className="py-2 pr-4">Automático en Núcleo</td>
                      <td className="py-2">Canal "MásDelivery"</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Rappi</td>
                      <td className="py-2 pr-4">Núcleo muestra "Rappi"</td>
                      <td className="py-2">
                        Forma de pago <strong className="text-foreground">"Vales"</strong>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">PedidosYa</td>
                      <td className="py-2 pr-4">Núcleo muestra "PedidosYa"</td>
                      <td className="py-2">
                        <strong className="text-foreground">"Vales"</strong> +{' '}
                        <strong className="text-foreground">"Efectivo"</strong> (va a caja)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">MP Delivery</td>
                      <td className="py-2 pr-4">Núcleo muestra "MP Delivery"</td>
                      <td className="py-2">
                        Forma de pago <strong className="text-foreground">"Vales"</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <Separator />

            {/* Paso 5 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  5
                </span>
                Verificar ventas por App
              </h3>
              <p className="text-muted-foreground ml-8">
                Cargá los datos de Núcleo y comparalos con el panel de cada app:
              </p>
              <ul className="space-y-2 ml-8 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Más Delivery:</strong>
                  <br />
                  <a
                    href="https://admin.masdelivery.com/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    admin.masdelivery.com
                  </a>{' '}
                  → Reportes → Ventas → Filtrá el turno (solo pedidos aceptados)
                </li>
                <li>
                  <strong className="text-foreground">Rappi:</strong>
                  <br />
                  Portal Aliados → Historial de pedidos
                </li>
                <li>
                  <strong className="text-foreground">PedidosYa:</strong>
                  <br />
                  App Go, o WebApp PedidosYa → Historial de pedidos
                </li>
                <li>
                  <strong className="text-foreground">MP Delivery:</strong>
                  <br />
                  MercadoPago → Actividad → Filtrar delivery
                </li>
              </ul>
            </section>

            <Separator />

            {/* Paso 6 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  6
                </span>
                Cargar Arqueo de Caja
              </h3>
              <ul className="space-y-2 text-muted-foreground ml-8">
                <li>
                  • En Núcleo, hacé el <strong className="text-foreground">cierre de caja</strong>
                </li>
                <li>• Si te da diferencia, ingresá el monto</li>
                <li>
                  • <strong className="text-foreground">Negativo si falta</strong> (ej: -500)
                </li>
                <li>
                  • <strong className="text-foreground">Positivo si sobra</strong> (ej: +200)
                </li>
              </ul>
            </section>

            <Separator />

            {/* Paso 7 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  7
                </span>
                Cargar Facturación
              </h3>
              <ul className="space-y-2 text-muted-foreground ml-8">
                <li>
                  • Ingresá el <strong className="text-foreground">total facturado</strong> del
                  turno
                </li>
                <li>• El sistema valida contra lo esperado</li>
              </ul>
            </section>

            <Separator />

            {/* Paso 8 */}
            <section className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  8
                </span>
                Revisar y Guardar
              </h3>
              <ul className="space-y-2 ml-8">
                <li className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Verificá que no haya alertas rojas
                </li>
                <li className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                  Si hay diferencias, revisá los datos antes de guardar
                </li>
                <li className="text-muted-foreground">• Agregá notas si hubo algún incidente</li>
              </ul>
            </section>

            <Separator />

            {/* Leyenda */}
            <section className="space-y-3 bg-muted p-4 rounded-lg">
              <h3 className="font-semibold text-base">Indicadores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-muted-foreground">Sin diferencia</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-muted-foreground">Diferencia detectada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-muted-foreground/20" />
                  <span className="text-muted-foreground">Sin datos</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Política:</strong> Cualquier diferencia distinta de $0 genera alerta
                (tolerancia cero).
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

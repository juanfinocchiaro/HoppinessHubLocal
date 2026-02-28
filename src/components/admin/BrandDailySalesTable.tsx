/**
 * BrandDailySalesTable - Tabla consolidada de ventas diarias usando shift_closures
 */
import { useQuery } from '@tanstack/react-query';
import { fetchBranchesIdName, fetchBrandClosures } from '@/services/adminService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon,
  AlertTriangle,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/formatters';
type DateRange = {
  from: Date;
  to: Date;
};

interface BranchSalesData {
  branchId: string;
  branchName: string;
  vendido: number;
  efectivo: number;
  digital: number;
  hamburguesas: number;
  clasicas: number;
  originales: number;
  mas_sabor: number;
  veggies: number;
  ultrasmash: number;
  extras: number;
  closures: any[];
  hasAlert: boolean;
}

export function BrandDailySalesTable() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      from: startOfWeek(today, { weekStartsOn: 1 }),
      to: endOfWeek(today, { weekStartsOn: 1 }),
    };
  });

  const presets = useMemo(() => {
    const today = new Date();
    return [
      { label: 'Hoy', from: today, to: today },
      {
        label: 'Esta semana',
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      },
      { label: 'Este mes', from: startOfMonth(today), to: endOfMonth(today) },
      { label: 'Últimos 7 días', from: subDays(today, 6), to: today },
    ];
  }, []);

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches-all'],
    queryFn: fetchBranchesIdName,
  });

  // Fetch closures for current period
  const { data: closuresData, isLoading } = useQuery({
    queryKey: ['brand-closures', dateRange.from, dateRange.to],
    queryFn: () =>
      fetchBrandClosures(
        format(dateRange.from, 'yyyy-MM-dd'),
        format(dateRange.to, 'yyyy-MM-dd'),
      ),
    enabled: !!branches,
  });

  // Aggregate data by branch
  const aggregatedData = useMemo((): BranchSalesData[] => {
    if (!branches || !closuresData) return [];

    return branches
      .map((branch) => {
        const branchClosures = closuresData.filter((c) => c.branch_id === branch.id);

        const totals = branchClosures.reduce(
          (acc, c) => {
            const h = (c.hamburguesas as any) || {};
            return {
              vendido: acc.vendido + Number(c.total_vendido || 0),
              efectivo: acc.efectivo + Number(c.total_efectivo || 0),
              digital: acc.digital + Number(c.total_digital || 0),
              hamburguesas: acc.hamburguesas + Number(c.total_hamburguesas || 0),
              clasicas: acc.clasicas + (h.clasicas || 0),
              originales: acc.originales + (h.originales || 0),
              mas_sabor: acc.mas_sabor + (h.mas_sabor || 0),
              veggies:
                acc.veggies + ((h.veggies?.not_american || 0) + (h.veggies?.not_claudio || 0)),
              ultrasmash:
                acc.ultrasmash +
                ((h.ultrasmash?.ultra_cheese || 0) + (h.ultrasmash?.ultra_bacon || 0)),
              extras:
                acc.extras +
                ((h.extras?.extra_carne || 0) +
                  (h.extras?.extra_not_burger || 0) +
                  (h.extras?.extra_not_chicken || 0)),
              hasAlert: acc.hasAlert || c.tiene_alerta_facturacion,
            };
          },
          {
            vendido: 0,
            efectivo: 0,
            digital: 0,
            hamburguesas: 0,
            clasicas: 0,
            originales: 0,
            mas_sabor: 0,
            veggies: 0,
            ultrasmash: 0,
            extras: 0,
            hasAlert: false,
          },
        );

        return {
          branchId: branch.id,
          branchName: branch.name,
          ...totals,
          closures: branchClosures,
        };
      })
      .filter((b) => b.vendido > 0 || b.closures.length > 0)
      .sort((a, b) => b.vendido - a.vendido);
  }, [branches, closuresData]);

  // Calculate totals
  const totals = useMemo(() => {
    return aggregatedData.reduce(
      (acc, row) => ({
        vendido: acc.vendido + row.vendido,
        efectivo: acc.efectivo + row.efectivo,
        digital: acc.digital + row.digital,
        hamburguesas: acc.hamburguesas + row.hamburguesas,
        clasicas: acc.clasicas + row.clasicas,
        originales: acc.originales + row.originales,
        mas_sabor: acc.mas_sabor + row.mas_sabor,
        veggies: acc.veggies + row.veggies,
        ultrasmash: acc.ultrasmash + row.ultrasmash,
        extras: acc.extras + row.extras,
      }),
      {
        vendido: 0,
        efectivo: 0,
        digital: 0,
        hamburguesas: 0,
        clasicas: 0,
        originales: 0,
        mas_sabor: 0,
        veggies: 0,
        ultrasmash: 0,
        extras: 0,
      },
    );
  }, [aggregatedData]);

  

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Ventas por Sucursal</CardTitle>
            <CardDescription>Consolidado de cierres de turno</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={
                  format(dateRange.from, 'yyyy-MM-dd') === format(preset.from, 'yyyy-MM-dd') &&
                  format(dateRange.to, 'yyyy-MM-dd') === format(preset.to, 'yyyy-MM-dd')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setDateRange({ from: preset.from, to: preset.to })}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Rango
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={es}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Período: {format(dateRange.from, 'd MMM', { locale: es })} -{' '}
          {format(dateRange.to, 'd MMM yyyy', { locale: es })}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Efectivo</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Digital</TableHead>
                  <TableHead className="text-center">🍔</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Clás</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Orig</TableHead>
                  <TableHead className="text-center hidden md:table-cell">+Sab</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Veg</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Ultra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No hay cierres registrados en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {aggregatedData.map((row) => (
                      <TableRow key={row.branchId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {row.branchName}
                            {row.hasAlert && <AlertTriangle className="w-4 h-4 text-warning" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(row.vendido)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                          {formatCurrency(row.efectivo)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                          {formatCurrency(row.digital)}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {row.hamburguesas}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                          {row.clasicas}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                          {row.originales}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                          {row.mas_sabor}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground hidden lg:table-cell">
                          {row.veggies}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground hidden lg:table-cell">
                          {row.ultrasmash}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right text-primary text-lg">
                        {formatCurrency(totals.vendido)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {formatCurrency(totals.efectivo)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {formatCurrency(totals.digital)}
                      </TableCell>
                      <TableCell className="text-center">{totals.hamburguesas}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {totals.clasicas}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {totals.originales}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {totals.mas_sabor}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {totals.veggies}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {totals.ultrasmash}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

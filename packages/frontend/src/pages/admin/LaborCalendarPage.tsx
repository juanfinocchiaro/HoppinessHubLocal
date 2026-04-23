/**
 * LaborCalendarPage - Calendario laboral centralizado en Mi Marca
 *
 * Vista anual de feriados con:
 * - Grid de 12 meses
 * - Selector de año
 * - Importar feriados Argentina
 * - CRUD individual
 */
import { useState, useMemo } from 'react';
import {
  format,
  parse,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameMonth,
  isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CalendarDays,
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useHolidaysRange,
  useCreateHoliday,
  useDeleteHoliday,
  useCreateHolidaysBulk,
  getArgentinaHolidays,
} from '@/hooks/useHolidays';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { PageHelp } from '@/components/ui/PageHelp';

export default function LaborCalendarPage() {
  const { isSuperadmin, isCoordinador } = useDynamicPermissions();
  const canManage = isSuperadmin || isCoordinador;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Fetch holidays for the entire year
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
  const { data: holidays = [], isLoading } = useHolidaysRange(yearStart, yearEnd);

  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const createBulk = useCreateHolidaysBulk();

  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');

  // Group holidays by month
  const holidaysByMonth = useMemo(() => {
    const map = new Map<number, typeof holidays>();
    holidays.forEach((h) => {
      const date = parse(h.day_date, 'yyyy-MM-dd', new Date());
      const monthKey = date.getMonth();
      if (!map.has(monthKey)) {
        map.set(monthKey, []);
      }
      map.get(monthKey)!.push(h);
    });
    return map;
  }, [holidays]);

  // Get months of the year
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Upcoming holidays (from today onwards)
  const upcomingHolidays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays
      .filter((h) => {
        const date = parse(h.day_date, 'yyyy-MM-dd', new Date());
        return isAfter(date, today) || format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      })
      .slice(0, 5);
  }, [holidays]);

  const handleAddHoliday = async () => {
    if (!selectedDate || !description.trim()) {
      toast.error('Completá la fecha y descripción');
      return;
    }

    try {
      await createHoliday.mutateAsync({
        day_date: format(selectedDate, 'yyyy-MM-dd'),
        description: description.trim(),
      });
      toast.success('Feriado agregado');
      setIsAddOpen(false);
      setSelectedDate(undefined);
      setDescription('');
    } catch (e: any) {
      toast.error(e.message || 'Error al agregar feriado');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await deleteHoliday.mutateAsync(id);
      toast.success('Feriado eliminado');
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const handleImportHolidays = async () => {
    const holidaysToImport = getArgentinaHolidays(selectedYear);
    try {
      const imported = await createBulk.mutateAsync(holidaysToImport);
      if (imported.length === 0) {
        toast.info('Todos los feriados ya estaban importados');
      } else {
        toast.success(`${imported.length} feriados importados para ${selectedYear}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al importar');
    }
  };

  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1];

  return (
    <div className="space-y-6">
      <PageHelp pageId="brand-labor-calendar" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Calendario Laboral
          </h1>
          <p className="text-muted-foreground">
            Feriados nacionales y días especiales para todas las sucursales
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Importar feriados AR {selectedYear}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar feriados de Argentina</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se importarán los feriados nacionales oficiales de Argentina para el año{' '}
                    {selectedYear}. Si ya existen, no se duplicarán.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleImportHolidays} disabled={createBulk.isPending}>
                    {createBulk.isPending ? 'Importando...' : 'Importar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar feriado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar feriado</DialogTitle>
                  <DialogDescription>
                    Este feriado aplicará a todas las sucursales.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !selectedDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {selectedDate
                            ? format(selectedDate, "d 'de' MMMM yyyy", { locale: es })
                            : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      placeholder="Ej: Feriado puente"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddHoliday}
                    disabled={createHoliday.isPending || !selectedDate || !description.trim()}
                  >
                    {createHoliday.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Badge variant="secondary" className="ml-2">
          {holidays.length} feriado{holidays.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Year grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24 bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {months.map((month) => {
            const monthHolidays = holidaysByMonth.get(month.getMonth()) || [];
            const isCurrentMonth = isSameMonth(month, now) && selectedYear === now.getFullYear();

            return (
              <Card
                key={month.getMonth()}
                className={cn('transition-colors', isCurrentMonth && 'ring-2 ring-primary')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                    {format(month, 'MMMM', { locale: es })}
                    {monthHolidays.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {monthHolidays.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {monthHolidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin feriados</p>
                  ) : (
                    <div className="space-y-1">
                      {monthHolidays.map((h) => {
                        const date = parse(h.day_date, 'yyyy-MM-dd', new Date());
                        return (
                          <div
                            key={h.id}
                            className="flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <Flag className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-medium">{format(date, 'd')}</span>
                              <span className="text-muted-foreground truncate">
                                {h.description}
                              </span>
                            </div>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteHoliday(h.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upcoming holidays list */}
      {upcomingHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos feriados</CardTitle>
            <CardDescription>Los siguientes días no laborables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHolidays.map((h) => {
                const date = parse(h.day_date, 'yyyy-MM-dd', new Date());
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                      <span className="text-xs font-medium text-primary">
                        {format(date, 'MMM', { locale: es }).toUpperCase()}
                      </span>
                      <span className="text-lg font-bold text-primary">{format(date, 'd')}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{h.description}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {format(date, 'EEEE', { locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && holidays.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">Sin feriados configurados</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Importá los feriados de Argentina o agregá feriados personalizados
            </p>
            {canManage && (
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer feriado
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

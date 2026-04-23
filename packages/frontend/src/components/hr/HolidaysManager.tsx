/**
 * HolidaysManager - CRUD for global holidays
 *
 * Features:
 * - View holidays for current and next month
 * - Add individual holidays
 * - Import Argentina's national holidays
 * - Delete holidays
 *
 * Permissions: Only superadmin/coordinador can manage
 */
import { useState } from 'react';
import { format, addMonths, parse } from 'date-fns';
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
import { toast } from 'sonner';
import { CalendarDays, Plus, Trash2, Download, Info, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useCreateHolidaysBulk,
  getArgentinaHolidays,
} from '@/hooks/useHolidays';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';

interface HolidaysManagerProps {
  className?: string;
}

export default function HolidaysManager({ className }: HolidaysManagerProps) {
  const { isSuperadmin, isCoordinador } = useDynamicPermissions();
  const canManage = isSuperadmin || isCoordinador;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const nextMonth = addMonths(now, 1);
  const nextMonthNum = nextMonth.getMonth() + 1;
  const nextMonthYear = nextMonth.getFullYear();

  // Fetch holidays for current and next month
  const { data: currentHolidays = [], isLoading: loadingCurrent } = useHolidays(
    currentMonth,
    currentYear,
  );
  const { data: nextHolidays = [], isLoading: loadingNext } = useHolidays(
    nextMonthNum,
    nextMonthYear,
  );

  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const createBulk = useCreateHolidaysBulk();

  // Add holiday dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');

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
    const holidays = getArgentinaHolidays(currentYear);
    try {
      await createBulk.mutateAsync(holidays);
      toast.success(`${holidays.length} feriados importados para ${currentYear}`);
    } catch (e: any) {
      toast.error(e.message || 'Error al importar');
    }
  };

  const formatMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });
  };

  const renderHolidayCard = (holiday: { id: string; day_date: string; description: string }) => {
    const date = parse(holiday.day_date, 'yyyy-MM-dd', new Date());

    return (
      <div
        key={holiday.id}
        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
            <span className="text-xs font-medium text-primary">
              {format(date, 'MMM', { locale: es }).toUpperCase()}
            </span>
            <span className="text-lg font-bold text-primary">{format(date, 'd')}</span>
          </div>
          <div>
            <p className="font-medium">{holiday.description}</p>
            <p className="text-xs text-muted-foreground">{format(date, 'EEEE', { locale: es })}</p>
          </div>
        </div>

        {canManage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar feriado?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará "{holiday.description}" del{' '}
                  {format(date, "d 'de' MMMM", { locale: es })}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteHoliday(holiday.id)}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  };

  const renderMonthSection = (
    monthName: string,
    holidays: typeof currentHolidays,
    loading: boolean,
  ) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg capitalize">{monthName}</CardTitle>
        <CardDescription>
          {holidays.length === 0
            ? 'Sin feriados configurados'
            : `${holidays.length} feriado${holidays.length > 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CalendarCheck className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No hay feriados</p>
          </div>
        ) : (
          <div className="space-y-2">{holidays.map(renderHolidayCard)}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Info className="w-3 h-3 mr-1" />
            Los feriados son globales para todas las sucursales
          </Badge>
        </div>

        {canManage && (
          <div className="flex gap-2">
            {/* Import Argentina holidays */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Importar feriados AR
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar feriados de Argentina</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se importarán los feriados nacionales oficiales de Argentina para el año{' '}
                    {currentYear}. Si ya existen, no se duplicarán.
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

            {/* Add individual holiday */}
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

      {/* Month cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {renderMonthSection(
          formatMonthName(currentMonth, currentYear),
          currentHolidays,
          loadingCurrent,
        )}
        {renderMonthSection(
          formatMonthName(nextMonthNum, nextMonthYear),
          nextHolidays,
          loadingNext,
        )}
      </div>
    </div>
  );
}

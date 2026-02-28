/**
 * useHolidays - Hook for global holidays CRUD
 *
 * Uses special_days table with branch_id = NULL for global holidays
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchHolidays,
  createHoliday,
  deleteHoliday,
  createHolidaysBulk,
} from '@/services/hrService';
import { toast } from 'sonner';
import { format, endOfMonth } from 'date-fns';

export interface Holiday {
  id: string;
  day_date: string;
  day_type: 'holiday' | 'special_event';
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface CreateHolidayInput {
  day_date: string;
  description: string;
  day_type?: 'holiday' | 'special_event';
}

/**
 * Fetch holidays for a specific month/year or range
 */
export function useHolidays(month: number, year: number) {
  return useQuery({
    queryKey: ['holidays', year, month],
    queryFn: async () => {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      return (await fetchHolidays(startDate, endDate)) as Holiday[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch holidays for a date range (useful for calendar views)
 */
export function useHolidaysRange(startDate: Date, endDate: Date) {
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['holidays-range', start, end],
    queryFn: async () => {
      return (await fetchHolidays(start, end)) as Holiday[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Create a new global holiday
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHolidayInput) => {
      return (await createHoliday(input)) as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-range'] });
      toast.success('Feriado creado');
    },
    onError: (e: Error) => toast.error(`Error al crear feriado: ${e.message}`),
  });
}

/**
 * Delete a holiday
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidayId: string) => deleteHoliday(holidayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-range'] });
      toast.success('Feriado eliminado');
    },
    onError: (e: Error) => toast.error(`Error al eliminar feriado: ${e.message}`),
  });
}

/**
 * Bulk create holidays (for importing national holidays)
 */
export function useCreateHolidaysBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidays: CreateHolidayInput[]) => {
      return (await createHolidaysBulk(holidays)) as Holiday[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-range'] });
      toast.success(`${data?.length || 0} feriados importados`);
    },
    onError: (e: Error) => toast.error(`Error al importar feriados: ${e.message}`),
  });
}

/**
 * Get Argentina's official holidays for a year
 * Based on official government calendar (argentina.gob.ar)
 *
 * IMPORTANT: This function calculates the correct dates including:
 * - Fixed holidays (inamovibles)
 * - Movable holidays with official transfers (trasladables)
 * - Easter-based holidays (calculated from lunar calendar)
 * - Tourist non-working days (días no laborables turísticos)
 */
export function getArgentinaHolidays(year: number): CreateHolidayInput[] {
  // Calculate Easter Sunday (needed for Carnaval and Holy Week)
  const easterSunday = calculateEasterSunday(year);

  // Carnaval is 48 and 47 days before Easter Sunday (always Monday and Tuesday)
  const carnavalMonday = new Date(easterSunday);
  carnavalMonday.setDate(carnavalMonday.getDate() - 48);
  const carnavalTuesday = new Date(easterSunday);
  carnavalTuesday.setDate(carnavalTuesday.getDate() - 47);

  // Holy Week: Jueves Santo (3 days before) and Viernes Santo (2 days before)
  const juevesSanto = new Date(easterSunday);
  juevesSanto.setDate(juevesSanto.getDate() - 3);
  const viernesSanto = new Date(easterSunday);
  viernesSanto.setDate(viernesSanto.getDate() - 2);

  // Calculate trasladables (movable holidays transferred to Monday)
  const guemes = getTransferredHoliday(year, 6, 17); // June 17 -> nearest Monday
  const soberania = getTransferredHoliday(year, 11, 20); // Nov 20 -> nearest Monday

  const holidays: CreateHolidayInput[] = [
    // Enero
    { day_date: `${year}-01-01`, description: 'Año Nuevo' },

    // Febrero - Carnaval (calculated from Easter)
    { day_date: formatDate(carnavalMonday), description: 'Carnaval' },
    { day_date: formatDate(carnavalTuesday), description: 'Carnaval' },

    // Marzo
    { day_date: `${year}-03-24`, description: 'Día de la Memoria por la Verdad y la Justicia' },

    // Abril - Malvinas + Semana Santa
    { day_date: `${year}-04-02`, description: 'Día del Veterano y Caídos en Malvinas' },
    { day_date: formatDate(juevesSanto), description: 'Jueves Santo (día no laborable)' },
    { day_date: formatDate(viernesSanto), description: 'Viernes Santo' },

    // Mayo
    { day_date: `${year}-05-01`, description: 'Día del Trabajador' },
    { day_date: `${year}-05-25`, description: 'Día de la Revolución de Mayo' },

    // Junio - Güemes trasladado + Belgrano
    { day_date: formatDate(guemes), description: 'Paso a la Inmortalidad del Gral. Güemes' },
    { day_date: `${year}-06-20`, description: 'Paso a la Inmortalidad del Gral. Belgrano' },

    // Julio
    { day_date: `${year}-07-09`, description: 'Día de la Independencia' },

    // Agosto - San Martín (tercer lunes de agosto)
    {
      day_date: getThirdMonday(year, 8),
      description: 'Paso a la Inmortalidad del Gral. San Martín',
    },

    // Octubre - Diversidad Cultural (segundo lunes de octubre)
    {
      day_date: getSecondMonday(year, 10),
      description: 'Día del Respeto a la Diversidad Cultural',
    },

    // Noviembre - Soberanía trasladado
    { day_date: formatDate(soberania), description: 'Día de la Soberanía Nacional' },

    // Diciembre
    { day_date: `${year}-12-08`, description: 'Inmaculada Concepción de María' },
    { day_date: `${year}-12-25`, description: 'Navidad' },
  ];

  // Add tourist days for 2026 (decreed by government)
  if (year === 2026) {
    holidays.push(
      { day_date: '2026-03-23', description: 'Día no laborable turístico' },
      { day_date: '2026-07-10', description: 'Día no laborable turístico' },
      { day_date: '2026-12-07', description: 'Día no laborable turístico' },
    );
  }

  return holidays.sort((a, b) => a.day_date.localeCompare(b.day_date));
}

/**
 * Calculate Easter Sunday using the Anonymous Gregorian algorithm
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Get the transferred date for a trasladable holiday
 * If the original date is Tue/Wed, transfer to previous Monday
 * If Thu/Fri, transfer to next Monday
 */
function getTransferredHoliday(year: number, month: number, day: number): Date {
  const originalDate = new Date(year, month - 1, day);
  const dayOfWeek = originalDate.getDay();

  // If already Monday (1) or Sunday (0), no transfer needed
  if (dayOfWeek === 1) return originalDate;
  if (dayOfWeek === 0) {
    // Sunday -> transfer to next Monday
    originalDate.setDate(originalDate.getDate() + 1);
    return originalDate;
  }

  // Tue (2), Wed (3) -> previous Monday
  if (dayOfWeek === 2 || dayOfWeek === 3) {
    originalDate.setDate(originalDate.getDate() - (dayOfWeek - 1));
    return originalDate;
  }

  // Thu (4), Fri (5), Sat (6) -> next Monday
  originalDate.setDate(originalDate.getDate() + (8 - dayOfWeek));
  return originalDate;
}

/**
 * Get the second Monday of a month (used for Diversidad Cultural in October)
 */
function getSecondMonday(year: number, month: number): string {
  const firstDay = new Date(year, month - 1, 1);
  const firstMonday =
    firstDay.getDay() === 0 ? 2 : firstDay.getDay() === 1 ? 1 : 9 - firstDay.getDay();
  const secondMonday = firstMonday + 7;
  return `${year}-${String(month).padStart(2, '0')}-${String(secondMonday).padStart(2, '0')}`;
}

/**
 * Get the third Monday of a month (used for San Martín in August)
 */
function getThirdMonday(year: number, month: number): string {
  const firstDay = new Date(year, month - 1, 1);
  const firstMonday =
    firstDay.getDay() === 0 ? 2 : firstDay.getDay() === 1 ? 1 : 9 - firstDay.getDay();
  const thirdMonday = firstMonday + 14;
  return `${year}-${String(month).padStart(2, '0')}-${String(thirdMonday).padStart(2, '0')}`;
}

/**
 * Format a Date object as yyyy-MM-dd string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

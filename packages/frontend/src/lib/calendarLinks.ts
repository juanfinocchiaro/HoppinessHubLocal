/**
 * Utilidades para generar links de calendario
 */

export interface CalendarEventData {
  title: string;
  date: string;
  area?: string;
  branchName?: string;
  participantCount?: number;
}

/**
 * Genera un link para agregar un evento a Google Calendar
 * El link abre Google Calendar con el evento pre-llenado
 */
export function generateGoogleCalendarLink(meeting: CalendarEventData): string {
  const startDate = new Date(meeting.date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora por defecto

  // Formato requerido por Google: YYYYMMDDTHHmmssZ
  const formatDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const details = [
    `Reunión de ${meeting.area || 'equipo'} - Hoppiness Club`,
    meeting.participantCount ? `${meeting.participantCount} participantes convocados` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details,
    location: meeting.branchName || 'Hoppiness Club',
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

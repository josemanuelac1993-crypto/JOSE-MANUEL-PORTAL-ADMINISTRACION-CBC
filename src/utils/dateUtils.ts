/**
 * Utility functions for local date and time formatting and parsing
 * Ensures timestamps respect the user's local system time zone.
 */

export const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

/**
 * Returns current timestamp in local ISO format (or standard ISO)
 */
export function getCurrentLocalTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format a timestamp into clean local date and time: "03 ago 2026 • 15:26"
 */
export function formatLocalShortDateTime(timestamp?: string | number | Date): string {
  if (!timestamp) return 'Fecha no registrada';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    
    const datePart = d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    
    const timePart = d.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return `${datePart} • ${timePart}`;
  } catch {
    return String(timestamp);
  }
}

/**
 * Format a timestamp into long local date with time: "3 de agosto de 2026, 15:26:00"
 */
export function formatLocalLongDateTime(timestamp?: string | number | Date): string {
  if (!timestamp) return 'Fecha no registrada';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);

    return d.toLocaleString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return String(timestamp);
  }
}

/**
 * Construct local Date object without UTC timezone conversion skew
 */
export function createLocalDate(
  year: number,
  monthIndex: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0
): Date {
  const safeDay = Math.min(Math.max(1, day), 31);
  const safeMonth = Math.min(Math.max(0, monthIndex), 11);
  return new Date(year, safeMonth, safeDay, hours, minutes, seconds);
}

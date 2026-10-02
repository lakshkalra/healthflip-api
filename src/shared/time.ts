import { validationError } from './errors.js';

export interface DayRange {
  end: Date;
  start: Date;
}

export function getDayRangeUtc(date: string, timeZone: string): DayRange {
  const [year, month, day] = date.split('-').map(Number);
  const start = zonedDateTimeToUtc(year, month, day, timeZone);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const end = zonedDateTimeToUtc(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate(),
    timeZone,
  );

  return { start, end };
}

function zonedDateTimeToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const firstOffset = getOffsetMilliseconds(utcGuess, timeZone);
  const corrected = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getOffsetMilliseconds(corrected, timeZone);

  return new Date(utcGuess.getTime() - secondOffset);
}

function getOffsetMilliseconds(date: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      calendar: 'gregory',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    });
    const parts = Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value]),
    );
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );

    return localAsUtc - date.getTime();
  } catch {
    throw validationError([{ path: 'timezone', message: 'Use a valid IANA timezone.' }]);
  }
}

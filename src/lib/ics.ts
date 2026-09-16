const CRLF = '\r\n';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  updated_at: string;
}

function formatUtcDate(dateInput: string): string {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${dateInput}`);
  }

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  let folded = '';
  let octets = 0;

  for (const character of line) {
    const length = encoder.encode(character).length;
    if (octets + length > 75) {
      folded += `${CRLF} `;
      octets = 1;
    }
    folded += character;
    octets += length;
  }

  return folded;
}

function property(name: string, value: string): string {
  return foldIcsLine(`${name}:${value}`);
}

export function buildIcsCalendar(calendarName: string, events: CalendarEvent[]): string {
  const normalizedCalendarName = escapeIcsText(calendarName || 'University Calendar');
  const body: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//uni-repo//Assignment Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    property('X-WR-CALNAME', normalizedCalendarName),
    'X-PUBLISHED-TTL:PT5M',
  ];

  for (const event of events) {
    body.push('BEGIN:VEVENT');
    body.push(property('UID', event.id));
    body.push(property('DTSTAMP', formatUtcDate(event.updated_at || event.start_time)));
    body.push(property('DTSTART', formatUtcDate(event.start_time)));
    if (event.end_time) {
      body.push(property('DTEND', formatUtcDate(event.end_time)));
    }
    body.push(property('SUMMARY', escapeIcsText(event.title)));

    if (event.description && event.description.trim().length > 0) {
      body.push(property('DESCRIPTION', escapeIcsText(event.description)));
    }

    body.push('END:VEVENT');
  }

  body.push('END:VCALENDAR');

  return `${body.join(CRLF)}${CRLF}`;
}

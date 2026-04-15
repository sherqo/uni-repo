import { createClient } from '@supabase/supabase-js';

interface CalendarRef {
  slug: string;
}

interface EventRow {
  title: string;
  description: string | null;
  start_time: string;
  calendars: CalendarRef[] | null;
}

export interface HomeEventRow {
  date: string;
  details: string;
}

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBA';
  }

  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
}

function buildDetails(event: EventRow): string {
  const title = event.title.trim();
  const description = event.description?.trim();
  const slugs = (event.calendars ?? []).map(calendar => calendar.slug).filter(Boolean);

  const parts = [title];
  if (description) parts.push(description);
  if (slugs.length > 0) parts.push(`[${slugs.join(', ')}]`);

  return parts.join(' - ');
}

export async function getHomeEvents(fallback: HomeEventRow[]): Promise<HomeEventRow[]> {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return fallback;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('events')
    .select('title, description, start_time, calendars(slug)')
    .order('start_time', { ascending: true });

  if (error || !data || data.length === 0) {
    return fallback;
  }

  const events = (data as EventRow[]).map(event => ({
    date: formatEventDate(event.start_time),
    details: buildDetails(event),
  }));

  return events.length > 0 ? events : fallback;
}

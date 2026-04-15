import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

import { buildIcsCalendar } from '@/lib/ics';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const GET: APIRoute = async ({ url }) => {
  const category = url.searchParams.get('category')?.trim() ?? '';

  if (!category) {
    return new Response('Missing required query parameter: category', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const { data: calendar, error: calendarError } = await supabase.from('calendars').select('id, name').eq('slug', category).maybeSingle();

  if (calendarError) {
    return new Response('Failed to load calendar', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (!calendar) {
    return new Response('Calendar not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, description, start_time, end_time, updated_at')
    .eq('calendar_id', calendar.id)
    .order('start_time', { ascending: true });

  if (eventsError) {
    return new Response('Failed to load events', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const ics = buildIcsCalendar(calendar.name, events ?? []);

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};

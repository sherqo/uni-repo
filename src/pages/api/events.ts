import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

export const prerender = false;

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const INGEST_API_SECRET = 'sharqawy'; // simple for now
const DEPLOY_HOOK_URL = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/06711064-e12f-4679-b8f6-9cef299f8152';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Payload = {
  secret?: unknown;
  title?: unknown;
  description?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  slugs?: unknown;
};

type CalendarRow = {
  id: string;
  slug: string;
};

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseSlugs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(v => String(v).trim().toLowerCase()).filter(Boolean)));
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(',')
          .map(slug => slug.trim().toLowerCase())
          .filter(Boolean)
      )
    );
  }

  return [];
}

function isValidIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

async function triggerDeployHook(): Promise<void> {
  try {
    const response = await fetch(DEPLOY_HOOK_URL, { method: 'POST' });
    if (!response.ok) {
      console.error('deploy hook failed', response.status, await response.text());
    }
  } catch (error) {
    console.error('deploy hook request error', error);
  }
}

async function parsePayload(request: Request): Promise<Payload | null> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await request.json()) as Payload;
  }

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const slugs = formData.getAll('slugs').map(value => String(value));

    return {
      secret: formData.get('secret'),
      title: formData.get('title'),
      description: formData.get('description'),
      start_time: formData.get('start_time'),
      end_time: formData.get('end_time'),
      slugs: slugs.length > 1 ? slugs : formData.get('slugs'),
    };
  }

  return null;
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);

  if (!payload) {
    return json(415, { error: 'Use application/json or form-urlencoded payloads' });
  }

  const providedSecret = toStringValue(payload.secret) || toStringValue(request.headers.get('x-api-secret'));
  if (providedSecret !== INGEST_API_SECRET) {
    return json(401, { error: 'Invalid secret' });
  }

  const title = toStringValue(payload.title);
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const startTime = toStringValue(payload.start_time);
  const endTime = toStringValue(payload.end_time);
  const slugs = parseSlugs(payload.slugs);

  if (!title) {
    return json(400, { error: 'title is required' });
  }

  if (!startTime || !isValidIsoDate(startTime)) {
    return json(400, { error: 'start_time must be a valid ISO date' });
  }

  if (endTime && !isValidIsoDate(endTime)) {
    return json(400, { error: 'end_time must be a valid ISO date when provided' });
  }

  if (endTime && new Date(endTime).getTime() <= new Date(startTime).getTime()) {
    return json(400, { error: 'end_time must be later than start_time' });
  }

  if (slugs.length === 0) {
    return json(400, { error: 'Provide at least one slug in slugs' });
  }

  const { data: calendars, error: calendarsError } = await supabase.from('calendars').select('id, slug').in('slug', slugs);
  if (calendarsError) {
    return json(500, { error: 'Failed to load calendars' });
  }

  const slugToId = new Map((calendars ?? []).map(calendar => [calendar.slug, calendar.id]));
  const missingSlugs = slugs.filter(slug => !slugToId.has(slug));

  if (missingSlugs.length > 0) {
    const toInsert = missingSlugs.map(slug => ({
      slug,
      name: slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    }));

    const { data: insertedCalendars, error: insertCalendarsError } = await supabase.from('calendars').insert(toInsert).select('id, slug');

    if (insertCalendarsError) {
      return json(500, { error: 'Failed to create missing slugs', missing_slugs: missingSlugs });
    }

    for (const calendar of (insertedCalendars ?? []) as CalendarRow[]) {
      slugToId.set(calendar.slug, calendar.id);
    }
  }

  const unresolvedSlugs = slugs.filter(slug => !slugToId.has(slug));
  if (unresolvedSlugs.length > 0) {
    return json(500, { error: 'Some slugs could not be resolved', missing_slugs: unresolvedSlugs });
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (eventError || !event) {
    return json(500, { error: 'Failed to create event' });
  }

  const links = slugs.map(slug => ({ event_id: event.id, calendar_id: slugToId.get(slug) }));
  const { error: linksError } = await supabase.from('event_calendars').insert(links);

  if (linksError) {
    await supabase.from('events').delete().eq('id', event.id);
    return json(500, { error: 'Failed to attach event to calendars' });
  }

  await triggerDeployHook();

  return json(201, {
    ok: true,
    event_id: event.id,
    slugs,
  });
};

export const GET: APIRoute = async ({ request }) => {
  const secret = toStringValue(new URL(request.url).searchParams.get('secret')) || toStringValue(request.headers.get('x-api-secret'));

  if (secret !== INGEST_API_SECRET) {
    return json(401, { error: 'Invalid secret' });
  }

  const { data: calendars, error } = await supabase.from('calendars').select('slug, name').order('slug', { ascending: true });

  if (error) {
    return json(500, { error: 'Failed to load slugs' });
  }

  return json(200, {
    ok: true,
    slugs: calendars ?? [],
  });
};

create extension if not exists pgcrypto;

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_time_range_check check (end_time > start_time)
);

create index if not exists events_calendar_id_start_time_idx
  on public.events (calendar_id, start_time);

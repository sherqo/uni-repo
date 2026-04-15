create table if not exists public.event_calendars (
  event_id uuid not null references public.events(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, calendar_id)
);

create index if not exists event_calendars_calendar_id_idx
  on public.event_calendars (calendar_id);

insert into public.event_calendars (event_id, calendar_id)
select e.id, e.calendar_id
from public.events e
where e.calendar_id is not null
on conflict (event_id, calendar_id) do nothing;

alter table public.events drop constraint if exists events_calendar_id_fkey;
alter table public.events drop column if exists calendar_id;

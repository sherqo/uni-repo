alter table public.events
  alter column end_time drop not null;

alter table public.events
  drop constraint if exists events_time_range_check;

alter table public.events
  add constraint events_time_range_check
  check (end_time is null or end_time > start_time);

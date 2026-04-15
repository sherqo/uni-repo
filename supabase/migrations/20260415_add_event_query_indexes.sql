create index if not exists events_start_time_idx
  on public.events (start_time);

create index if not exists event_calendars_calendar_event_idx
  on public.event_calendars (calendar_id, event_id);

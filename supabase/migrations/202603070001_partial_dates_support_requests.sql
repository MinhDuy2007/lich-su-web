begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'partial_date_precision') then
    create type public.partial_date_precision as enum (
      'unknown',
      'year',
      'month',
      'day',
      'month_year',
      'day_month',
      'day_year',
      'day_month_year'
    );
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'notification_type')
    and not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.notification_type'::regtype
        and enumlabel = 'support_request'
    ) then
    alter type public.notification_type add value 'support_request';
  end if;
end $$;

alter table public.events
  add column if not exists start_year integer,
  add column if not exists start_month integer,
  add column if not exists start_day integer,
  add column if not exists start_precision public.partial_date_precision not null default 'unknown',
  add column if not exists end_year integer,
  add column if not exists end_month integer,
  add column if not exists end_day integer,
  add column if not exists end_precision public.partial_date_precision not null default 'unknown';

alter table public.event_submissions
  add column if not exists start_year integer,
  add column if not exists start_month integer,
  add column if not exists start_day integer,
  add column if not exists start_precision public.partial_date_precision not null default 'unknown',
  add column if not exists end_year integer,
  add column if not exists end_month integer,
  add column if not exists end_day integer,
  add column if not exists end_precision public.partial_date_precision not null default 'unknown',
  add column if not exists source_ids uuid[] not null default '{}'::uuid[],
  add column if not exists custom_sources jsonb not null default '[]'::jsonb;

alter table public.event_reports
  add column if not exists changes_applied text;

alter table public.events
  drop constraint if exists chk_events_start_month_range,
  drop constraint if exists chk_events_end_month_range,
  drop constraint if exists chk_events_start_day_range,
  drop constraint if exists chk_events_end_day_range;

alter table public.events
  add constraint chk_events_start_month_range
    check (start_month is null or start_month between 1 and 12),
  add constraint chk_events_end_month_range
    check (end_month is null or end_month between 1 and 12),
  add constraint chk_events_start_day_range
    check (start_day is null or start_day between 1 and 31),
  add constraint chk_events_end_day_range
    check (end_day is null or end_day between 1 and 31);

alter table public.event_submissions
  drop constraint if exists chk_event_submissions_start_month_range,
  drop constraint if exists chk_event_submissions_end_month_range,
  drop constraint if exists chk_event_submissions_start_day_range,
  drop constraint if exists chk_event_submissions_end_day_range;

alter table public.event_submissions
  add constraint chk_event_submissions_start_month_range
    check (start_month is null or start_month between 1 and 12),
  add constraint chk_event_submissions_end_month_range
    check (end_month is null or end_month between 1 and 12),
  add constraint chk_event_submissions_start_day_range
    check (start_day is null or start_day between 1 and 31),
  add constraint chk_event_submissions_end_day_range
    check (end_day is null or end_day between 1 and 31);

update public.events
set
  start_year = coalesce(start_year, extract(year from start_date)::integer),
  start_month = coalesce(start_month, extract(month from start_date)::integer),
  start_day = coalesce(start_day, extract(day from start_date)::integer),
  start_precision = case
    when start_date is not null then 'day_month_year'
    else start_precision
  end,
  end_year = coalesce(end_year, extract(year from end_date)::integer),
  end_month = coalesce(end_month, extract(month from end_date)::integer),
  end_day = coalesce(end_day, extract(day from end_date)::integer),
  end_precision = case
    when end_date is not null then 'day_month_year'
    else end_precision
  end
where start_date is not null or end_date is not null;

update public.event_submissions
set
  start_year = coalesce(start_year, extract(year from start_date)::integer),
  start_month = coalesce(start_month, extract(month from start_date)::integer),
  start_day = coalesce(start_day, extract(day from start_date)::integer),
  start_precision = case
    when start_date is not null then 'day_month_year'
    else start_precision
  end,
  end_year = coalesce(end_year, extract(year from end_date)::integer),
  end_month = coalesce(end_month, extract(month from end_date)::integer),
  end_day = coalesce(end_day, extract(day from end_date)::integer),
  end_precision = case
    when end_date is not null then 'day_month_year'
    else end_precision
  end
where start_date is not null or end_date is not null;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  email text not null check (char_length(btrim(email)) between 5 and 255),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone text check (phone is null or char_length(btrim(phone)) between 8 and 30),
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_requests_created
  on public.support_requests(created_at desc);
create index if not exists idx_support_requests_submitted_by
  on public.support_requests(submitted_by, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists "support_requests own read" on public.support_requests;
create policy "support_requests own read"
on public.support_requests for select
to authenticated
using (auth.uid() = submitted_by or public.is_staff(auth.uid()));

drop policy if exists "support_requests own insert" on public.support_requests;
create policy "support_requests own insert"
on public.support_requests for insert
to authenticated
with check (submitted_by is null or auth.uid() = submitted_by);

drop policy if exists "support_requests staff update" on public.support_requests;
create policy "support_requests staff update"
on public.support_requests for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

create or replace view public.events_view as
select
  e.id,
  e.slug,
  e.title,
  e.summary,
  e.content,
  e.start_date,
  e.end_date,
  e.start_year,
  e.start_month,
  e.start_day,
  e.start_precision,
  e.end_year,
  e.end_month,
  e.end_day,
  e.end_precision,
  e.event_type,
  e.location_text,
  e.country,
  e.status,
  coalesce(array_agg(distinct t.name) filter (where t.name is not null), '{}') as tags,
  coalesce(array_agg(distinct ep.person_name) filter (where ep.person_name is not null), '{}') as people,
  coalesce(array_agg(distinct pl.place_name) filter (where pl.place_name is not null), '{}') as places,
  coalesce(array_agg(distinct ei.image_url) filter (where ei.image_url is not null), '{}') as image_urls,
  coalesce(
    jsonb_agg(
      distinct jsonb_build_object('id', s.id, 'name', s.name, 'url', s.url)
    ) filter (where s.id is not null),
    '[]'::jsonb
  ) as sources
from public.events e
left join public.event_tags et on et.event_id = e.id
left join public.tags t on t.id = et.tag_id
left join public.event_people ep on ep.event_id = e.id
left join public.event_places pl on pl.event_id = e.id
left join public.event_images ei on ei.event_id = e.id
left join public.event_sources es on es.event_id = e.id
left join public.sources s on s.id = es.source_id
group by e.id;

commit;

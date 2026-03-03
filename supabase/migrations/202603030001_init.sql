create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'moderator', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('draft', 'pending', 'published', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'otp_purpose') then
    create type public.otp_purpose as enum ('register', 'forgot_password');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type public.submission_status as enum ('pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'ai_summary_style') then
    create type public.ai_summary_style as enum ('paragraph', 'bullets');
  end if;
  if not exists (select 1 from pg_type where typname = 'ai_summary_length') then
    create type public.ai_summary_length as enum ('short', 'medium', 'long');
  end if;
end $$;

create table if not exists public.roles (
  id smallserial primary key,
  name public.app_role not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.roles (name, description)
values
  ('user', 'Tai khoan nguoi dung thong thuong'),
  ('moderator', 'Tai khoan kiem duyet noi dung'),
  ('admin', 'Tai khoan quan tri he thong')
on conflict (name) do nothing;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username varchar(30) not null unique check (username ~ '^[a-z0-9_]{4,30}$'),
  email text not null unique,
  is_banned boolean not null default false,
  gemini_api_key_encrypted text,
  ai_daily_limit integer not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  start_date date,
  end_date date,
  event_type text,
  location_text text,
  country text,
  status public.event_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_start_date on public.events(start_date);
create index if not exists idx_events_event_type on public.events(event_type);
create index if not exists idx_events_country on public.events(country);
create index if not exists idx_events_title_search on public.events using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')));

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, tag_id)
);

create index if not exists idx_event_tags_tag_id on public.event_tags(tag_id);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_sources (
  event_id uuid not null references public.events(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, source_id)
);

create table if not exists public.event_people (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_people_event on public.event_people(event_id);
create index if not exists idx_event_people_name on public.event_people(person_name);

create table if not exists public.event_places (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  place_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_places_event on public.event_places(event_id);
create index if not exists idx_event_places_name on public.event_places(place_name);

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  image_url text not null,
  storage_path text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_images_event on public.event_images(event_id);

create table if not exists public.event_relations (
  event_id uuid not null references public.events(id) on delete cascade,
  related_event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, related_event_id)
);

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  content text not null,
  start_date date,
  end_date date,
  event_type text,
  location_text text,
  country text,
  tags text[] not null default '{}',
  people text[] not null default '{}',
  places text[] not null default '{}',
  image_urls text[] not null default '{}',
  status public.submission_status not null default 'pending',
  approved_event_id uuid references public.events(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_submissions_status on public.event_submissions(status);
create index if not exists idx_event_submissions_user on public.event_submissions(submitted_by);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table if not exists public.view_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_view_history_user on public.view_history(user_id, viewed_at desc);

create table if not exists public.event_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table if not exists public.otp_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose public.otp_purpose not null,
  code_hash text not null,
  attempt_count integer not null default 0,
  verified_at timestamptz,
  expires_at timestamptz not null,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_requests_email_purpose on public.otp_requests(email, purpose, created_at desc);

create table if not exists public.captcha_sessions (
  id uuid primary key default gen_random_uuid(),
  answer_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.ip_bans (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create table if not exists public.ai_summaries_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  style public.ai_summary_style not null,
  length public.ai_summary_length not null,
  summary text not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_id, style, length)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create or replace function public.has_role(target_user uuid, target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = target_user
      and ur.role = target_role
  );
$$;

create or replace function public.is_staff(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(target_user, 'admin') or public.has_role(target_user, 'moderator');
$$;

create or replace view public.events_view as
select
  e.id,
  e.slug,
  e.title,
  e.summary,
  e.content,
  e.start_date,
  e.end_date,
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

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.tags enable row level security;
alter table public.event_tags enable row level security;
alter table public.sources enable row level security;
alter table public.event_sources enable row level security;
alter table public.event_people enable row level security;
alter table public.event_places enable row level security;
alter table public.event_images enable row level security;
alter table public.event_relations enable row level security;
alter table public.event_submissions enable row level security;
alter table public.favorites enable row level security;
alter table public.view_history enable row level security;
alter table public.event_notes enable row level security;
alter table public.otp_requests enable row level security;
alter table public.captcha_sessions enable row level security;
alter table public.ip_bans enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.ai_summaries_cache enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "roles read all auth" on public.roles;
create policy "roles read all auth" on public.roles for select to authenticated using (true);

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles for select to authenticated using (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update to authenticated using (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
) with check (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert to authenticated with check (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "user_roles own read" on public.user_roles;
create policy "user_roles own read" on public.user_roles for select to authenticated using (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "user_roles admin write" on public.user_roles;
create policy "user_roles admin write" on public.user_roles for all to authenticated using (
  public.has_role(auth.uid(), 'admin')
) with check (
  public.has_role(auth.uid(), 'admin')
);

drop policy if exists "events read published" on public.events;
create policy "events read published" on public.events for select to authenticated using (
  status = 'published' or public.is_staff(auth.uid())
);

drop policy if exists "events staff write" on public.events;
create policy "events staff write" on public.events for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "tags read all" on public.tags;
create policy "tags read all" on public.tags for select to authenticated using (true);

drop policy if exists "tags staff write" on public.tags;
create policy "tags staff write" on public.tags for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "sources read all" on public.sources;
create policy "sources read all" on public.sources for select to authenticated using (true);

drop policy if exists "sources staff write" on public.sources;
create policy "sources staff write" on public.sources for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "event relations read all auth" on public.event_tags;
create policy "event relations read all auth" on public.event_tags for select to authenticated using (true);
drop policy if exists "event relations staff write tags" on public.event_tags;
create policy "event relations staff write tags" on public.event_tags for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "event sources read all auth" on public.event_sources;
create policy "event sources read all auth" on public.event_sources for select to authenticated using (true);
drop policy if exists "event sources staff write" on public.event_sources;
create policy "event sources staff write" on public.event_sources for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "event people read all auth" on public.event_people;
create policy "event people read all auth" on public.event_people for select to authenticated using (true);
drop policy if exists "event people staff write" on public.event_people;
create policy "event people staff write" on public.event_people for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "event places read all auth" on public.event_places;
create policy "event places read all auth" on public.event_places for select to authenticated using (true);
drop policy if exists "event places staff write" on public.event_places;
create policy "event places staff write" on public.event_places for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "event images read all auth" on public.event_images;
create policy "event images read all auth" on public.event_images for select to authenticated using (true);
drop policy if exists "event images staff write" on public.event_images;
create policy "event images staff write" on public.event_images for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "event relations read all auth table" on public.event_relations;
create policy "event relations read all auth table" on public.event_relations for select to authenticated using (true);
drop policy if exists "event relations staff write table" on public.event_relations;
create policy "event relations staff write table" on public.event_relations for all to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "submission own insert" on public.event_submissions;
create policy "submission own insert" on public.event_submissions for insert to authenticated with check (
  auth.uid() = submitted_by
);

drop policy if exists "submission own read or staff" on public.event_submissions;
create policy "submission own read or staff" on public.event_submissions for select to authenticated using (
  auth.uid() = submitted_by or public.is_staff(auth.uid())
);

drop policy if exists "submission staff update" on public.event_submissions;
create policy "submission staff update" on public.event_submissions for update to authenticated using (
  public.is_staff(auth.uid())
) with check (
  public.is_staff(auth.uid())
);

drop policy if exists "favorites own all" on public.favorites;
create policy "favorites own all" on public.favorites for all to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

drop policy if exists "view_history own all" on public.view_history;
create policy "view_history own all" on public.view_history for all to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

drop policy if exists "event_notes own all" on public.event_notes;
create policy "event_notes own all" on public.event_notes for all to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

drop policy if exists "ai_usage own all" on public.ai_usage_daily;
create policy "ai_usage own all" on public.ai_usage_daily for all to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

drop policy if exists "ai_summary own all" on public.ai_summaries_cache;
create policy "ai_summary own all" on public.ai_summaries_cache for all to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

drop policy if exists "ai_messages own all" on public.ai_messages;
create policy "ai_messages own all" on public.ai_messages for all to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

drop policy if exists "event-images read all" on storage.objects;
create policy "event-images read all"
on storage.objects for select
to public
using (bucket_id = 'event-images');

drop policy if exists "event-images staff write" on storage.objects;
create policy "event-images staff write"
on storage.objects for all
to authenticated
using (bucket_id = 'event-images' and public.is_staff(auth.uid()))
with check (bucket_id = 'event-images' and public.is_staff(auth.uid()));


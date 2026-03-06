begin;

create table if not exists public.event_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists idx_event_follows_user_created
  on public.event_follows(user_id, created_at desc);
create index if not exists idx_event_follows_event_created
  on public.event_follows(event_id, created_at desc);

create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) > 0 and char_length(content) <= 2000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_comments_event_created
  on public.event_comments(event_id, created_at desc);
create index if not exists idx_event_comments_user_created
  on public.event_comments(user_id, created_at desc);

create table if not exists public.event_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.event_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists idx_event_comment_likes_comment
  on public.event_comment_likes(comment_id);
create index if not exists idx_event_comment_likes_user_created
  on public.event_comment_likes(user_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_report_status') then
    create type public.event_report_status as enum ('pending', 'reviewing', 'resolved', 'rejected');
  end if;
end $$;

create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) >= 3 and char_length(reason) <= 500),
  detail text,
  status public.event_report_status not null default 'pending',
  admin_response text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_reports_status_created
  on public.event_reports(status, created_at desc);
create index if not exists idx_event_reports_reporter_created
  on public.event_reports(reporter_user_id, created_at desc);
create index if not exists idx_event_reports_event_created
  on public.event_reports(event_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'comment_like',
      'submission_reviewed',
      'report_response',
      'event_updated',
      'admin_broadcast'
    );
  end if;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(btrim(title)) >= 2 and char_length(title) <= 160),
  body text not null check (char_length(btrim(body)) >= 2 and char_length(body) <= 1000),
  link text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

create table if not exists public.user_ip_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address text not null check (char_length(btrim(ip_address)) >= 2 and char_length(ip_address) <= 64),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count integer not null default 1 check (seen_count > 0),
  last_user_agent text,
  unique (user_id, ip_address)
);

create index if not exists idx_user_ip_logs_user_last_seen
  on public.user_ip_logs(user_id, last_seen_at desc);
create index if not exists idx_user_ip_logs_ip_last_seen
  on public.user_ip_logs(ip_address, last_seen_at desc);

alter table public.event_follows enable row level security;
alter table public.event_comments enable row level security;
alter table public.event_comment_likes enable row level security;
alter table public.event_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.user_ip_logs enable row level security;

drop policy if exists "event_follows own all" on public.event_follows;
create policy "event_follows own all"
on public.event_follows for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "event_comments read all auth" on public.event_comments;
create policy "event_comments read all auth"
on public.event_comments for select
to authenticated
using (true);

drop policy if exists "event_comments own insert" on public.event_comments;
create policy "event_comments own insert"
on public.event_comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "event_comments own update" on public.event_comments;
create policy "event_comments own update"
on public.event_comments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "event_comment_likes read all auth" on public.event_comment_likes;
create policy "event_comment_likes read all auth"
on public.event_comment_likes for select
to authenticated
using (true);

drop policy if exists "event_comment_likes own insert" on public.event_comment_likes;
create policy "event_comment_likes own insert"
on public.event_comment_likes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "event_comment_likes own delete" on public.event_comment_likes;
create policy "event_comment_likes own delete"
on public.event_comment_likes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "event_reports own insert" on public.event_reports;
create policy "event_reports own insert"
on public.event_reports for insert
to authenticated
with check (auth.uid() = reporter_user_id);

drop policy if exists "event_reports own read or staff" on public.event_reports;
create policy "event_reports own read or staff"
on public.event_reports for select
to authenticated
using (
  auth.uid() = reporter_user_id
  or public.is_staff(auth.uid())
);

drop policy if exists "event_reports staff update" on public.event_reports;
create policy "event_reports staff update"
on public.event_reports for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read"
on public.notifications for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update"
on public.notifications for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notifications staff insert" on public.notifications;
create policy "notifications staff insert"
on public.notifications for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists "user_ip_logs admin read" on public.user_ip_logs;
create policy "user_ip_logs admin read"
on public.user_ip_logs for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "user_ip_logs admin write" on public.user_ip_logs;
create policy "user_ip_logs admin write"
on public.user_ip_logs for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;

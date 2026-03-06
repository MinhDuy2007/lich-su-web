begin;

alter table public.event_comments
  add column if not exists parent_comment_id uuid references public.event_comments(id) on delete cascade;

create index if not exists idx_event_comments_parent_created
  on public.event_comments(parent_comment_id, created_at asc);

commit;

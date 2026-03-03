insert into public.tags (name, slug)
values
  ('chien-tranh', 'chien-tranh'),
  ('chinh-tri', 'chinh-tri'),
  ('khoa-hoc', 'khoa-hoc')
on conflict (slug) do nothing;

insert into public.sources (name, url)
values
  ('Bao tang lich su quoc gia', 'https://baotanglichsu.vn'),
  ('Wikipedia', 'https://wikipedia.org'),
  ('Britannica', 'https://britannica.com')
on conflict do nothing;


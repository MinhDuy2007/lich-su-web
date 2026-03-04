begin;

alter table public.profiles
  drop column if exists gemini_api_key_encrypted;

commit;

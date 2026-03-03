-- Huong dan:
-- 1) Tim user_id cua tai khoan can gan admin.
-- 2) Thay USER_ID_O_DAY bang uuid that.
-- 3) Chay ca block trong SQL Editor.

insert into public.user_roles (user_id, role, granted_by)
values ('USER_ID_O_DAY', 'admin', 'USER_ID_O_DAY');


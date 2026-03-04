# LichSuAI Web

Nen tang tra cuu su kien lich su duoc xay dung bang **Next.js App Router + Supabase + Google AI Studio (Gemma 27B)**.

## 1) Tong quan

Du an da migrate tu Vite sang Next.js va bao gom:

- Dang ky / dang nhap bang username + mat khau + captcha SVG.
- OTP qua Supabase Auth Email, gioi han 2 lan/1 gio.
- Quen mat khau bang OTP.
- Vai tro `user`, `moderator`, `admin`.
- Admin CRUD su kien/tag/nguon, kiem duyet de xuat, quan ly user, chan IP.
- Search/filter su kien, trang chi tiet, related events.
- Favorites/history/notes dong bo da thiet bi.
- AI summarize + hoi dap voi Gemma 27B, cache DB va gioi han luot/ngay.
- Supabase migration + RLS + Storage bucket `event-images`.

## 2) Yeu cau he thong (Windows)

### 2.1 Kiem tra da cai hay chua

```powershell
node -v
npm -v
pnpm -v
git --version
npx supabase --version
```

### 2.2 Neu chua co

```powershell
# Node.js LTS: cai tu https://nodejs.org

# pnpm (neu can)
npm i -g pnpm

# Supabase CLI local cho project
npm i -D supabase
npx supabase --version
```

## 3) Cai dat va chay local

```powershell
# 1) Cai thu vien
npm install

# 2) Tao file env
copy .env.example .env.local

# 3) Chinh gia tri env trong .env.local
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# APP_ENCRYPTION_KEY
# OTP_PEPPER
# MAIL_TEST_EMAIL (tuy chon, chi dung cho npm run verify:mail)

# 4) Chay app
npm run dev
```

App local: `http://localhost:3000`

## 4) Supabase: migration + seed + bootstrap admin

```powershell
# login + link project
npx supabase login
npx supabase link --project-ref <your-project-ref>

# day migration
npx supabase db push

# chay seed (neu can)
npx supabase db reset
```

### Gan admin dau tien bang SQL

Sau khi user dau tien dang ky, vao Supabase SQL Editor va chay:

```sql
insert into public.user_roles (user_id, role, granted_by)
values ('<USER_ID_CAN_GAN_ADMIN>', 'admin', '<USER_ID_CAN_GAN_ADMIN>');
```

Co san file mau: `supabase/scripts/bootstrap-admin.sql`

### 4.1 Cau hinh Supabase Auth Email (HTML)

1. Vao Supabase Dashboard -> `Authentication` -> `Email Templates`.
2. Tai template OTP lien quan, bat che do xac thuc bang ma.
3. Copy noi dung tu file `supabase/auth-templates/email-otp.html` vao khung HTML.
4. Luu template va test lai luong OTP.

Luu y:
- He thong verify OTP bang token code (`{{ .Token }}`).
- Neu chua bat Email provider cua Supabase Auth, hay bat truoc khi test.

## 5) Scripts

```powershell
npm run dev
npm run doctor
npm run verify:supabase
npm run verify:mail
npm run verify:gemini
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
```

Ghi chu:

- `verify:gemini` can bien `GEMINI_API_KEY` trong shell truoc khi chay.
- Model mac dinh hien tai: `gemma-3-27b-it` (Google AI Studio / Gemini API).
- Vi du PowerShell:

```powershell
$env:GEMINI_API_KEY="AIza..."
npm run verify:gemini
```

## 5.1 Cac buoc them Google API key (server key)

1. Vao Google AI Studio: `https://aistudio.google.com/apikey`.
2. Tao API key moi cho du an.
3. Dat key vao `.env.local` duoi bien `GEMINI_API_KEY`.
4. Neu can test tu command line:

```powershell
$env:GEMINI_API_KEY="AIza..."
npm run verify:gemini
```

Luu y:

- Khong commit API key vao git.
- Khong dat key trong code.

`npm run verify:mail` se kiem tra ket noi Supabase Auth.
Neu muon gui OTP thu bang script, hay dien them:

- `MAIL_TEST_EMAIL` (email da ton tai tren he thong)

## 6) Deploy Vercel

1. Tao project tren Vercel, connect repo.
2. Dat ENV tren Vercel giong `.env.local`.
3. Build command: `npm run build`.
4. Output: mac dinh Next.js.
5. Deploy.

Luu y:

- Khong hardcode API key.
- He thong chi dung server key qua ENV.
- Khong in key ra log.

## 7) Project tree

```text
.
|-- middleware.ts
|-- next.config.ts
|-- package.json
|-- postcss.config.js
|-- tailwind.config.ts
|-- tsconfig.json
|-- .env.example
|-- src
|   |-- app
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |   |-- tim-kiem/page.tsx
|   |   |-- su-kien/[slug]/page.tsx
|   |   |-- dong-thoi-gian/page.tsx
|   |   |-- thu-vien/page.tsx
|   |   |-- gioi-thieu/page.tsx
|   |   |-- auth/*
|   |   |-- admin/*
|   |   `-- api
|   |       |-- auth/*
|   |       |-- events/*
|   |       |-- admin/*
|   |       `-- ai/*
|   |-- components
|   |   |-- admin/*
|   |   |-- ai/*
|   |   |-- auth/*
|   |   |-- events/*
|   |   |-- layout/*
|   |   |-- providers/*
|   |   `-- user/*
|   |-- lib
|   |   |-- supabase/*
|   |   |-- validation.ts
|   |   |-- auth.ts
|   |   |-- auth-flows.ts
|   |   |-- ai.ts
|   |   |-- events.ts
|   |   `-- ...
|   `-- types/contracts.ts
`-- supabase
    |-- config.toml
    |-- seed.sql
    |-- auth-templates/email-otp.html
    `-- migrations/202603030001_init.sql
```

## 8) API chinh

- Auth:
  - `POST /api/auth/captcha/new`
  - `POST /api/auth/captcha/verify`
  - `POST /api/auth/register`
  - `POST /api/auth/login-username`
  - `POST /api/auth/otp/send`
  - `POST /api/auth/otp/verify`
  - `POST /api/auth/password/forgot`
  - `POST /api/auth/password/reset`
- Events:
  - `GET /api/events/search`
  - `GET /api/events/[slug]`
  - `GET /api/events/id/[id]/related`
  - `POST/DELETE /api/events/id/[id]/favorite`
  - `POST /api/events/id/[id]/history`
  - `GET/POST /api/events/id/[id]/notes`
  - `POST /api/events/submissions`
- Admin:
  - `GET/POST /api/admin/events`
  - `GET/PATCH/DELETE /api/admin/events/[id]`
  - `POST /api/admin/events/import`
  - `GET /api/admin/events/export`
  - `GET/POST /api/admin/tags`
  - `DELETE /api/admin/tags/[id]`
  - `GET/POST /api/admin/sources`
  - `DELETE /api/admin/sources/[id]`
  - `GET/POST /api/admin/moderation`
  - `GET /api/admin/users`
  - `POST /api/admin/users/role`
  - `POST /api/admin/users/ban`
  - `GET/POST /api/admin/ip-ban`
  - `DELETE /api/admin/ip-ban/[id]`
- AI:
  - `POST /api/ai/summarize`
  - `POST /api/ai/ask`

## 9) Bao mat va van hanh

- RLS da bat cho cac bang trong `public`.
- Policy tach ro theo `user/moderator/admin`.
- Co co che rate limit co ban tai API auth/ai.
- Co chan IP qua bang `ip_bans`.
- API key/OTP xu ly qua ENV.

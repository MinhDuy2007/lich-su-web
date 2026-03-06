import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest
} from "next/server";

const protectedPathPrefixes = ["/admin", "/thu-vien", "/tai-khoan", "/profile"];
const protectedApiPrefixes = ["/api/admin", "/api/ai"];
const blockedPagePath = "/bi-cam-truy-cap";

function isProtectedPath(pathname: string) {
  return protectedPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedApi(pathname: string) {
  return protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isDirectNotFoundPath(pathname: string) {
  return pathname === "/not-found" || pathname === "/not-found/";
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function normalizeIpAddress(ip: string | null | undefined) {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  if (trimmed === "::1") {
    return "127.0.0.1";
  }
  if (trimmed.toLowerCase().startsWith("::ffff:")) {
    return trimmed.slice(7);
  }

  return trimmed;
}

function readClientIp(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  const xffCandidates = xff
    .split(",")
    .map((item) => normalizeIpAddress(item))
    .filter((item): item is string => Boolean(item));
  if (xffCandidates.length > 0) {
    return xffCandidates[0];
  }

  const headerCandidates = [
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("fly-client-ip"),
    request.headers.get("true-client-ip")
  ];

  for (const candidate of headerCandidates) {
    const normalized = normalizeIpAddress(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const requestIp = normalizeIpAddress((request as NextRequest & { ip?: string }).ip);
  if (requestIp) {
    return requestIp;
  }

  return null;
}

function canQuerySupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getSupabaseRestBaseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
}

function getSupabaseRestHeaders(withJsonBody = false) {
  const headers: Record<string, string> = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
  };

  if (withJsonBody) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=minimal";
  }

  return headers;
}

async function isIpBlocked(ip: string | null) {
  if (!ip || !canQuerySupabase()) {
    return false;
  }

  const url = `${getSupabaseRestBaseUrl()}/ip_bans?select=id&ip_address=eq.${encodeURIComponent(
    ip
  )}&is_active=eq.true&limit=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getSupabaseRestHeaders(),
      cache: "no-store"
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as Array<{ id: string }>;
    return data.length > 0;
  } catch {
    return false;
  }
}

async function isAccountBlocked(userId: string) {
  if (!canQuerySupabase()) {
    return false;
  }

  const url = `${getSupabaseRestBaseUrl()}/profiles?select=is_banned&user_id=eq.${encodeURIComponent(
    userId
  )}&limit=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getSupabaseRestHeaders(),
      cache: "no-store"
    });

    if (!response.ok) {
      return false;
    }

    const rows = (await response.json()) as Array<{ is_banned: boolean }>;
    return Boolean(rows[0]?.is_banned);
  } catch {
    return false;
  }
}

async function trackUserIpOnRequest(
  userId: string,
  ip: string | null,
  userAgent: string | null
) {
  if (!canQuerySupabase()) {
    return;
  }

  const normalizedIp = normalizeIpAddress(ip)?.slice(0, 64);
  if (!normalizedIp) {
    return;
  }

  const now = new Date().toISOString();
  const baseUrl = getSupabaseRestBaseUrl();

  try {
    const lookupUrl = `${baseUrl}/user_ip_logs?select=id,seen_count&user_id=eq.${encodeURIComponent(
      userId
    )}&ip_address=eq.${encodeURIComponent(normalizedIp)}&limit=1`;

    const lookupResponse = await fetch(lookupUrl, {
      method: "GET",
      headers: getSupabaseRestHeaders(),
      cache: "no-store"
    });

    if (!lookupResponse.ok) {
      return;
    }

    const rows = (await lookupResponse.json()) as Array<{
      id: string;
      seen_count: number | null;
    }>;

    if (rows.length > 0 && rows[0]?.id) {
      await fetch(`${baseUrl}/user_ip_logs?id=eq.${encodeURIComponent(rows[0].id)}`, {
        method: "PATCH",
        headers: getSupabaseRestHeaders(true),
        body: JSON.stringify({
          seen_count: (rows[0].seen_count ?? 0) + 1,
          last_seen_at: now,
          last_user_agent: userAgent
        }),
        cache: "no-store"
      });
      return;
    }

    await fetch(`${baseUrl}/user_ip_logs`, {
      method: "POST",
      headers: getSupabaseRestHeaders(true),
      body: JSON.stringify({
        user_id: userId,
        ip_address: normalizedIp,
        first_seen_at: now,
        last_seen_at: now,
        seen_count: 1,
        last_user_agent: userAgent
      }),
      cache: "no-store"
    });
  } catch {
    // Logging IP is best-effort and must not block user requests.
  }
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  const clientIp = readClientIp(request);

  if (isDirectNotFoundPath(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (pathname !== blockedPagePath) {
    const blockedByIp = await isIpBlocked(clientIp);
    if (blockedByIp) {
      if (isApiPath(pathname)) {
        return NextResponse.json(
          {
            success: false,
            message: "Địa chỉ IP của bạn đã bị chặn"
          },
          { status: 403 }
        );
      }

      const blockedUrl = request.nextUrl.clone();
      blockedUrl.pathname = blockedPagePath;
      blockedUrl.search = "";
      return NextResponse.redirect(blockedUrl);
    }
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as never);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && pathname !== blockedPagePath && (await isAccountBlocked(user.id))) {
    if (isApiPath(pathname)) {
        return NextResponse.json(
        {
          success: false,
          message: "Tài khoản của bạn đã bị khóa"
        },
        { status: 403 }
      );
    }

    const blockedUrl = request.nextUrl.clone();
    blockedUrl.pathname = blockedPagePath;
    blockedUrl.search = "";
    return NextResponse.redirect(blockedUrl);
  }

  if ((isProtectedPath(pathname) || isProtectedApi(pathname)) && !user) {
    if (isApiPath(pathname)) {
        return NextResponse.json(
        {
          success: false,
          message: "Cần đăng nhập"
        },
        { status: 401 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth/dang-nhap";
    return NextResponse.redirect(url);
  }

  if (user && pathname !== blockedPagePath) {
    event.waitUntil(
      trackUserIpOnRequest(user.id, clientIp, request.headers.get("user-agent"))
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$).*)"
  ]
};


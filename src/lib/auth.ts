import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { AppRole } from "@/lib/roles";

export async function getAuthUserFromRequest(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseRouteClient(request, response);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, response, supabase };
  }

  return { user, response, supabase };
}

export async function getUserRole(userId: string): Promise<AppRole | null> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as AppRole;
}

export async function requireRole(
  request: NextRequest,
  roles: AppRole[]
): Promise<{
  ok: boolean;
  status: number;
  userId?: string;
  role?: AppRole | null;
  response?: NextResponse;
}> {
  const { user, response } = await getAuthUserFromRequest(request);

  if (!user) {
    return { ok: false, status: 401 };
  }

  const role = await getUserRole(user.id);
  if (!role || !roles.includes(role)) {
    return { ok: false, status: 403 };
  }

  return { ok: true, status: 200, userId: user.id, role, response };
}


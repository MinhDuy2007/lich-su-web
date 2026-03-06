"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface UserItem {
  user_id: string;
  username: string;
  email: string;
  is_banned: boolean;
  role: "user" | "moderator" | "admin";
  lastIp: string | null;
  ipCount: number;
  sharedIpUsers: number;
}

interface IpBanItem {
  id: string;
  ip_address: string;
  reason: string | null;
  is_active: boolean;
}

interface IpGroupUser {
  userId: string;
  username: string;
  email: string;
  role: "user" | "moderator" | "admin";
  isBanned: boolean;
}

interface IpGroupItem {
  ipAddress: string;
  userCount: number;
  hasAdmin: boolean;
  users: IpGroupUser[];
}

const ROLE_LABEL: Record<UserItem["role"], string> = {
  user: "Thành viên",
  moderator: "Kiểm duyệt viên",
  admin: "Quản trị viên"
};

function formatIpLabel(ip: string | null) {
  if (!ip) return "Chưa ghi nhận";
  if (ip === "::1" || ip === "127.0.0.1") return "127.0.0.1 (localhost)";
  if (ip.toLowerCase().startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [ipAddress, setIpAddress] = useState("");
  const [ipReason, setIpReason] = useState("");
  const [ipBans, setIpBans] = useState<IpBanItem[]>([]);
  const [ipGroups, setIpGroups] = useState<IpGroupItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [banningIp, setBanningIp] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [usersRes, ipRes] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/ip-ban", { cache: "no-store" })
    ]);
    const usersPayload = await usersRes.json();
    const ipPayload = await ipRes.json();

    if (usersRes.ok && usersPayload.success) {
      setUsers(usersPayload.data.items ?? []);
      setIpGroups(usersPayload.data.ipGroups ?? []);
    }
    if (ipRes.ok && ipPayload.success) {
      setIpBans(ipPayload.data.items ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function updateRole(userId: string, role: UserItem["role"]) {
    const response = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Cập nhật vai trò thất bại");
      return;
    }
    toast.success("Đã cập nhật vai trò");
    await loadAll();
  }

  async function toggleBan(user: UserItem) {
    if (user.role === "admin") {
      toast.error("Không thể khóa tài khoản admin");
      return;
    }

    const response = await fetch("/api/admin/users/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.user_id,
        isBanned: !user.is_banned
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Cập nhật trạng thái thất bại");
      return;
    }
    toast.success("Đã cập nhật trạng thái tài khoản");
    await loadAll();
  }

  async function createIpBan(targetIpAddress: string, reason?: string) {
    setBanningIp(targetIpAddress);
    const response = await fetch("/api/admin/ip-ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipAddress: targetIpAddress,
        reason: reason?.trim() || undefined,
        isActive: true
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Chặn IP thất bại");
      setBanningIp(null);
      return;
    }

    toast.success(
      `Đã chặn IP ${targetIpAddress}${
        payload.data?.affectedUsers
          ? ` và khóa ${payload.data.affectedUsers} tài khoản liên quan`
          : ""
      }`
    );
    setIpAddress("");
    setIpReason("");
    setBanningIp(null);
    await loadAll();
  }

  async function createIpBanFromForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ipAddress.trim()) return;

    const normalizedIp = ipAddress.trim();
    const firstConfirm = window.confirm(
      `Xác nhận 1/2: Bạn muốn chặn IP ${normalizedIp} và khóa các tài khoản liên quan?`
    );
    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.prompt(
      `Xác nhận 2/2: Nhập lại chính xác IP ${normalizedIp} để tiếp tục.`
    );
    if ((secondConfirm ?? "").trim() !== normalizedIp) {
      toast.error("Xác nhận lần 2 không khớp. Đã hủy thao tác.");
      return;
    }

    await createIpBan(ipAddress.trim(), ipReason);
  }

  async function removeIpBan(id: string) {
    const response = await fetch(`/api/admin/ip-ban/${id}`, {
      method: "DELETE"
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Gỡ IP thất bại");
      return;
    }
    toast.success("Đã gỡ IP khỏi danh sách chặn");
    await loadAll();
  }

  async function handleClusterBan(ipGroup: IpGroupItem) {
    const firstConfirm = window.confirm(
      `Xác nhận 1/2: Bạn muốn chặn IP ${ipGroup.ipAddress} và khóa toàn bộ tài khoản liên quan?`
    );
    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.prompt(
      `Xác nhận 2/2: Nhập lại chính xác IP ${ipGroup.ipAddress} để tiếp tục.`
    );
    if ((secondConfirm ?? "").trim() !== ipGroup.ipAddress) {
      toast.error("Xác nhận lần 2 không khớp. Đã hủy thao tác.");
      return;
    }

    await createIpBan(ipGroup.ipAddress, "Chặn từ cụm IP trùng nhiều tài khoản");
  }

  const suspiciousGroups = useMemo(
    () => ipGroups.filter((group) => group.userCount >= 2),
    [ipGroups]
  );

  return (
    <div className="space-y-6">
      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Quản lý tài khoản</h2>
        {loading ? <p className="text-sm text-fg/65">Đang tải dữ liệu...</p> : null}
        <div className="space-y-3">
          {users.map((user) => (
            <article
              className="rounded-xl border border-border bg-card p-3"
              key={user.user_id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{user.username}</p>
                  <p className="text-xs text-fg/65">{user.email}</p>
                  <p className="mt-1 text-xs text-fg/60">
                    IP gần nhất: {formatIpLabel(user.lastIp)}
                    {user.lastIp ? ` | Trùng IP: ${user.sharedIpUsers} tài khoản` : ""}
                    {` | Đã dùng ${user.ipCount} IP`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-9 rounded-lg border border-border bg-bg px-2 text-xs"
                    onChange={(event) =>
                      void updateRole(user.user_id, event.target.value as UserItem["role"])
                    }
                    value={user.role}
                  >
                    <option value="user">Người dùng</option>
                    <option value="moderator">Kiểm duyệt viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                  <button
                    className="rounded-lg border border-red-400 px-3 py-1 text-xs text-red-500 disabled:opacity-50"
                    disabled={user.role === "admin"}
                    onClick={() => void toggleBan(user)}
                    type="button"
                  >
                    {user.is_banned ? "Mở khóa" : "Khóa"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Cụm IP trùng nhiều tài khoản</h2>
        {suspiciousGroups.length === 0 ? (
          <p className="text-sm text-fg/65">Chưa phát hiện cụm IP đáng ngờ.</p>
        ) : (
          <div className="space-y-3">
            {suspiciousGroups.map((group) => (
              <article className="rounded-xl border border-border bg-card p-4" key={group.ipAddress}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{group.ipAddress}</p>
                    <p className="text-xs text-fg/65">
                      {group.userCount} tài khoản {group.hasAdmin ? "(có admin, không thể chặn)" : ""}
                    </p>
                  </div>
                  <button
                    className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-50"
                    disabled={group.hasAdmin || banningIp === group.ipAddress}
                    onClick={() => void handleClusterBan(group)}
                    type="button"
                  >
                    {banningIp === group.ipAddress
                      ? "Đang chặn..."
                      : "Chặn IP + khóa hàng loạt"}
                  </button>
                </div>
                <ul className="mt-3 grid gap-2 md:grid-cols-2">
                  {group.users.map((user) => (
                    <li className="rounded-lg border border-border bg-bg px-3 py-2 text-xs" key={user.userId}>
                      @{user.username} ({ROLE_LABEL[user.role]})
                      {user.isBanned ? " - đã khóa" : ""}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Chặn IP thủ công</h2>
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]" onSubmit={createIpBanFromForm}>
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setIpAddress(event.target.value)}
            placeholder="192.168.1.1"
            required
            value={ipAddress}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setIpReason(event.target.value)}
            placeholder="Lý do"
            value={ipReason}
          />
          <button
            className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
            type="submit"
          >
            Chặn
          </button>
        </form>
        <ul className="space-y-2">
          {ipBans.map((item) => (
            <li
              className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
              key={item.id}
            >
              <p className="text-sm">
                {item.ip_address}
                {item.reason ? ` - ${item.reason}` : ""}
              </p>
              <button
                className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500"
                onClick={() => void removeIpBan(item.id)}
                type="button"
              >
                Gỡ chặn
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UserItem {
  user_id: string;
  username: string;
  email: string;
  is_banned: boolean;
  role: "user" | "moderator" | "admin";
}

interface IpBanItem {
  id: string;
  ip_address: string;
  reason: string | null;
  is_active: boolean;
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [ipAddress, setIpAddress] = useState("");
  const [ipReason, setIpReason] = useState("");
  const [ipBans, setIpBans] = useState<IpBanItem[]>([]);

  async function loadAll() {
    const [usersRes, ipRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/ip-ban")
    ]);
    const usersPayload = await usersRes.json();
    const ipPayload = await ipRes.json();

    if (usersRes.ok && usersPayload.success) {
      setUsers(usersPayload.data.items);
    }
    if (ipRes.ok && ipPayload.success) {
      setIpBans(ipPayload.data.items);
    }
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
      toast.error(payload.message ?? "Cap nhat role that bai");
      return;
    }
    toast.success("Da cap nhat role");
    await loadAll();
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    const response = await fetch("/api/admin/users/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        isBanned
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Cap nhat trang thai that bai");
      return;
    }
    toast.success("Da cap nhat trang thai tai khoan");
    await loadAll();
  }

  async function createIpBan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/ip-ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipAddress,
        reason: ipReason,
        isActive: true
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Chan IP that bai");
      return;
    }
    toast.success("Da them IP vao danh sach chan");
    setIpAddress("");
    setIpReason("");
    await loadAll();
  }

  async function removeIpBan(id: string) {
    const response = await fetch(`/api/admin/ip-ban/${id}`, {
      method: "DELETE"
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Xoa IP that bai");
      return;
    }
    toast.success("Da go IP khoi danh sach chan");
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Quan ly tai khoan</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <article
              className="rounded-xl border border-border bg-card p-3"
              key={user.user_id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{user.username}</p>
                  <p className="text-xs text-fg/65">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-9 rounded-lg border border-border bg-bg px-2 text-xs"
                    onChange={(event) =>
                      void updateRole(user.user_id, event.target.value as UserItem["role"])
                    }
                    value={user.role}
                  >
                    <option value="user">user</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    className="rounded-lg border border-red-400 px-3 py-1 text-xs text-red-500"
                    onClick={() => void toggleBan(user.user_id, !user.is_banned)}
                    type="button"
                  >
                    {user.is_banned ? "Mo khoa" : "Khoa"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Chan IP</h2>
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]" onSubmit={createIpBan}>
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
            placeholder="Ly do"
            value={ipReason}
          />
          <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg" type="submit">
            Chan
          </button>
        </form>
        <ul className="space-y-2">
          {ipBans.map((item) => (
            <li className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2" key={item.id}>
              <p className="text-sm">
                {item.ip_address}
                {item.reason ? ` - ${item.reason}` : ""}
              </p>
              <button
                className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500"
                onClick={() => void removeIpBan(item.id)}
                type="button"
              >
                Go chan
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}


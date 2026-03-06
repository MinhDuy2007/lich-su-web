"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AccountProfileFormProps {
  initialData: {
    username: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    bookmarkCount: number;
    contributionCount: number;
  };
}

interface ApiPayload {
  success?: boolean;
  message?: string;
  details?: unknown;
  data?: {
    username: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    bookmarkCount: number;
    contributionCount: number;
  };
}

async function parseApiPayload(response: Response): Promise<ApiPayload> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiPayload;
  } catch {
    return { message: text };
  }
}

function formatApiMessage(payload: ApiPayload, fallback: string) {
  const detail = typeof payload.details === "string" ? `: ${payload.details}` : "";
  return `${payload.message ?? fallback}${detail}`;
}

export function AccountProfileForm({ initialData }: AccountProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialData.display_name);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url);
  const [bookmarkCount, setBookmarkCount] = useState(initialData.bookmarkCount);
  const [contributionCount, setContributionCount] = useState(
    initialData.contributionCount
  );
  const [loading, setLoading] = useState(false);

  const joinDate = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(initialData.created_at));
  }, [initialData.created_at]);

  function onPickAvatar(file: File | null) {
    setAvatarFile(file);
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const body = new FormData();
      body.set("displayName", displayName);
      if (avatarFile) {
        body.set("avatar", avatarFile);
      }

      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        body
      });
      const payload = await parseApiPayload(response);
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(formatApiMessage(payload, "Không cập nhật được hồ sơ"));
      }

      setDisplayName(payload.data.display_name);
      setAvatarUrl(payload.data.avatar_url);
      setBookmarkCount(payload.data.bookmarkCount);
      setContributionCount(payload.data.contributionCount);
      setAvatarFile(null);
      toast.success("Đã cập nhật hồ sơ");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-semibold">Thông tin tài khoản</h2>
      <p className="mt-1 text-sm text-fg/65">
        Bạn có thể cập nhật tên hiển thị và ảnh đại diện.
      </p>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border bg-card">
            {avatarUrl ? (
              <Image
                alt="Ảnh đại diện"
                className="object-cover"
                fill
                sizes="80px"
                src={avatarUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-fg/60">
                Chưa có ảnh đại diện
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Ảnh đại diện</label>
            <input
              accept="image/*"
              className="block w-full text-sm text-fg/80 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-fg"
              onChange={(event) => onPickAvatar(event.target.files?.[0] ?? null)}
              type="file"
            />
            <p className="text-xs text-fg/60">Tối đa 2MB, chỉ nhận tệp ảnh.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Tên hiển thị</label>
            <input
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input
              className="h-11 w-full cursor-not-allowed rounded-xl border border-border bg-muted px-3 text-sm text-fg/70"
              disabled
              value={initialData.username}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              className="h-11 w-full cursor-not-allowed rounded-xl border border-border bg-muted px-3 text-sm text-fg/70"
              disabled
              value={initialData.email}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ngày tham gia</label>
            <input
              className="h-11 w-full cursor-not-allowed rounded-xl border border-border bg-muted px-3 text-sm text-fg/70"
              disabled
              value={joinDate}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-fg/65">Sự kiện đã lưu</p>
            <p className="mt-1 text-2xl font-semibold text-primary">{bookmarkCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-fg/65">Đóng góp đã duyệt</p>
            <p className="mt-1 text-2xl font-semibold text-primary">{contributionCount}</p>
          </div>
        </div>

        <button
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Đang cập nhật..." : "Lưu thay đổi"}
        </button>
      </form>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface FollowEventButtonProps {
  eventId: string;
  className?: string;
}

export function FollowEventButton({ eventId, className }: FollowEventButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        const response = await fetch(`/api/events/id/${eventId}/follow`, {
          method: "GET"
        });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success) {
          setIsFollowing(Boolean(payload.data.isFollowing));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function handleToggle() {
    if (saving || loading) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/events/id/${eventId}/follow`, {
        method: isFollowing ? "DELETE" : "POST"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được theo dõi");
      }
      const nextValue = Boolean(payload.data.isFollowing);
      setIsFollowing(nextValue);
      toast.success(nextValue ? "Đã theo dõi bài viết" : "Đã bỏ theo dõi bài viết");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
        isFollowing
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-fg/80 hover:border-primary/40 hover:text-primary",
        className
      )}
      disabled={loading || saving}
      onClick={() => void handleToggle()}
      type="button"
    >
      <Bell className="h-4 w-4" />
      {loading ? "Đang tải..." : isFollowing ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}

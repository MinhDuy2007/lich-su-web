"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { CornerDownRight, Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmPopup } from "@/components/ui/confirm-popup";
import { cn } from "@/lib/cn";

interface CommentAuthor {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "moderator" | "admin";
  roleLabel: string;
}

interface EventCommentItem {
  id: string;
  eventId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  canDelete: boolean;
  author: CommentAuthor;
}

interface EventCommentsProps {
  eventId: string;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function roleClass(role: "user" | "moderator" | "admin") {
  if (role === "admin") {
    return "border-rose-300 bg-rose-500/10 text-rose-500";
  }
  if (role === "moderator") {
    return "border-emerald-300 bg-emerald-500/10 text-emerald-500";
  }
  return "border-slate-300 bg-slate-500/10 text-slate-500";
}

export function EventComments({ eventId }: EventCommentsProps) {
  const [items, setItems] = useState<EventCommentItem[]>([]);
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingIds, setLikingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const { confirm, confirmPopup } = useConfirmPopup();

  const totalLabel = useMemo(() => {
    if (items.length === 0) return "Chưa có bình luận";
    if (items.length === 1) return "1 bình luận";
    return `${items.length} bình luận`;
  }, [items.length]);

  const commentsTree = useMemo(() => {
    const idSet = new Set(items.map((item) => item.id));
    const grouped = new Map<string | null, EventCommentItem[]>();

    items.forEach((item) => {
      const parentKey = item.parentId && idSet.has(item.parentId) ? item.parentId : null;
      const list = grouped.get(parentKey) ?? [];
      list.push(item);
      grouped.set(parentKey, list);
    });

    grouped.forEach((list, parentId) => {
      const sorted = [...list].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        if (parentId === null) {
          return bTime - aTime;
        }
        return aTime - bTime;
      });
      grouped.set(parentId, sorted);
    });

    return grouped;
  }, [items]);

  async function loadComments() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/events/id/${eventId}/comments`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không tải được bình luận");
      }
      setItems(payload.data.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function submitComment(nextContent: string, parentId: string | null) {
    if (!nextContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/id/${eventId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent.trim(), parentId })
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không gửi được bình luận");
      }

      setContent("");
      setReplyContent("");
      setReplyTargetId(null);
      toast.success(parentId ? "Đã gửi phản hồi" : "Đã gửi bình luận");
      await loadComments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEnterSubmit(
    event: KeyboardEvent<HTMLTextAreaElement>,
    nextContent: string,
    parentId: string | null
  ) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (isSubmitting || nextContent.trim().length === 0) {
      return;
    }
    void submitComment(nextContent, parentId);
  }

  async function toggleLike(commentId: string) {
    if (likingIds.includes(commentId)) return;
    setLikingIds((prev) => [...prev, commentId]);
    try {
      const response = await fetch(
        `/api/events/id/${eventId}/comments/${commentId}/like`,
        {
          method: "POST"
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được lượt thích");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === commentId
            ? {
                ...item,
                isLiked: Boolean(payload.data.isLiked),
                likeCount: Number(payload.data.likeCount ?? 0)
              }
            : item
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLikingIds((prev) => prev.filter((id) => id !== commentId));
    }
  }

  async function deleteComment(commentId: string) {
    if (deletingIds.includes(commentId)) return;
    const accepted = await confirm({
      title: "Xóa bình luận",
      message: "Bạn có chắc muốn xóa bình luận này?",
      confirmLabel: "Xóa",
      destructive: true
    });
    if (!accepted) return;

    setDeletingIds((prev) => [...prev, commentId]);
    try {
      const response = await fetch(`/api/events/id/${eventId}/comments/${commentId}`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không xóa được bình luận");
      }

      toast.success("Đã xóa bình luận");
      await loadComments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== commentId));
    }
  }

  function renderComment(item: EventCommentItem, depth = 0) {
    const children = commentsTree.get(item.id) ?? [];
    const isReplying = replyTargetId === item.id;

    return (
      <li className={cn(depth > 0 ? "ml-6 border-l border-border/70 pl-4" : "")} key={item.id}>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            {item.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={item.author.displayName}
                className="h-10 w-10 rounded-full border border-border object-cover"
                loading="lazy"
                src={item.author.avatarUrl}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-fg/70">
                {item.author.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{item.author.displayName}</p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    roleClass(item.author.role)
                  )}
                >
                  {item.author.roleLabel}
                </span>
                <p className="text-xs text-fg/55">@{item.author.username}</p>
              </div>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-fg/85">{item.content}</p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold transition",
                    item.isLiked ? "text-rose-500" : "text-fg/65 hover:text-rose-500"
                  )}
                  onClick={() => void toggleLike(item.id)}
                  type="button"
                >
                  <Heart className={cn("h-3.5 w-3.5", item.isLiked ? "fill-current" : "")} />
                  {item.likeCount}
                </button>

                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold text-fg/70 transition hover:text-primary"
                  onClick={() => {
                    if (replyTargetId === item.id) {
                      setReplyTargetId(null);
                      setReplyContent("");
                    } else {
                      setReplyTargetId(item.id);
                      setReplyContent("");
                    }
                  }}
                  type="button"
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                  Phản hồi
                </button>

                {item.canDelete ? (
                  <button
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 transition hover:brightness-110"
                    onClick={() => void deleteComment(item.id)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingIds.includes(item.id) ? "Đang xóa..." : "Xóa"}
                  </button>
                ) : null}

                <p className="text-xs text-fg/55">{formatDateLabel(item.createdAt)}</p>
              </div>

              {isReplying ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitComment(replyContent, item.id);
                  }}
                >
                  <textarea
                    className="h-20 w-full rounded-xl border border-border bg-bg p-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
                    maxLength={2000}
                    onChange={(event) => setReplyContent(event.target.value)}
                    onKeyDown={(event) => handleEnterSubmit(event, replyContent, item.id)}
                    placeholder="Nhập phản hồi của bạn..."
                    value={replyContent}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg/70"
                      onClick={() => {
                        setReplyTargetId(null);
                        setReplyContent("");
                      }}
                      type="button"
                    >
                      Hủy
                    </button>
                    <button
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
                      disabled={isSubmitting || replyContent.trim().length === 0}
                      type="submit"
                    >
                      {isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>

        {children.length > 0 ? <ul className="mt-2 space-y-2">{children.map((child) => renderComment(child, depth + 1))}</ul> : null}
      </li>
    );
  }

  return (
    <section className="card-glass rounded-2xl p-5">
      {confirmPopup}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
          <MessageCircle className="h-5 w-5 text-primary" />
          Bình luận
        </h3>
        <p className="text-xs text-fg/65">{totalLabel}</p>
      </div>

      <form
        className="mb-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submitComment(content, null);
        }}
      >
        <textarea
          className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          maxLength={2000}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => handleEnterSubmit(event, content, null)}
          placeholder="Viết bình luận của bạn..."
          value={content}
        />
        <div className="flex justify-end">
          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
            disabled={isSubmitting || content.trim().length === 0}
            type="submit"
          >
            {isSubmitting ? "Đang gửi..." : "Gửi bình luận"}
          </button>
        </div>
      </form>

      {isLoading ? <p className="text-sm text-fg/65">Đang tải bình luận...</p> : null}

      {!isLoading && items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-fg/70">
          Chưa có bình luận nào. Hãy để lại phản hồi đầu tiên.
        </p>
      ) : null}

      <ul className="space-y-3">{(commentsTree.get(null) ?? []).map((item) => renderComment(item, 0))}</ul>
    </section>
  );
}

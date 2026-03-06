"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookText, CalendarDays, Files, Link2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { EventComments } from "@/components/events/event-comments";
import { EventReportAction } from "@/components/events/event-report-action";
import { FollowEventButton } from "@/components/events/follow-event-button";
import { PersonalActions } from "@/components/events/personal-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import type { EventDTO } from "@/types/contracts";

interface EventDetailTabsProps {
  event: EventDTO;
  initialSummary: string | null;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Chưa rõ";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function toTimeline(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "Chưa rõ mốc thời gian";
  }
  if (startDate && endDate) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  }
  if (startDate) {
    return `Từ ${formatDateLabel(startDate)}`;
  }

  return `Đến ${formatDateLabel(endDate)}`;
}

function contentLooksLikeHtml(input: string) {
  return /<[^>]+>/.test(input);
}

function contentLength(input: string) {
  return input.replace(/<[^>]+>/g, " ").trim().length;
}

const panelAnimation = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: "easeOut" as const }
};

export function EventDetailTabs({ event, initialSummary }: EventDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("bai-viet");
  const [summarizeSignal, setSummarizeSignal] = useState(0);
  const [expandedArticle, setExpandedArticle] = useState(false);

  const timeline = useMemo(
    () => toTimeline(event.startDate, event.endDate),
    [event.startDate, event.endDate]
  );
  const richContent = contentLooksLikeHtml(event.content);
  const needsCollapse = contentLength(event.content) > 1800;

  async function onShare() {
    const shareUrl = window.location.href;
    const shareTitle = event.title;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: "Xem chi tiết sự kiện lịch sử",
          url: shareUrl
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép liên kết");
    } catch {
      toast.error("Không thể chia sẻ liên kết");
    }
  }

  function onQuickSummary() {
    setActiveTab("tro-chuyen-ai");
    setSummarizeSignal((prev) => prev + 1);
  }

  return (
    <section className="space-y-6">
      <header className="card-glass rounded-2xl p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-sm leading-7 text-fg/75">{event.summary}</p>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-fg/75 md:grid-cols-3">
          <p className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {timeline}
          </p>
          <p className="inline-flex items-center gap-2">
            <BookText className="h-4 w-4 text-primary" />
            {event.eventType ?? "Khác"}
          </p>
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {event.locationText ?? "Chưa rõ địa điểm"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span
              className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <PersonalActions className="h-10" eventId={event.id} mode="compact" />
          <FollowEventButton eventId={event.id} />
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-fg/80 transition hover:border-primary/40 hover:text-primary"
            onClick={() => void onShare()}
            type="button"
          >
            <Link2 className="h-4 w-4" />
            Chia sẻ
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-105"
            onClick={onQuickSummary}
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            Tóm tắt nhanh
          </button>
        </div>
      </header>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="bai-viet">Bài viết</TabsTrigger>
          <TabsTrigger value="tro-chuyen-ai">Trò chuyện với AI</TabsTrigger>
          <TabsTrigger value="tai-lieu-nguon">Tài liệu &amp; nguồn</TabsTrigger>
        </TabsList>

        <TabsContent value="bai-viet">
          <motion.div {...panelAnimation} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <div className="space-y-4">
                <EventReportAction eventId={event.id} />
                <article className="card-glass rounded-2xl p-6 text-sm leading-7 text-fg/85">
                  <div
                    className={cn(
                      "relative",
                      needsCollapse && !expandedArticle ? "max-h-[560px] overflow-hidden" : ""
                    )}
                  >
                    {richContent ? (
                      <div
                        className="rich-content"
                        dangerouslySetInnerHTML={{ __html: event.content }}
                      />
                    ) : (
                      <p className="whitespace-pre-line">{event.content}</p>
                    )}

                    {needsCollapse && !expandedArticle ? (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
                    ) : null}
                  </div>

                  {needsCollapse ? (
                    <div className="mt-4">
                      <button
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg/75 transition hover:border-primary/40 hover:text-primary"
                        onClick={() => setExpandedArticle((prev) => !prev)}
                        type="button"
                      >
                        {expandedArticle ? "Thu gọn" : "Xem thêm"}
                      </button>
                    </div>
                  ) : null}
                </article>
                <EventReportAction eventId={event.id} />
              </div>

              <PersonalActions eventId={event.id} />
            </div>

            <EventComments eventId={event.id} />
          </motion.div>
        </TabsContent>

        <TabsContent value="tro-chuyen-ai">
          <motion.div {...panelAnimation}>
            <AiAssistantPanel
              autoSummarizeSignal={summarizeSignal}
              eventId={event.id}
              initialSummary={initialSummary}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="tai-lieu-nguon">
          <motion.div {...panelAnimation} className="card-glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Tài liệu tham khảo</h2>
            {event.sources.length === 0 ? (
              <p className="mt-3 text-sm text-fg/75">
                Chưa có nguồn đính kèm cho sự kiện này.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {event.sources.map((source) => (
                  <li className="rounded-xl border border-border bg-card p-3" key={source.id}>
                    <p className="text-sm font-semibold text-fg">{source.name}</p>
                    {source.url ? (
                      <a
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <Files className="h-3.5 w-3.5" />
                        Mở tài liệu
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-fg/65">
                        Nguồn này chưa có liên kết trực tiếp.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

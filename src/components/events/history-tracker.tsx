"use client";

import { useEffect } from "react";

export function HistoryTracker({ eventId }: { eventId: string }) {
  useEffect(() => {
    void fetch(`/api/events/id/${eventId}/history`, {
      method: "POST"
    });
  }, [eventId]);

  return null;
}

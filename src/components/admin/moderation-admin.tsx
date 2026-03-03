"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SubmissionItem {
  id: string;
  title: string;
  summary: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function ModerationAdmin() {
  const [items, setItems] = useState<SubmissionItem[]>([]);

  async function loadItems() {
    const response = await fetch("/api/admin/moderation");
    const payload = await response.json();
    if (response.ok && payload.success) {
      setItems(payload.data.items);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleAction(submissionId: string, action: "approve" | "reject") {
    const response = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        action
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Xu ly kiem duyet that bai");
      return;
    }
    toast.success(`Da ${action === "approve" ? "duyet" : "tu choi"} de xuat`);
    await loadItems();
  }

  return (
    <section className="card-glass rounded-2xl p-5">
      <h2 className="mb-4 text-lg font-semibold">Danh sach de xuat su kien</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li className="rounded-xl border border-border bg-card p-4" key={item.id}>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-fg/70">{item.summary}</p>
            <p className="mt-1 text-xs text-fg/60">Trang thai: {item.status}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-fg"
                onClick={() => void handleAction(item.id, "approve")}
                type="button"
              >
                Duyet
              </button>
              <button
                className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500"
                onClick={() => void handleAction(item.id, "reject")}
                type="button"
              >
                Tu choi
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-sm text-fg/60">Khong co de xuat nao.</li>
        ) : null}
      </ul>
    </section>
  );
}


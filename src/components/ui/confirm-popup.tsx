"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

interface ConfirmPopupOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmPopupState extends ConfirmPopupOptions {
  resolve: (value: boolean) => void;
}

interface PopupProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmPopupDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel
}: PopupProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        aria-label="Đóng hộp thoại xác nhận"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onCancel}
        type="button"
      />

      <section
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-border bg-bg p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
              destructive
                ? "border-red-400/60 bg-red-500/10 text-red-500"
                : "border-primary/50 bg-primary/10 text-primary"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>

          <div className="space-y-1">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm leading-6 text-fg/80">{message}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-fg/75 transition hover:border-primary/35 hover:text-primary"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110",
              destructive ? "bg-red-500" : "bg-primary"
            )}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function useConfirmPopup() {
  const [state, setState] = useState<ConfirmPopupState | null>(null);

  const confirm = useCallback((options: ConfirmPopupOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        title: options.title ?? "Xác nhận thao tác",
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Đồng ý",
        cancelLabel: options.cancelLabel ?? "Hủy",
        destructive: options.destructive ?? false,
        resolve
      });
    });
  }, []);

  const closeDialog = useCallback((result: boolean) => {
    setState((prev) => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  const confirmPopup = useMemo(
    () => (
      <ConfirmPopupDialog
        cancelLabel={state?.cancelLabel ?? "Hủy"}
        confirmLabel={state?.confirmLabel ?? "Đồng ý"}
        destructive={Boolean(state?.destructive)}
        message={state?.message ?? ""}
        onCancel={() => closeDialog(false)}
        onConfirm={() => closeDialog(true)}
        open={Boolean(state)}
        title={state?.title ?? "Xác nhận thao tác"}
      />
    ),
    [closeDialog, state]
  );

  return {
    confirm,
    confirmPopup
  };
}


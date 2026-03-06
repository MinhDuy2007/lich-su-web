"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  SeparatorHorizontal,
  Underline as UnderlineIcon,
  Columns2,
  LayoutGrid
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface RichEventEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
}

interface UploadEnvelope {
  success: boolean;
  message?: string;
  data?: {
    url: string;
  };
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeContentForEditor(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "<p></p>";
  }
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br/>")}</p>`)
    .join("");
}

function extractApiMessage(payload: UploadEnvelope | null, status: number) {
  if (payload?.message && payload.message.trim()) {
    return payload.message;
  }
  return `Không thể tải ảnh lên (HTTP ${status})`;
}

export function RichEventEditor({ value, onChange, disabled = false }: RichEventEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedContent = useMemo(() => normalizeContentForEditor(value), [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      Underline,
      Image.configure({
        inline: false,
        allowBase64: false
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Viết nội dung sự kiện tại đây..."
      })
    ],
    content: normalizedContent,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-sm max-w-none min-h-[260px] rounded-b-2xl border border-border border-t-0 bg-card px-4 py-4 text-fg outline-none"
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML().trim();
    const incoming = normalizedContent.trim();
    if (current === incoming) {
      return;
    }

    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, normalizedContent]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.set("image", file);

    const response = await fetch("/api/admin/events/upload-image", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json().catch(() => null)) as UploadEnvelope | null;
    if (!response.ok || !payload?.success || !payload.data?.url) {
      throw new Error(extractApiMessage(payload, response.status));
    }

    return payload.data.url;
  }

  async function insertUploadedFiles(files: FileList | File[] | null) {
    if (!editor || !files || files.length === 0) {
      return;
    }

    const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (validFiles.length === 0) {
      toast.error("Chỉ chấp nhận tệp ảnh");
      return;
    }

    try {
      for (const file of validFiles) {
        const url = await uploadImage(file);
        editor
          .chain()
          .focus()
          .setImage({
            src: url,
            alt: file.name
          })
          .run();
      }
      toast.success("Đã chèn ảnh vào nội dung");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể chèn ảnh");
    }
  }

  function onPickImage() {
    fileInputRef.current?.click();
  }

  function onInsertSideBySideLayout() {
    if (!editor) {
      return;
    }
    editor
      .chain()
      .focus()
      .insertTable({ rows: 1, cols: 2, withHeaderRow: false })
      .run();
    toast.message("Đã chèn bố cục 2 cột. Hãy đặt ảnh ở một cột và nội dung ở cột còn lại.");
  }

  function onInsertGalleryLayout() {
    if (!editor) {
      return;
    }
    editor
      .chain()
      .focus()
      .insertTable({ rows: 1, cols: 3, withHeaderRow: false })
      .run();
    toast.message("Đã chèn khung gallery 3 cột. Bạn có thể tải ảnh vào từng ô.");
  }

  function ToolbarButton({
    onClick,
    active,
    label,
    children
  }: {
    onClick: () => void;
    active?: boolean;
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg/80 transition hover:border-primary/45 hover:text-primary",
          active ? "border-primary bg-primary/10 text-primary" : ""
        )}
        onClick={onClick}
        title={label}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-card/70">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <ToolbarButton
          active={editor?.isActive("heading", { level: 2 })}
          label="Tiêu đề lớn"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("heading", { level: 3 })}
          label="Tiêu đề nhỏ"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="text-xs font-semibold">H3</span>
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("bold")}
          label="In đậm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("italic")}
          label="In nghiêng"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("underline")}
          label="Gạch chân"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("bulletList")}
          label="Danh sách dấu chấm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("orderedList")}
          label="Danh sách số"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive("blockquote")}
          label="Trích dẫn"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Đường ngăn cách"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <SeparatorHorizontal className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Tải ảnh lên" onClick={onPickImage}>
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Bố cục ảnh + chữ" onClick={onInsertSideBySideLayout}>
          <Columns2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Gallery 3 cột" onClick={onInsertGalleryLayout}>
          <LayoutGrid className="h-4 w-4" />
        </ToolbarButton>

        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => void insertUploadedFiles(event.target.files)}
          ref={fileInputRef}
          type="file"
        />
      </div>

      <div
        className="rounded-b-2xl"
        onDrop={(event) => {
          event.preventDefault();
          void insertUploadedFiles(event.dataTransfer?.files ?? null);
        }}
        onDragOver={(event) => event.preventDefault()}
        onPaste={(event) => {
          const files = event.clipboardData?.files;
          if (!files || files.length === 0) {
            return;
          }
          event.preventDefault();
          void insertUploadedFiles(files);
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}

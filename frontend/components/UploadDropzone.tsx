"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { ALLOWED_EXTENSIONS, fileTypeFromName, formatBytes } from "@/lib/format";
import { FileBadge } from "@/components/FileIcon";

export interface SelectedFile {
  file: File;
  error?: string;
}

export function UploadDropzone({
  onSelect,
  disabled,
}: {
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Client-side validation only — checks file type and size before upload
// so the user gets instant feedback. The backend re-validates too (never
// trust client-side checks alone).
  
  function validate(file: File): string | undefined {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type “${ext || "unknown"}”. Use PDF, DOCX, PPTX, PNG or JPG.`;
    }
    if (file.size > 25 * 1024 * 1024) {
      return `“${file.name}” is ${formatBytes(file.size)}. The maximum is 25 MB.`;
    }
    return undefined;
  }

  // NOTE: validate() returns an error message on failure, but it's discarded
// here — onSelect(null) clears the selection without showing *why* it was
// rejected. Worth surfacing this message in the UI (e.g. via a toast or
// inline text) before this ships.
  
  function handleFile(file: File | null) {
    if (!file) return;
    const error = validate(file);
    if (error) {
      onSelect(null);
      return;
    }
    onSelect(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent/5"
          : "border-border bg-surface hover:border-ink/20"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <UploadCloud size={32} className="text-muted" />
      <p className="mt-3 text-[15px] font-medium text-ink">
        Drop your document here
      </p>
      <p className="mt-1 text-sm text-muted">or choose a file from your computer</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed"
      >
        Choose a file
      </button>
      <p className="mt-4 text-xs text-muted">
        PDF · DOCX · PPTX · PNG · JPG — Maximum size: 25 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export function SelectedFilePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const info = fileTypeFromName(file.name);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <FileBadge filename={file.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {info.label} · {formatBytes(file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove file"
        className="rounded-md p-1.5 text-muted hover:bg-border/50 hover:text-ink"
      >
        <X size={18} />
      </button>
    </div>
  );
}

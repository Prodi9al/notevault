import type { Category } from "@/lib/api";

export interface FileTypeInfo {
  kind: "pdf" | "docx" | "pptx" | "image" | "other";
  label: string;
}

const EXT_MAP: Record<string, FileTypeInfo> = {
  ".pdf": { kind: "pdf", label: "PDF" },
  ".docx": { kind: "docx", label: "DOCX" },
  ".doc": { kind: "docx", label: "DOC" },
  ".pptx": { kind: "pptx", label: "PPTX" },
  ".ppt": { kind: "pptx", label: "PPT" },
  ".png": { kind: "image", label: "PNG" },
  ".jpg": { kind: "image", label: "JPG" },
  ".jpeg": { kind: "image", label: "JPG" },
};

export function fileTypeFromName(filename: string): FileTypeInfo {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXT_MAP[ext] ?? { kind: "other", label: "FILE" };
}

export function fileTypeFromContentType(contentType: string): FileTypeInfo {
  if (contentType.includes("pdf")) return { kind: "pdf", label: "PDF" };
  if (contentType.includes("word")) return { kind: "docx", label: "DOCX" };
  if (contentType.includes("presentation")) return { kind: "pptx", label: "PPTX" };
  if (contentType.startsWith("image/")) return { kind: "image", label: "IMG" };
  return { kind: "other", label: "FILE" };
}

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".png", ".jpg"];
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function relativeDate(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} weeks ago`;
  return formatDate(iso);
}

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  notes: "Lecture notes, summaries and revision guides.",
  past_questions: "Previous exam papers and test questions.",
  slides: "Lecture slides and presentation decks.",
  other: "Syllabi, reading lists and other materials.",
};

import { FileText, Image as ImageIcon, Presentation } from "lucide-react";
import { fileTypeFromContentType, fileTypeFromName, type FileTypeInfo } from "@/lib/format";

const KIND_STYLES: Record<FileTypeInfo["kind"], string> = {
  pdf: "bg-danger/10 text-danger",
  docx: "bg-accent/10 text-accent-dark",
  pptx: "bg-amber-100 text-amber-700",
  image: "bg-success/10 text-success",
  other: "bg-border text-muted",
};

function KindIcon({ kind }: { kind: FileTypeInfo["kind"] }) {
  if (kind === "pdf" || kind === "docx") return <FileText size={15} />;
  if (kind === "pptx") return <Presentation size={15} />;
  if (kind === "image") return <ImageIcon size={15} />;
  return <FileText size={15} />;
}

export function FileBadge({
  filename,
  contentType,
  size = "md",
}: {
  filename?: string;
  contentType?: string;
  size?: "sm" | "md";
}) {
  const info = filename
    ? fileTypeFromName(filename)
    : contentType
      ? fileTypeFromContentType(contentType)
      : { kind: "other" as const, label: "FILE" };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold uppercase tracking-wide ${
        KIND_STYLES[info.kind]
      } ${size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"}`}
    >
      <KindIcon kind={info.kind} />
      {info.label}
    </span>
  );
}

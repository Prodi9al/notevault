import Link from "next/link";
import type { DocumentItem } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api";
import { FileBadge } from "@/components/FileIcon";
import { formatBytes, relativeDate } from "@/lib/format";

export function DocumentRow({ doc }: { doc: DocumentItem }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border px-2 py-3.5 transition-colors hover:bg-surface sm:grid-cols-[auto_1fr_120px_120px_80px]"
    >
      <FileBadge filename={doc.s3_key} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium text-ink">{doc.title}</p>
        <p className="mt-0.5 text-sm font-medium text-accent-dark">{doc.course_code}</p>
      </div>
      <span className="hidden text-sm text-muted sm:block">
        {CATEGORY_LABELS[doc.category]}
      </span>
      <span className="hidden text-sm text-muted sm:block">
        {relativeDate(doc.created_at)}
      </span>
      <span className="text-right text-sm text-muted">
        {formatBytes(doc.file_size_bytes)}
      </span>
    </Link>
  );
}

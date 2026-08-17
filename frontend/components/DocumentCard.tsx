import Link from "next/link";
import type { DocumentItem } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api";
import { FileBadge } from "@/components/FileIcon";
import { formatBytes, relativeDate } from "@/lib/format";
import { FileText } from "lucide-react";

export function DocumentCard({ doc }: { doc: DocumentItem }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-card focus-visible:border-ink/20"
    >
      <div className="flex items-start justify-between">
        <FileBadge filename={doc.s3_key} />
        {doc.description && (
          <FileText size={16} className="text-border transition-colors group-hover:text-muted" />
        )}
      </div>
      <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
        {doc.title}
      </h3>
      <p className="mt-1 text-sm font-medium text-accent-dark">{doc.course_code}</p>
      <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted">
        <span>
          {CATEGORY_LABELS[doc.category]} · {formatBytes(doc.file_size_bytes)}
        </span>
        <span>{relativeDate(doc.created_at)}</span>
      </div>
    </Link>
  );
}

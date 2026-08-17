"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
import { api, ApiError, type DocumentItem } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/Button";
import { FileBadge } from "@/components/FileIcon";
import { DetailSkeleton } from "@/components/Skeleton";
import { EmptyState, ErrorState } from "@/components/State";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/components/AuthProvider";
import { formatBytes, formatDate } from "@/lib/format";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getDocument(params.id);
      setDoc(d);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError("This document is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function download() {
    if (!doc) return;
    setDownloading(true);
    try {
      const fresh = await api.getDocument(doc.id);
      window.open(fresh.download_url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Couldn’t generate a download link. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function confirmDelete() {
    if (!doc) return;
    setDeleting(true);
    try {
      await api.deleteDocument(doc.id);
      router.push("/");
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
      setError("Couldn’t delete this document. Please try again.");
    }
  }

  const canManage = doc && user && (doc.uploaded_by === user.id || user.role === "staff");

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={16} />
          Back to documents
        </Link>

        {loading && <DetailSkeleton />}

        {notFound && (
          <EmptyState
            title="Document not found"
            description="This document may have been removed or the link is incorrect."
            action={
              <Button onClick={() => router.push("/")}>Back to NoteVault</Button>
            }
          />
        )}

        {error && !loading && !notFound && (
          <ErrorState
            title="Something went wrong"
            description={error}
            action={<Button onClick={load}>Try again</Button>}
          />
        )}

        {doc && !loading && (
          <article className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <FileBadge filename={doc.s3_key} />
                <div>
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink">
                    {doc.title}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-accent-dark">
                    {doc.course_code} · {CATEGORY_LABELS[doc.category]}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/documents/${doc.id}/edit`)}
                  >
                    <Pencil size={15} /> Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              )}
            </div>

            {doc.description && (
              <p className="mt-6 whitespace-pre-line rounded-xl border border-border bg-surface p-4 text-[15px] leading-relaxed text-ink">
                {doc.description}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
              <Meta label="Uploaded by" value={doc.uploaded_by === user?.id ? "You" : "Member"} />
              <Meta label="Uploaded" value={formatDate(doc.created_at)} />
              <Meta label="File size" value={formatBytes(doc.file_size_bytes)} />
            </div>

            <div className="mt-8">
              <Button onClick={download} loading={downloading}>
                <Download size={16} />
                {downloading ? "Preparing download..." : "Download document"}
              </Button>
            </div>
          </article>
        )}
      </main>

      <Modal
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        title="Delete document?"
        description={`This will permanently remove “${doc?.title}”. This action cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

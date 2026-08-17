"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, UploadCloud, AlertTriangle } from "lucide-react";
import { api, ApiError, CATEGORY_LABELS, type Category } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/Button";
import { UploadDropzone, SelectedFilePreview } from "@/components/UploadDropzone";
import { useAuth } from "@/components/AuthProvider";
import { fileTypeFromName, formatBytes } from "@/lib/format";

type Stage = "select" | "uploading" | "publishing" | "done" | "error";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [category, setCategory] = useState<Category>("notes");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("select");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (file && !title) {
      const base = file.name.replace(/\.[^.]+$/, "");
      setTitle(base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim());
    }
  }, [file, title]);

  async function uploadToS3(presignedUrl: string) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file!.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file!);
    });
  }

  async function publish() {
    if (!file) return;
    if (!title.trim() || !courseCode.trim()) {
      setErrorMsg("Please add a title and course code before publishing.");
      setStage("error");
      return;
    }
    setErrorMsg(null);
    setStage("uploading");
    setProgress(0);
    try {
      const { upload_url, s3_key } = await api.requestUploadUrl({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
      });
      await uploadToS3(upload_url);
      setStage("publishing");
      const doc = await api.createDocument({
        title: title.trim(),
        description: description.trim(),
        course_code: courseCode.trim().toUpperCase(),
        category,
        s3_key,
        file_size_bytes: file.size,
        content_type: file.type || "application/octet-stream",
      });
      setStage("done");
      setTimeout(() => router.push(`/documents/${doc.id}`), 700);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Your file couldn’t be uploaded. Check your connection and try again."
      );
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setCourseCode("");
    setCategory("notes");
    setProgress(0);
    setStage("select");
    setErrorMsg(null);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-16" />
      </div>
    );
  }

  if (!user) return null;

  const info = file ? fileTypeFromName(file.name) : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft size={16} />
          Back to documents
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          Upload a document
        </h1>
        <p className="mt-1 text-sm text-muted">
          Share useful materials with your coursemates.
        </p>

        <div className="mt-8 space-y-6">
          {stage === "select" && !file && (
            <UploadDropzone onSelect={setFile} />
          )}

          {file && (
            <div className="space-y-5">
              <SelectedFilePreview file={file} onRemove={reset} />

              {stage === "uploading" && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">Uploading…</span>
                    <span className="text-muted">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {info && (
                <div className="rounded-xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    Document details
                  </h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-ink">
                        Title
                      </label>
                      <input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={stage !== "select" && stage !== "error"}
                        className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
                        placeholder="e.g. Computer Networks Complete Notes"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="course" className="mb-1.5 block text-sm font-medium text-ink">
                          Course code
                        </label>
                        <input
                          id="course"
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          disabled={stage !== "select" && stage !== "error"}
                          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm uppercase text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
                          placeholder="NET302"
                        />
                      </div>
                      <div>
                        <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink">
                          Category
                        </label>
                        <select
                          id="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value as Category)}
                          disabled={stage !== "select" && stage !== "error"}
                          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_LABELS[c]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="desc" className="mb-1.5 block text-sm font-medium text-ink">
                        Description <span className="font-normal text-muted">(optional)</span>
                      </label>
                      <textarea
                        id="desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={stage !== "select" && stage !== "error"}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
                        placeholder="A short summary of what this document covers."
                      />
                    </div>
                  </div>
                </div>
              )}

              {stage === "publishing" && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <UploadCloud size={16} /> Publishing document…
                </p>
              )}

              {stage === "done" && (
                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
                  <CheckCircle2 size={18} /> Upload complete
                </div>
              )}

              {stage === "error" && errorMsg && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-danger">
                    <AlertTriangle size={16} /> Upload failed
                  </div>
                  <p className="mt-1 text-sm text-muted">{errorMsg}</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={reset}>
                    Try again
                  </Button>
                </div>
              )}

              {(stage === "select" || stage === "error") && (
                <div className="flex items-center gap-3">
                  <Button onClick={publish} disabled={!title.trim() || !courseCode.trim()}>
                    Publish document
                  </Button>
                  <Button variant="ghost" onClick={reset}>
                    Choose another file
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

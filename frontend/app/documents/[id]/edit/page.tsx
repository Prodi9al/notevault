"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, ApiError, CATEGORY_LABELS, type Category, type DocumentItem } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/Button";
import { DetailSkeleton } from "@/components/Skeleton";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function EditDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [category, setCategory] = useState<Category>("notes");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDocument(params.id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
        setDescription(d.description);
        setCourseCode(d.course_code);
        setCategory(d.category);
      })
      .catch(() => setError("Couldn’t load this document."))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !courseCode.trim()) {
      setError("Title and course code are required.");
      return;
    }
    setSaving(true);
    try {
      await api.updateDocument(doc!.id, {
        title: title.trim(),
        description: description.trim(),
        course_code: courseCode.trim().toUpperCase(),
        category,
      });
      router.push(`/documents/${doc!.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href={`/documents/${params.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Back to document
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Edit document</h1>

        {loading && <DetailSkeleton />}

        {doc && !loading && (
          <form onSubmit={save} className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-5">
            <div>
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="course" className="mb-1.5 block text-sm font-medium text-ink">Course code</label>
                <input id="course" value={courseCode} onChange={(e) => setCourseCode(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm uppercase text-ink outline-none focus:border-accent" />
              </div>
              <div>
                <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink">Category</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="desc" className="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
            </div>

            {error && <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>{saving ? "Saving..." : "Save changes"}</Button>
              <Button type="button" variant="ghost" onClick={() => router.push(`/documents/${doc.id}`)}>Cancel</Button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}

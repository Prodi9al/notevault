"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Category, type DocumentItem, type PaginatedDocuments } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { DocumentCard } from "@/components/DocumentCard";
import { DocumentRow } from "@/components/DocumentRow";
import { DocumentFilters, type ViewMode } from "@/components/DocumentFilters";
import { DocumentCardSkeleton, DocumentRowSkeleton } from "@/components/Skeleton";
import { EmptyState, ErrorState } from "@/components/State";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { FileX2, SlidersHorizontal } from "lucide-react";

// Main document listing view — powers the homepage grid/list and handles
// filtering, search, pagination, and view mode (grid vs. row), all driven
// by URL query params so a filtered view is shareable and works with
// browser back/forward navigation.

export function DocumentBrowser({
  initialCourse,
  initialCategory,
  initialQuery,
}: {
  initialCourse?: string;
  initialCategory?: Category;
  initialQuery?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();

  // Filter/search/page state lives in the URL, not local component state.
// initialCourse/initialCategory/initialQuery let a page (like /courses/[code])
// pre-set a filter without the user picking it manually.
  
  const courseCode = (params.get("course_code") ?? initialCourse) || undefined;
  const category = (params.get("category") as Category | null) ?? initialCategory ?? undefined;
  const q = params.get("q") ?? initialQuery ?? undefined;
  const page = Number(params.get("page") ?? "1") || 1;

  const [view, setView] = useState<ViewMode>("grid");
  const [data, setData] = useState<PaginatedDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Refetches whenever any filter/search/page value changes.
// "cancelled" guards against a race condition: if the user changes filters
// again before the previous request finishes, we ignore the stale response
// instead of letting it overwrite newer data.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getDocuments({ course_code: courseCode, category, q, page, page_size: 18 })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: ApiError) => {
        if (!cancelled) setError(e.message || "Failed to load documents.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseCode, category, q, page]);

  const courses = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const d of data.items) {
      map.set(d.course_code, (map.get(d.course_code) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data]);

  function updateParams(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, val] of Object.entries(next)) {
      if (val) sp.set(key, val);
      else sp.delete(key);
    }
    if (next.course_code === undefined && !initialCourse) sp.delete("course_code");
    if (next.category === undefined && !initialCategory) sp.delete("category");
    if (next.q === undefined && !initialQuery) sp.delete("q");
    sp.delete("page");
    router.push(`/${sp.toString() ? `?${sp.toString()}` : ""}`);
  }

  const heading = q
    ? `${data?.total ?? 0} result${data?.total === 1 ? "" : "s"} for “${q}”`
    : category
      ? CATEGORY_LABEL_MAP[category]
      : courseCode
        ? `Documents for ${courseCode}`
        : "Browse documents";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      <div className="hidden lg:block">
        <DocumentFilters
          courseCode={courseCode}
          category={category}
          courses={courses}
          view={view}
          onCourseChange={(code) => updateParams({ course_code: code || undefined })}
          onCategoryChange={(cat) => updateParams({ category: cat })}
          onViewChange={setView}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-ink">{heading}</h1>
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-ink lg:hidden"
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>

        {loading && (
          <div>
            {view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <DocumentCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface px-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <DocumentRowSkeleton key={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <ErrorState
            title="Couldn’t load documents"
            description={error}
            action={
              <Button onClick={() => router.refresh()}>Try again</Button>
            }
          />
        )}

        {data && !loading && data.items.length === 0 && (
          <EmptyState
            icon={<FileX2 size={28} />}
            title={q ? "Nothing found" : "No documents yet"}
            description={
              q
                ? "Try searching for a course code or a broader keyword."
                : "Be the first person to contribute materials for this course."
            }
            action={
              user ? (
                <Button onClick={() => router.push("/upload")}>Upload a document</Button>
              ) : (
                <Button onClick={() => router.push("/register")}>Create account</Button>
              )
            }
          />
        )}

        {data && !loading && data.items.length > 0 && (
          <>
            {view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((doc: DocumentItem) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface px-2 py-1">
                <div className="hidden grid-cols-[auto_1fr_120px_120px_80px] gap-4 border-b border-border px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
                  <span />
                  <span>Document</span>
                  <span>Category</span>
                  <span>Uploaded</span>
                  <span className="text-right">Size</span>
                </div>
                {data.items.map((doc: DocumentItem) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </div>
            )}
            <Pagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </>
        )}
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-5 animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-muted"
              >
                Done
              </button>
            </div>
            <DocumentFilters
              courseCode={courseCode}
              category={category}
              courses={courses}
              view={view}
              onCourseChange={(code) => {
                updateParams({ course_code: code || undefined });
              }}
              onCategoryChange={(cat) => updateParams({ category: cat })}
              onViewChange={setView}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABEL_MAP: Record<Category, string> = {
  notes: "Lecture Notes",
  past_questions: "Past Questions",
  slides: "Slides",
  other: "Other",
};

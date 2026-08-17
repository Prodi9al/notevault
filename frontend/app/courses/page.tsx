"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { api, type CourseInfo } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState, ErrorState } from "@/components/State";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getCourses()
      .then((list) => {
        setCourses(
          [...list].sort((a, b) => a.course_code.localeCompare(b.course_code))
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Courses</h1>
          <p className="mt-1 text-sm text-muted">Browse academic materials by course.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <ErrorState title="Couldn’t load courses" description="Please try again." />
        )}

        {!loading && !error && courses.length === 0 && (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="No courses yet"
            description="Documents will be grouped here by course code as they’re added."
          />
        )}

        {!loading && !error && courses.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {courses.map((c) => (
              <li key={c.course_code}>
                <Link
                  href={`/?course_code=${c.course_code}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-bg"
                >
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-10 w-16 items-center justify-center rounded-lg border border-border bg-bg text-sm font-semibold text-ink">
                      {c.course_code}
                    </span>
                    <div>
                      <p className="text-[15px] font-medium text-ink">{c.course_name}</p>
                      <p className="text-sm text-muted">
                        {c.document_count} document{c.document_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

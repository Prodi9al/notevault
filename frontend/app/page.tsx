import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { DocumentBrowser } from "@/components/DocumentBrowser";
import { CATEGORY_LABELS, type Category } from "@/lib/api";

const POPULAR_COURSES = [
  { code: "CSBC252", name: "Cloud Computing" },
  { code: "CSNS242", name: "Computer Networks" },
  { code: "CSSD201", name: "Data Structures" },
  { code: "CSSD216", name: "Operating Systems" },
];

const QUICK_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20">
            <p className="mb-4 inline-flex items-center rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-muted">
              Your notes. Your courses. One place.
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
              Your university, organized.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Find course notes, past questions and lecture slides without digging
              through group chats.
            </p>
            <div className="mt-8 max-w-2xl">
              <form
                action="/"
                method="get"
                role="search"
                className="relative"
              >
                <Search
                  size={20}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  name="q"
                  type="search"
                  placeholder="Search notes, courses, or documents..."
                  aria-label="Search documents"
                  className="h-14 w-full rounded-xl border border-border bg-bg pl-11 pr-4 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
                />
              </form>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Popular:</span>
              {POPULAR_COURSES.map((c) => (
                <Link
                  key={c.code}
                  href={`/?course_code=${c.code}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-ink transition-colors hover:border-ink/20"
                >
                  {c.code}
                  <span className="text-muted">· {c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-content px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                Browse the library
              </h2>
              <p className="mt-1 text-sm text-muted">
                Filter by course or category to find what you need.
              </p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/?category=${cat}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:border-ink/20"
              >
                <span className="text-sm font-medium text-ink">
                  {CATEGORY_LABELS[cat]}
                </span>
                <ArrowRight
                  size={16}
                  className="text-muted transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>

          <Suspense fallback={null}>
            <DocumentBrowser />
          </Suspense>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>NoteVault — academic document library.</p>
          <p>Built for students, by students.</p>
        </div>
      </footer>
    </>
  );
}

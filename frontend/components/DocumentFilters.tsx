"use client";

import { LayoutGrid, List } from "lucide-react";
import { CATEGORY_LABELS, type Category } from "@/lib/api";

export type ViewMode = "grid" | "list";

const CATEGORIES: Category[] = ["notes", "past_questions", "slides", "other"];

export function DocumentFilters({
  courseCode,
  category,
  courses,
  view,
  onCourseChange,
  onCategoryChange,
  onViewChange,
}: {
  courseCode?: string;
  category?: Category;
  courses: { code: string; count: number }[];
  view: ViewMode;
  onCourseChange: (code: string) => void;
  onCategoryChange: (category?: Category) => void;
  onViewChange: (view: ViewMode) => void;
}) {
  return (
    <aside className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            View
          </h2>
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              aria-label="Grid view"
              onClick={() => onViewChange("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                view === "grid" ? "bg-border/60 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              aria-label="List view"
              onClick={() => onViewChange("list")}
              className={`rounded-md p-1.5 transition-colors ${
                view === "list" ? "bg-border/60 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="course-filter"
          className="mb-2 block text-sm font-semibold uppercase tracking-wide text-muted"
        >
          Course
        </label>
        <select
          id="course-filter"
          value={courseCode ?? ""}
          onChange={(e) => onCourseChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} ({c.count})
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Category
        </h2>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => onCategoryChange(undefined)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                !category
                  ? "bg-border/50 font-medium text-ink"
                  : "text-muted hover:bg-border/30 hover:text-ink"
              }`}
            >
              All categories
            </button>
          </li>
          {CATEGORIES.map((cat) => (
            <li key={cat}>
              <button
                onClick={() => onCategoryChange(cat)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  category === cat
                    ? "bg-border/50 font-medium text-ink"
                    : "text-muted hover:bg-border/30 hover:text-ink"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

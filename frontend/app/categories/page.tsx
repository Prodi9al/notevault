"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Presentation, HelpCircle, Images } from "lucide-react";
import { api, CATEGORY_LABELS, type Category, type CategoryInfo } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/Skeleton";
import { CATEGORY_DESCRIPTIONS } from "@/lib/format";
import { ArrowRight } from "lucide-react";

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  notes: <FileText size={20} />,
  past_questions: <HelpCircle size={20} />,
  slides: <Presentation size={20} />,
  other: <Images size={20} />,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCategories()
      .then((list) => setCategories(list))
      .finally(() => setLoading(false));
  }, []);

  const countFor = (cat: string) =>
    categories.find((c) => c.category === cat)?.document_count ?? 0;

  const cats = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Categories</h1>
          <p className="mt-1 text-sm text-muted">
            Explore the library by the type of material you need.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cats.map((cat) => (
            <Link
              key={cat}
              href={`/?category=${cat}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-ink/20"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent-dark">
                {CATEGORY_ICONS[cat]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{CATEGORY_LABELS[cat]}</p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {CATEGORY_DESCRIPTIONS[cat]}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {loading ? "—" : `${countFor(cat)} document${countFor(cat) === 1 ? "" : "s"}`}
                </p>
              </div>
              <ArrowRight
                size={18}
                className="text-muted transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

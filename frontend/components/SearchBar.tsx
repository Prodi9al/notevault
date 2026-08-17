"use client";

import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchBar({
  size = "md",
  autoFocus = false,
  placeholder = "Search notes, courses, or documents...",
}: {
  size?: "md" | "lg";
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    next.delete("page");
    router.push(`/?${next.toString()}`);
  }

  const isLarge = size === "lg";

  return (
    <form onSubmit={onSubmit} className="relative w-full" role="search">
      <Search
        size={isLarge ? 20 : 18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search documents"
        className={`w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-ink shadow-sm outline-none transition-colors placeholder:text-muted focus:border-accent ${
          isLarge ? "h-14 text-base" : "h-11 text-sm"
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            const next = new URLSearchParams(params.toString());
            next.delete("q");
            next.delete("page");
            router.push(`/?${next.toString()}`);
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted hover:bg-border/50 hover:text-ink"
        >
          Clear
        </button>
      )}
    </form>
  );
}

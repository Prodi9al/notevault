"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Upload, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
      {initials || "?"}
    </span>
  );
}

export function UserMenu() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  async function logout() {
    try {
      await api.logout();
    } finally {
      await refresh();
      router.push("/");
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-border/50"
      >
        <UserAvatar name={user.full_name} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-card animate-slide-up"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user.full_name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
              {user.role}
            </p>
          </div>
          <Link
            href="/upload"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-bg"
          >
            <Upload size={16} className="text-muted" />
            Upload document
          </Link>
          <div className="my-1 border-t border-border" />
          <button
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-bg"
          >
            <LogOut size={16} className="text-muted" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

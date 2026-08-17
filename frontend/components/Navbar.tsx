"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { UserMenu } from "@/components/UserMenu";

const NAV_LINKS = [
  { href: "/", label: "Browse" },
  { href: "/courses", label: "Courses" },
  { href: "/categories", label: "Categories" },
];

export function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
              N
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-ink">
              NoteVault
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!loading &&
            (user ? (
              <>
                <Link
                  href="/upload"
                  className="hidden h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark sm:inline-flex"
                >
                  Upload
                </Link>
                <UserMenu />
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-ink px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink/85"
                >
                  Create account
                </Link>
              </div>
            ))}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation"
            className="rounded-lg p-2 text-ink hover:bg-border/50 md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-bg px-4 py-3 md:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink hover:bg-border/40"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-border" />
            {!loading &&
              (user ? (
                <>
                  <Link
                    href="/upload"
                    className="rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-medium text-white"
                  >
                    Upload document
                  </Link>
                  <Link
                    href="/login"
                    className="mt-1 rounded-lg px-2 py-2.5 text-sm font-medium text-muted"
                  >
                    {user.full_name}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="mt-1 rounded-lg bg-ink px-3 py-2.5 text-center text-sm font-medium text-white"
                  >
                    Create account
                  </Link>
                </>
              ))}
          </nav>
        </div>
      )}
    </header>
  );
}

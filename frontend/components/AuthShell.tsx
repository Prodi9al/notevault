import Link from "next/link";
import { Library } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
            N
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">NoteVault</span>
        </Link>
        <div>
          <Library size={28} className="text-accent" />
          <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-ink">
            Your academic library, without the chaos.
          </h2>
          <p className="mt-3 max-w-sm text-muted">
            Upload, organize and find course materials in one calm, focused place.
          </p>
        </div>
        <p className="text-sm text-muted">© NoteVault</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

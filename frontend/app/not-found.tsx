import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-content flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="text-5xl font-semibold tracking-tight text-ink">404</p>
        <h1 className="mt-4 text-xl font-semibold text-ink">
          Looks like this page got lost somewhere in the library.
        </h1>
        <p className="mt-2 text-sm text-muted">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/85"
        >
          Back to NoteVault
        </Link>
      </main>
    </>
  );
}

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { AuthShell } from "@/components/AuthShell";

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
  { label: "Contains an uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
];

function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = REQUIREMENTS.every((r) => r.test(password));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.includes("@")) {
      setError("Please enter your name and a valid email.");
      return;
    }
    if (!passwordValid) {
      setError("Please meet all password requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.register({ full_name: fullName.trim(), email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "An account with this email already exists."
          : "We couldn’t create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
          Full name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          placeholder="you@university.edu"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-accent"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-ink"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {REQUIREMENTS.map((r) => {
            const met = r.test(password);
            return (
              <li
                key={r.label}
                className={`flex items-center gap-2 text-xs ${
                  password && met ? "text-success" : "text-muted"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    password && met ? "bg-success" : "bg-border"
                  }`}
                />
                {r.label}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink">
          Confirm password
        </label>
        <input
          id="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth loading={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Join NoteVault to upload and save materials.</p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:text-accent-dark">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signIn, db } from "@/lib/store";
import { useAuth } from "@/lib/use-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const user = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const hasAdmin = typeof window !== "undefined" && db.get().users.some((u) => u.role === "admin");
  const domain = typeof window !== "undefined" ? db.get().orgs[0]?.domain : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      signIn(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-primary)" }} />
          <span className="text-lg font-semibold tracking-tight">FlowDesk</span>
        </Link>
        <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace.</p>

          {!hasAdmin && (
            <div className="mt-4 rounded-md border border-warning bg-[oklch(0.98_0.05_75)] p-3 text-xs text-foreground">
              No account exists yet. <Link to="/signup" className="font-medium text-primary underline">Sign up</Link> to create your organisation first.
            </div>
          )}

          {hasAdmin && domain && (
            <div className="mt-4 rounded-md border border-border bg-secondary p-3 text-xs text-secondary-foreground">
              <p className="font-medium">Demo accounts seeded:</p>
              <p className="mt-1 font-mono">pm@{domain} / demo123</p>
              <p className="font-mono">dev@{domain} / demo123</p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </Field>
            <Field label="Password">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="btn-primary w-full">Sign in</button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">Create an organisation</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

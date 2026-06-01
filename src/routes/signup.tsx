import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "@/lib/store";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      signUp({ name, orgName, email, password });
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
          <h1 className="text-2xl font-semibold tracking-tight">Create your organisation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The first account is always the <span className="font-medium text-foreground">admin</span>. Demo PM + Developer accounts are seeded automatically for you to test.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Your name">
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Jane Doe" />
            </Field>
            <Field label="Organisation name">
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" placeholder="Acme Inc." />
            </Field>
            <Field label="Work email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@acme.com" />
            </Field>
            <Field label="Password">
              <input type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 4 characters" />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="btn-primary w-full">Create organisation</button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
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

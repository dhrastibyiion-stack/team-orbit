import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-store";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlowDesk — Team Operations Hub" },
      { name: "description", content: "Manage members, projects, tasks, and leave requests with role-based access." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const user = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-primary)" }} />
            <span className="text-lg font-semibold tracking-tight">FlowDesk</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Role-based team workspace
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            Run your team with{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
              clarity and control
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            FlowDesk gives admins, project managers, and developers exactly the access they need.
            Members, projects, tasks, and leave requests — in one focused workspace.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:scale-[1.02]" style={{ background: "var(--gradient-primary)" }}>
              Create your organisation
            </Link>
            <Link to="/login" className="inline-flex h-11 items-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            { role: "Admin", desc: "Full access to every module — members, projects, tasks, and leave records." },
            { role: "Project Manager", desc: "Manage tasks, approve leave, update project status and deadlines." },
            { role: "Developer", desc: "See assigned tasks, update status, and request leave." },
          ].map((c) => (
            <div key={c.role} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                {c.role[0]}
              </div>
              <h3 className="text-base font-semibold">{c.role}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

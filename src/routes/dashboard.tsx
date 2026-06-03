import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useStore } from "@/lib/use-store";
import { db, signOut, update, uid, rollback, notify, type Role, type Project, type Task, type Leave, type User, type TaskComment, type TimeLog, type Notification, type Priority, type Sprint } from "@/lib/store";
import { can, visibleTabs, defaultTabFor, type TabId } from "@/lib/permissions";

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
function sortByPriority<T extends { priority?: Priority }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (PRIORITY_RANK[a.priority ?? "Medium"]) - (PRIORITY_RANK[b.priority ?? "Medium"]));
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const user = useAuth();
  const navigate = useNavigate();
  const tabs = useMemo<{ id: TabId; label: string }[]>(
    () => (user ? visibleTabs(user.role) : []),
    [user?.role],
  );
  const [tab, setTab] = useState<TabId>(user ? defaultTabFor(user.role) : "tasks");

  useEffect(() => {
    if (user === null) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (user && !tabs.some((t) => t.id === tab)) {
      setTab(defaultTabFor(user.role));
    }
  }, [user?.role, tabs, tab]);

  if (!user) return null;

  const org = db.get().orgs.find((o) => o.id === user.orgId);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-primary)" }} />
          <div>
            <div className="text-sm font-semibold">FlowDesk</div>
            <div className="text-xs text-sidebar-foreground/60">{org?.name}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`mb-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                tab === t.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">{user.name}</div>
            <NotificationsBell />
          </div>
          <div className="mb-3 text-xs text-sidebar-foreground/60">{user.email}</div>
          <RoleBadge role={user.role} />
          <button
            onClick={() => { signOut(); navigate({ to: "/login" }); }}
            className="mt-3 w-full rounded-md border border-sidebar-border bg-transparent px-3 py-1.5 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent/40"
          >
            Sign out
          </button>
          {user.role === "admin" && (
            <button
              onClick={() => {
                if (confirm("Rollback wipes all demo data and signs you out. Continue?")) {
                  rollback();
                  navigate({ to: "/" });
                }
              }}
              className="mt-2 w-full rounded-md border border-sidebar-border bg-transparent px-3 py-1.5 text-xs font-medium text-[oklch(0.8_0.15_25)] hover:bg-sidebar-accent/40"
            >
              Rollback demo
            </button>
          )}
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="border-b border-border bg-card md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md" style={{ background: "var(--gradient-primary)" }} />
              <span className="font-semibold">FlowDesk</span>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationsBell />
              <button onClick={() => { signOut(); navigate({ to: "/login" }); }} className="btn-ghost h-8">Sign out</button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-6 py-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {tabs.find((t) => t.id === tab)?.label}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.name}</span> · <RoleBadge role={user.role} inline />
              </p>
            </div>

            {tab === "mywork" && <MyWorkTab />}
            {tab === "members" && <MembersTab />}
            {tab === "projects" && <ProjectsTab />}
            {tab === "sprints" && <SprintsTab />}
            {tab === "tasks" && <TasksTab />}
            {tab === "workload" && <WorkloadTab />}
            {tab === "reports" && <ReportsTab />}
            {tab === "leaves" && <LeavesTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function RoleBadge({ role, inline }: { role: Role; inline?: boolean }) {
  const colors = {
    admin: { bg: "color-mix(in oklab, var(--primary) 18%, transparent)", fg: "var(--primary)" },
    pm: { bg: "color-mix(in oklab, var(--success) 18%, transparent)", fg: "var(--success)" },
    developer: { bg: "color-mix(in oklab, var(--warning) 22%, transparent)", fg: "oklch(0.45 0.15 75)" },
  }[role];
  const label = role === "pm" ? "Project Manager" : role === "admin" ? "Admin" : "Developer";
  return (
    <span className={`badge ${inline ? "" : ""}`} style={{ backgroundColor: colors.bg, color: colors.fg }}>{label}</span>
  );
}

/* ---------------- NOTIFICATIONS ---------------- */
function NotificationsBell() {
  const user = useAuth()!;
  const items = useStore(() =>
    db.get().notifications.filter((n) => n.userId === user.id).slice(0, 30),
  );
  const unread = items.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);

  const markAll = () => {
    update((d) => ({
      ...d,
      notifications: d.notifications.map((n) => n.userId === user.id ? { ...n, read: true } : n),
    }));
  };
  const clearAll = () => {
    update((d) => ({ ...d, notifications: d.notifications.filter((n) => n.userId !== user.id) }));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/40"
        title="Notifications"
        aria-label="Notifications"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-primary-foreground"
            style={{ background: "var(--primary)" }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-sm font-semibold">Notifications</div>
              <div className="flex gap-2 text-xs">
                <button onClick={markAll} className="text-muted-foreground hover:text-foreground">Mark all read</button>
                <button onClick={clearAll} className="text-muted-foreground hover:text-foreground">Clear</button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">You're all caught up.</div>
              )}
              {items.map((n) => (
                <div key={n.id} className={`border-b border-border px-3 py-2 text-sm ${n.read ? "" : "bg-secondary/50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.body}</div>
                    </div>
                    <div className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- MY WORK (developer dashboard) ---------------- */
function MyWorkTab() {
  const user = useAuth()!;
  const allTasks = useStore(() => db.get().tasks.filter((t) => t.orgId === user.orgId && t.assigneeId === user.id));
  const projects = useStore(() => db.get().projects.filter((p) => p.orgId === user.orgId));
  const timeLogs = useStore(() => db.get().timeLogs.filter((l) => l.userId === user.id));

  const [status, setStatus] = useState<"all" | Task["status"]>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [opening, setOpening] = useState<Task | null>(null);

  const filtered = allTasks.filter((t) =>
    (status === "all" || t.status === status) &&
    (projectId === "all" || t.projectId === projectId),
  );

  const counts = {
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === "Pending").length,
    inProgress: allTasks.filter((t) => t.status === "In Progress").length,
    done: allTasks.filter((t) => t.status === "Done").length,
  };
  const totalHours = timeLogs.reduce((s, l) => s + l.hours, 0);
  const thisWeek = timeLogs.filter((l) => Date.now() - new Date(l.date).getTime() < 7 * 864e5).reduce((s, l) => s + l.hours, 0);

  const updateStatus = (id: string, s: Task["status"]) => {
    update((d) => ({ ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, status: s } : t) }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Assigned" value={counts.total} />
        <StatCard label="Pending" value={counts.pending} accent="warning" />
        <StatCard label="In Progress" value={counts.inProgress} accent="primary" />
        <StatCard label="Done" value={counts.done} accent="success" />
        <StatCard label="Hours this week" value={thisWeek.toFixed(1)} hint={`${totalHours.toFixed(1)} total`} />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Filters:</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="input h-8 w-auto py-0 text-xs">
            <option value="all">All statuses</option>
            <option>Pending</option><option>In Progress</option><option>Done</option>
          </select>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input h-8 w-auto py-0 text-xs">
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} task{filtered.length === 1 ? "" : "s"}</div>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>Task</Th><Th>Project</Th><Th>Status</Th><Th>Hours</Th><Th>{" "}</Th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No tasks match these filters.</td></tr>}
              {filtered.map((t) => {
                const proj = projects.find((p) => p.id === t.projectId);
                const hrs = timeLogs.filter((l) => l.taskId === t.id).reduce((s, l) => s + l.hours, 0);
                return (
                  <tr key={t.id} className="border-t border-border">
                    <Td>
                      <div className="font-medium">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                    </Td>
                    <Td className="text-muted-foreground">{proj?.name ?? "—"}</Td>
                    <Td>
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t.id, e.target.value as Task["status"])}
                        className="input h-8 py-0 text-xs"
                      >
                        {["Pending", "In Progress", "Done"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </Td>
                    <Td className="text-muted-foreground">{hrs.toFixed(1)}h</Td>
                    <Td>
                      <button onClick={() => setOpening(t)} className="btn-ghost">Open</button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {opening && <TaskDetailModal task={opening} onClose={() => setOpening(null)} />}
    </div>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent?: "primary" | "success" | "warning" }) {
  const fg = accent === "primary" ? "var(--primary)" : accent === "success" ? "var(--success)" : accent === "warning" ? "oklch(0.55 0.16 75)" : "var(--foreground)";
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: fg }}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ---------------- TASK DETAIL (comments + time logs) ---------------- */
function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const user = useAuth()!;
  const comments = useStore(() => db.get().comments.filter((c) => c.taskId === task.id).sort((a, b) => a.createdAt - b.createdAt));
  const logs = useStore(() => db.get().timeLogs.filter((l) => l.taskId === task.id).sort((a, b) => b.createdAt - a.createdAt));
  const users = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId));
  const project = useStore(() => db.get().projects.find((p) => p.id === task.projectId));

  const [body, setBody] = useState("");
  const [hours, setHours] = useState("1");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const canComment = can.commentOnTask(user, task);
  const canLogTime = can.logTimeOnTask(user, task);
  const totalHours = logs.reduce((s, l) => s + l.hours, 0);

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    const c: TaskComment = { id: uid(), orgId: user.orgId, taskId: task.id, userId: user.id, body: body.trim(), createdAt: Date.now() };
    update((d) => ({ ...d, comments: [...d.comments, c] }));
    // notify assignee + (if different) PMs/admins involved
    const recipients = new Set<string>();
    if (task.assigneeId && task.assigneeId !== user.id) recipients.add(task.assigneeId);
    db.get().users.filter((u) => u.orgId === user.orgId && (u.role === "pm" || u.role === "admin") && u.id !== user.id).forEach((u) => recipients.add(u.id));
    recipients.forEach((rid) => notify({
      orgId: user.orgId, userId: rid, kind: "task_comment",
      title: `New comment on "${task.title}"`,
      body: `${user.name}: ${body.trim().slice(0, 80)}`,
    }));
    setBody("");
  };

  const addLog = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(hours);
    if (!isFinite(h) || h <= 0) return;
    const l: TimeLog = { id: uid(), orgId: user.orgId, taskId: task.id, userId: user.id, hours: h, note: note.trim(), date, createdAt: Date.now() };
    update((d) => ({ ...d, timeLogs: [...d.timeLogs, l] }));
    setHours("1"); setNote("");
  };

  const deleteLog = (id: string) => {
    update((d) => ({ ...d, timeLogs: d.timeLogs.filter((l) => l.id !== id) }));
  };

  return (
    <Modal onClose={onClose} title={task.title}>
      <div className="space-y-5">
        <div className="text-xs text-muted-foreground">
          {project?.name ?? "—"} · <StatusBadge status={task.status} /> · Total logged: <span className="font-medium text-foreground">{totalHours.toFixed(1)}h</span>
        </div>
        {task.description && <p className="text-sm">{task.description}</p>}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Comments</h3>
          <div className="space-y-2">
            {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
            {comments.map((c) => {
              const u = users.find((x) => x.id === c.userId);
              return (
                <div key={c.id} className="rounded-md border border-border bg-secondary/40 px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{u?.name ?? "Unknown"}</span>
                    <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              );
            })}
          </div>
          {canComment ? (
            <form onSubmit={addComment} className="mt-3 flex gap-2">
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note or progress update…" className="input flex-1" />
              <button type="submit" className="btn-primary">Post</button>
            </form>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Only the assignee, PMs, and admins can comment.</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Time logs</h3>
          <div className="space-y-1">
            {logs.length === 0 && <p className="text-xs text-muted-foreground">No time logged yet.</p>}
            {logs.map((l) => {
              const u = users.find((x) => x.id === l.userId);
              return (
                <div key={l.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                  <div>
                    <span className="font-medium">{l.hours}h</span>{" "}
                    <span className="text-muted-foreground">· {l.date} · {u?.name ?? "—"}</span>
                    {l.note && <div className="text-xs text-muted-foreground">{l.note}</div>}
                  </div>
                  {l.userId === user.id && (
                    <button onClick={() => deleteLog(l.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                  )}
                </div>
              );
            })}
          </div>
          {canLogTime ? (
            <form onSubmit={addLog} className="mt-3 grid grid-cols-[80px_120px_1fr_auto] gap-2">
              <input type="number" step="0.25" min="0.25" value={hours} onChange={(e) => setHours(e.target.value)} className="input" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" className="input" />
              <button type="submit" className="btn-primary">Log</button>
            </form>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Only the assignee can log time on this task.</p>
          )}
        </section>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- MEMBERS ---------------- */
function MembersTab() {
  const user = useAuth()!;
  const users = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId));
  const [open, setOpen] = useState(false);

  const canEdit = can.addMember(user.role);

  const remove = (id: string) => {
    if (id === user.id) return alert("You can't remove yourself.");
    if (!confirm("Remove this member?")) return;
    update((d) => ({
      ...d,
      users: d.users.filter((u) => u.id !== id),
      tasks: d.tasks.map((t) => (t.assigneeId === id ? { ...t, assigneeId: "" } : t)),
    }));
  };

  return (
    <div>
      {user.role === "pm" && (
        <div className="mb-4 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          Read-only view. Only admins can add or remove members.
        </div>
      )}
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setOpen(true)} className="btn-primary">+ Add member</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>Name</Th><Th>Email</Th><Th>Role</Th>{canEdit && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <Td>{u.name}</Td>
                <Td className="text-muted-foreground">{u.email}</Td>
                <Td><RoleBadge role={u.role} inline /></Td>
                {canEdit && (
                  <Td>
                    <button disabled={u.id === user.id} onClick={() => remove(u.id)} className="btn-danger disabled:opacity-40">Remove</button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <AddMemberModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const user = useAuth()!;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo123");
  const [role, setRole] = useState<Role>("developer");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.get().users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setErr("Email already in use"); return;
    }
    update((d) => ({ ...d, users: [...d.users, { id: uid(), name, email, password, role, orgId: user.orgId }] }));
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Add member">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Name"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></FormField>
        <FormField label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></FormField>
        <FormField label="Temporary password"><input required value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></FormField>
        <FormField label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
            <option value="developer">Developer</option>
            <option value="pm">Project Manager</option>
            <option value="admin">Admin</option>
          </select>
        </FormField>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary">Add member</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- PROJECTS ---------------- */
function ProjectsTab() {
  const user = useAuth()!;
  const projects = useStore(() => db.get().projects.filter((p) => p.orgId === user.orgId));
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);

  const canCreate = can.createProject(user.role);
  const canDelete = can.deleteProject(user.role);
  const canEdit = can.editProjectLimited(user.role);

  const remove = (id: string) => {
    if (!confirm("Delete this project and its tasks?")) return;
    update((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== id),
      tasks: d.tasks.filter((t) => t.projectId !== id),
    }));
  };

  return (
    <div>
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setCreating(true)} className="btn-primary">+ New project</button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
        {projects.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Deadline: <span className="font-medium text-foreground">{p.deadline}</span></span>
              <div className="flex gap-2">
                {canEdit && (
                  <button onClick={() => setEditing(p)} className="btn-ghost">Edit</button>
                )}
                {canDelete && <button onClick={() => remove(p.id)} className="btn-danger">Delete</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && <ProjectModal project={editing} onClose={() => setEditing(null)} />}
      {creating && <ProjectModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function ProjectModal({ project, onClose }: { project?: Project; onClose: () => void }) {
  const user = useAuth()!;
  const isEdit = !!project;
  const pmLimited = user.role === "pm" && isEdit;
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<Project["status"]>(project?.status ?? "Planning");
  const [deadline, setDeadline] = useState(project?.deadline ?? new Date().toISOString().slice(0, 10));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      update((d) => ({
        ...d,
        projects: d.projects.map((p) => p.id === project!.id ? { ...p, name, description, status, deadline } : p),
      }));
    } else {
      update((d) => ({
        ...d,
        projects: [...d.projects, { id: uid(), orgId: user.orgId, name, description, status, deadline }],
      }));
    }
    onClose();
  };

  return (
    <Modal onClose={onClose} title={isEdit ? "Edit project" : "New project"}>
      <form onSubmit={submit} className="space-y-4">
        {pmLimited && (
          <div className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            As a PM, you can update status and deadline only.
          </div>
        )}
        <FormField label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} disabled={pmLimited} className="input" />
        </FormField>
        <FormField label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={pmLimited} rows={3} className="input" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])} className="input">
              {["Planning", "Active", "On Hold", "Completed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Deadline">
            <input type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- TASKS ---------------- */
function TasksTab() {
  const user = useAuth()!;
  const allTasks = useStore(() => db.get().tasks.filter((t) => t.orgId === user.orgId));
  const visible = user.role === "developer" ? allTasks.filter((t) => t.assigneeId === user.id) : allTasks;
  const tasks = sortByPriority(visible);
  const projects = useStore(() => db.get().projects.filter((p) => p.orgId === user.orgId));
  const users = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId));
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState<Task | null>(null);

  const canManage = can.createTask(user.role);

  const updateStatus = (id: string, status: Task["status"]) => {
    update((d) => ({ ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, status } : t) }));
  };
  const remove = (id: string) => {
    if (!confirm("Delete this task?")) return;
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  };

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setCreating(true)} className="btn-primary">+ New task</button>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>Task</Th><Th>Priority</Th><Th>Project</Th><Th>Assignee</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                {user.role === "developer" ? "No tasks assigned to you yet." : "No tasks yet."}
              </td></tr>
            )}
            {tasks.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              const assignee = users.find((u) => u.id === t.assigneeId);
              return (
                <tr key={t.id} className="border-t border-border">
                  <Td>
                    <button onClick={() => setOpening(t)} className="text-left font-medium hover:underline">{t.title}</button>
                    {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                  </Td>
                  <Td><PriorityBadge priority={t.priority} /></Td>
                  <Td className="text-muted-foreground">{proj?.name ?? "—"}</Td>
                  <Td className="text-muted-foreground">{assignee?.name ?? "Unassigned"}</Td>
                  <Td>
                    <select
                      value={t.status}
                      disabled={!can.updateTaskStatus(user, t)}
                      onChange={(e) => updateStatus(t.id, e.target.value as Task["status"])}
                      className="input h-8 py-0 text-xs disabled:opacity-60"
                    >
                      {["Pending", "In Progress", "Done"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <button onClick={() => setOpening(t)} className="btn-ghost">Open</button>
                      {canManage && (
                        <>
                          <button onClick={() => setEditing(t)} className="btn-ghost">Edit</button>
                          <button onClick={() => remove(t.id)} className="btn-danger">Delete</button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
      {creating && <TaskModal onClose={() => setCreating(false)} />}
      {opening && <TaskDetailModal task={opening} onClose={() => setOpening(null)} />}
    </div>
  );
}

function TaskModal({ task, onClose }: { task?: Task; onClose: () => void }) {
  const user = useAuth()!;
  const projects = db.get().projects.filter((p) => p.orgId === user.orgId);
  const developers = db.get().users.filter((u) => u.orgId === user.orgId && u.role === "developer");
  const allSprints = db.get().sprints.filter((s) => s.orgId === user.orgId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? developers[0]?.id ?? "");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "Pending");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "Medium");
  const [sprintId, setSprintId] = useState<string>(task?.sprintId ?? "");
  const sprintsForProject = allSprints.filter((s) => s.projectId === projectId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const prevAssignee = task?.assigneeId;
    const payload = { title, description, projectId, assigneeId, status, priority, sprintId: sprintId || null };
    if (task) {
      update((d) => ({ ...d, tasks: d.tasks.map((t) => t.id === task.id ? { ...t, ...payload } : t) }));
    } else {
      update((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), orgId: user.orgId, ...payload }] }));
    }
    if (assigneeId && assigneeId !== prevAssignee && assigneeId !== user.id) {
      notify({
        orgId: user.orgId, userId: assigneeId, kind: "task_assigned",
        title: "New task assigned",
        body: `${user.name} assigned you "${title}" (${priority}).`,
      });
    }
    onClose();
  };

  return (
    <Modal onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Title"><input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></FormField>
        <FormField label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Project">
            <select required value={projectId} onChange={(e) => { setProjectId(e.target.value); setSprintId(""); }} className="input">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Assign to (developers only)">
            <select required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input">
              {developers.length === 0 && <option value="">No developers</option>}
              {developers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
              {["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])} className="input">
              {["Pending", "In Progress", "Done"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Sprint">
            <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className="input">
              <option value="">— None —</option>
              {sprintsForProject.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary">Save task</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- LEAVES ---------------- */
function LeavesTab() {
  const user = useAuth()!;
  const all = useStore(() => db.get().leaves.filter((l) => l.orgId === user.orgId));
  const users = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId));
  const leaves = user.role === "developer" ? all.filter((l) => l.userId === user.id) : all;
  const [creating, setCreating] = useState(false);

  const setStatus = (id: string, status: Leave["status"]) => {
    const leave = db.get().leaves.find((l) => l.id === id);
    update((d) => ({ ...d, leaves: d.leaves.map((l) => l.id === id ? { ...l, status } : l) }));
    if (leave && leave.userId !== user.id) {
      notify({
        orgId: user.orgId, userId: leave.userId, kind: "leave_status",
        title: `Leave ${status.toLowerCase()}`,
        body: `${user.name} ${status.toLowerCase()} your leave (${leave.from} → ${leave.to}).`,
      });
    }
  };
  const remove = (id: string, leave: Leave) => {
    if (user.role === "developer" && leave.status !== "Pending") return;
    if (!confirm("Delete this leave request?")) return;
    update((d) => ({ ...d, leaves: d.leaves.filter((l) => l.id !== id) }));
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setCreating(true)} className="btn-primary">+ New leave request</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>Requested by</Th><Th>From</Th><Th>To</Th><Th>Reason</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No leave requests.</td></tr>}
            {leaves.map((l) => {
              const u = users.find((x) => x.id === l.userId);
              const canDelete = can.deleteLeave(user, l);
              const canModerate = can.moderateLeave(user.role) && l.status === "Pending";
              return (
                <tr key={l.id} className="border-t border-border">
                  <Td>{u?.name ?? "—"}</Td>
                  <Td>{l.from}</Td>
                  <Td>{l.to}</Td>
                  <Td className="text-muted-foreground">{l.reason}</Td>
                  <Td><StatusBadge status={l.status} /></Td>
                  <Td>
                    <div className="flex gap-2">
                      {canModerate && (
                        <>
                          <button onClick={() => setStatus(l.id, "Approved")} className="btn-ghost" style={{ color: "var(--success)" }}>Approve</button>
                          <button onClick={() => setStatus(l.id, "Rejected")} className="btn-danger">Reject</button>
                        </>
                      )}
                      {canDelete && <button onClick={() => remove(l.id, l)} className="btn-danger">Delete</button>}
                      {!canModerate && !canDelete && <span className="text-xs text-muted-foreground">Locked</span>}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {creating && <LeaveModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function LeaveModal({ onClose }: { onClose: () => void }) {
  const user = useAuth()!;
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update((d) => ({
      ...d,
      leaves: [...d.leaves, { id: uid(), orgId: user.orgId, userId: user.id, from, to, reason, status: "Pending" }],
    }));
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Request leave">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From"><input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} className="input" /></FormField>
          <FormField label="To"><input type="date" required value={to} onChange={(e) => setTo(e.target.value)} className="input" /></FormField>
        </div>
        <FormField label="Reason"><textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input" /></FormField>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary">Submit</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- helpers ---------------- */
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    "Active": { bg: "color-mix(in oklab, var(--success) 18%, transparent)", fg: "var(--success)" },
    "Approved": { bg: "color-mix(in oklab, var(--success) 18%, transparent)", fg: "var(--success)" },
    "Done": { bg: "color-mix(in oklab, var(--success) 18%, transparent)", fg: "var(--success)" },
    "Completed": { bg: "color-mix(in oklab, var(--success) 18%, transparent)", fg: "var(--success)" },
    "Pending": { bg: "color-mix(in oklab, var(--warning) 22%, transparent)", fg: "oklch(0.45 0.15 75)" },
    "In Progress": { bg: "color-mix(in oklab, var(--primary) 16%, transparent)", fg: "var(--primary)" },
    "Planning": { bg: "color-mix(in oklab, var(--primary) 16%, transparent)", fg: "var(--primary)" },
    "On Hold": { bg: "var(--secondary)", fg: "var(--secondary-foreground)" },
    "Rejected": { bg: "color-mix(in oklab, var(--destructive) 14%, transparent)", fg: "var(--destructive)" },
  };
  const c = map[status] ?? { bg: "var(--secondary)", fg: "var(--secondary-foreground)" };
  return <span className="badge" style={{ backgroundColor: c.bg, color: c.fg }}>{status}</span>;
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function PriorityBadge({ priority }: { priority?: Priority }) {
  const p = priority ?? "Medium";
  const c = p === "High"
    ? { bg: "color-mix(in oklab, var(--destructive) 16%, transparent)", fg: "var(--destructive)" }
    : p === "Low"
    ? { bg: "var(--secondary)", fg: "var(--secondary-foreground)" }
    : { bg: "color-mix(in oklab, var(--warning) 22%, transparent)", fg: "oklch(0.45 0.15 75)" };
  return <span className="badge" style={{ backgroundColor: c.bg, color: c.fg }}>{p}</span>;
}

/* ---------------- SPRINTS ---------------- */
function SprintsTab() {
  const user = useAuth()!;
  const sprints = useStore(() => db.get().sprints.filter((s) => s.orgId === user.orgId));
  const projects = useStore(() => db.get().projects.filter((p) => p.orgId === user.orgId));
  const tasks = useStore(() => db.get().tasks.filter((t) => t.orgId === user.orgId));
  const [editing, setEditing] = useState<Sprint | null>(null);
  const [creating, setCreating] = useState(false);
  const canManage = can.manageSprints(user.role);

  const remove = (id: string) => {
    if (!confirm("Delete this sprint? Tasks will be unassigned from it.")) return;
    update((d) => ({
      ...d,
      sprints: d.sprints.filter((s) => s.id !== id),
      tasks: d.tasks.map((t) => t.sprintId === id ? { ...t, sprintId: null } : t),
    }));
  };

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setCreating(true)} className="btn-primary">+ New sprint</button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {sprints.length === 0 && <p className="text-sm text-muted-foreground">No sprints yet.</p>}
        {sprints.map((s) => {
          const proj = projects.find((p) => p.id === s.projectId);
          const sTasks = tasks.filter((t) => t.sprintId === s.id);
          const done = sTasks.filter((t) => t.status === "Done").length;
          const pct = sTasks.length === 0 ? 0 : Math.round((done / sTasks.length) * 100);
          const now = Date.now();
          const isActive = new Date(s.startDate).getTime() <= now && now <= new Date(s.endDate).getTime() + 864e5;
          return (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{s.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{proj?.name ?? "—"} · {s.startDate} → {s.endDate}</p>
                  {s.goal && <p className="mt-2 text-sm">{s.goal}</p>}
                </div>
                <StatusBadge status={isActive ? "Active" : now < new Date(s.startDate).getTime() ? "Planning" : "Completed"} />
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{done} / {sTasks.length} tasks done</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
                </div>
              </div>
              {canManage && (
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setEditing(s)} className="btn-ghost">Edit</button>
                  <button onClick={() => remove(s.id)} className="btn-danger">Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {creating && <SprintModal onClose={() => setCreating(false)} />}
      {editing && <SprintModal sprint={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SprintModal({ sprint, onClose }: { sprint?: Sprint; onClose: () => void }) {
  const user = useAuth()!;
  const projects = db.get().projects.filter((p) => p.orgId === user.orgId);
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(sprint?.name ?? "");
  const [projectId, setProjectId] = useState(sprint?.projectId ?? projects[0]?.id ?? "");
  const [startDate, setStartDate] = useState(sprint?.startDate ?? today);
  const [endDate, setEndDate] = useState(sprint?.endDate ?? today);
  const [goal, setGoal] = useState(sprint?.goal ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sprint) {
      update((d) => ({ ...d, sprints: d.sprints.map((s) => s.id === sprint.id ? { ...s, name, projectId, startDate, endDate, goal } : s) }));
    } else {
      update((d) => ({ ...d, sprints: [...d.sprints, { id: uid(), orgId: user.orgId, name, projectId, startDate, endDate, goal }] }));
    }
    onClose();
  };

  return (
    <Modal onClose={onClose} title={sprint ? "Edit sprint" : "New sprint"}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Name"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Sprint 1" /></FormField>
        <FormField label="Project">
          <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start"><input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" /></FormField>
          <FormField label="End"><input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" /></FormField>
        </div>
        <FormField label="Goal (optional)"><textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} className="input" /></FormField>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary">Save sprint</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- WORKLOAD ---------------- */
function WorkloadTab() {
  const user = useAuth()!;
  const devs = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId && u.role === "developer"));
  const tasks = useStore(() => db.get().tasks.filter((t) => t.orgId === user.orgId));
  const logs = useStore(() => db.get().timeLogs.filter((l) => l.orgId === user.orgId));

  const weekAgo = Date.now() - 7 * 864e5;
  const rows = devs.map((d) => {
    const mine = tasks.filter((t) => t.assigneeId === d.id);
    const open = mine.filter((t) => t.status !== "Done").length;
    const highOpen = mine.filter((t) => t.status !== "Done" && t.priority === "High").length;
    const hoursWeek = logs.filter((l) => l.userId === d.id && new Date(l.date).getTime() >= weekAgo).reduce((s, l) => s + l.hours, 0);
    return { user: d, total: mine.length, open, highOpen, pending: mine.filter((t) => t.status === "Pending").length, inProgress: mine.filter((t) => t.status === "In Progress").length, done: mine.filter((t) => t.status === "Done").length, hoursWeek };
  }).sort((a, b) => b.open - a.open);
  const maxOpen = Math.max(1, ...rows.map((r) => r.open));

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr><Th>Developer</Th><Th>Load</Th><Th>Pending</Th><Th>In Progress</Th><Th>Done</Th><Th>High prio open</Th><Th>Hours / week</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No developers in this org.</td></tr>}
          {rows.map((r) => (
            <tr key={r.user.id} className="border-t border-border">
              <Td>
                <div className="font-medium">{r.user.name}</div>
                <div className="text-xs text-muted-foreground">{r.user.email}</div>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full" style={{ width: `${(r.open / maxOpen) * 100}%`, background: r.open >= maxOpen ? "var(--destructive)" : "var(--gradient-primary)" }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{r.open} open</span>
                </div>
              </Td>
              <Td>{r.pending}</Td>
              <Td>{r.inProgress}</Td>
              <Td className="text-muted-foreground">{r.done}</Td>
              <Td>{r.highOpen > 0 ? <PriorityBadge priority="High" /> : "—"}{r.highOpen > 1 && <span className="ml-1 text-xs text-muted-foreground">×{r.highOpen}</span>}</Td>
              <Td className="font-medium">{r.hoursWeek.toFixed(1)}h</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- REPORTS ---------------- */
function ReportsTab() {
  const user = useAuth()!;
  const projects = useStore(() => db.get().projects.filter((p) => p.orgId === user.orgId));
  const tasks = useStore(() => db.get().tasks.filter((t) => t.orgId === user.orgId));
  const logs = useStore(() => db.get().timeLogs.filter((l) => l.orgId === user.orgId));

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const totalHours = logs.reduce((s, l) => s + l.hours, 0);
  const velocity = (() => {
    const weekAgo = Date.now() - 7 * 864e5;
    return logs.filter((l) => new Date(l.date).getTime() >= weekAgo).length;
  })();

  const perProject = projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id);
    const done = pt.filter((t) => t.status === "Done").length;
    const hours = logs.filter((l) => pt.some((t) => t.id === l.taskId)).reduce((s, l) => s + l.hours, 0);
    const pct = pt.length === 0 ? 0 : Math.round((done / pt.length) * 100);
    return { p, total: pt.length, done, hours, pct };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total tasks" value={totalTasks} />
        <StatCard label="Completed" value={doneTasks} accent="success" hint={`${totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}% done`} />
        <StatCard label="Hours logged" value={totalHours.toFixed(1)} accent="primary" />
        <StatCard label="Logs this week" value={velocity} hint="team velocity" />
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Project progress</h3>
        <div className="space-y-3">
          {perProject.length === 0 && <p className="text-xs text-muted-foreground">No projects yet.</p>}
          {perProject.map(({ p, total, done, hours, pct }) => (
            <div key={p.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{done}/{total} tasks · {hours.toFixed(1)}h</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Task status breakdown</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["Pending", "In Progress", "Done"] as const).map((s) => {
            const n = tasks.filter((t) => t.status === s).length;
            const pct = totalTasks ? Math.round((n / totalTasks) * 100) : 0;
            return (
              <div key={s} className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">{s}</div>
                <div className="mt-1 text-2xl font-semibold">{n}</div>
                <div className="text-xs text-muted-foreground">{pct}% of all tasks</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


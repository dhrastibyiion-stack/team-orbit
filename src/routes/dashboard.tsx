import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useStore } from "@/lib/use-store";
import { db, signOut, update, uid, rollback, type Role, type Project, type Task, type Leave, type User } from "@/lib/store";
import { can, visibleTabs, defaultTabFor } from "@/lib/permissions";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Tab = "members" | "projects" | "tasks" | "leaves";

function Dashboard() {
  const user = useAuth();
  const navigate = useNavigate();
  const tabs = useMemo<{ id: Tab; label: string }[]>(
    () => (user ? visibleTabs(user.role) : []),
    [user?.role],
  );
  const [tab, setTab] = useState<Tab>(user ? defaultTabFor(user.role) : "tasks");

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
          <div className="mb-2 text-sm font-medium">{user.name}</div>
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
            <button onClick={() => { signOut(); navigate({ to: "/login" }); }} className="btn-ghost h-8">Sign out</button>
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

            {tab === "members" && <MembersTab />}
            {tab === "projects" && <ProjectsTab />}
            {tab === "tasks" && <TasksTab />}
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

/* ---------------- MEMBERS ---------------- */
function MembersTab() {
  const user = useAuth()!;
  const users = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId));
  const [open, setOpen] = useState(false);

  const canEdit = user.role === "admin";

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

  const canCreate = user.role === "admin";
  const canDelete = user.role === "admin";

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
                {(user.role === "admin" || user.role === "pm") && (
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
  const tasks = user.role === "developer" ? allTasks.filter((t) => t.assigneeId === user.id) : allTasks;
  const projects = useStore(() => db.get().projects.filter((p) => p.orgId === user.orgId));
  const users = useStore(() => db.get().users.filter((u) => u.orgId === user.orgId));
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = user.role === "admin" || user.role === "pm";

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
              <Th>Task</Th><Th>Project</Th><Th>Assignee</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                {user.role === "developer" ? "No tasks assigned to you yet." : "No tasks yet."}
              </td></tr>
            )}
            {tasks.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              const assignee = users.find((u) => u.id === t.assigneeId);
              return (
                <tr key={t.id} className="border-t border-border">
                  <Td>
                    <div className="font-medium">{t.title}</div>
                    {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                  </Td>
                  <Td className="text-muted-foreground">{proj?.name ?? "—"}</Td>
                  <Td className="text-muted-foreground">{assignee?.name ?? "Unassigned"}</Td>
                  <Td>
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value as Task["status"])}
                      className="input h-8 py-0 text-xs"
                    >
                      {["Pending", "In Progress", "Done"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Td>
                  <Td>
                    {canManage ? (
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(t)} className="btn-ghost">Edit</button>
                        <button onClick={() => remove(t.id)} className="btn-danger">Delete</button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
      {creating && <TaskModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function TaskModal({ task, onClose }: { task?: Task; onClose: () => void }) {
  const user = useAuth()!;
  const projects = db.get().projects.filter((p) => p.orgId === user.orgId);
  const developers = db.get().users.filter((u) => u.orgId === user.orgId && u.role === "developer");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? developers[0]?.id ?? "");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "Pending");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task) {
      update((d) => ({ ...d, tasks: d.tasks.map((t) => t.id === task.id ? { ...t, title, description, projectId, assigneeId, status } : t) }));
    } else {
      update((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), orgId: user.orgId, title, description, projectId, assigneeId, status }] }));
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
            <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
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
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])} className="input">
            {["Pending", "In Progress", "Done"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </FormField>
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
    update((d) => ({ ...d, leaves: d.leaves.map((l) => l.id === id ? { ...l, status } : l) }));
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
              const canDelete = user.role === "admin" || user.role === "pm" || (l.userId === user.id && l.status === "Pending");
              const canModerate = (user.role === "admin" || user.role === "pm") && l.status === "Pending";
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
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// silence unused
void ({} as User);

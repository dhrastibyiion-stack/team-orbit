// Client-side store using localStorage. Pure React.js demo.
export type Role = "admin" | "pm" | "developer";
export type User = { id: string; email: string; password: string; name: string; role: Role; orgId: string };
export type Org = { id: string; name: string; domain: string };
export type Member = { id: string; userId: string; orgId: string };
export type Project = { id: string; orgId: string; name: string; description: string; status: "Planning" | "Active" | "On Hold" | "Completed"; deadline: string };
export type Task = { id: string; orgId: string; projectId: string; title: string; description: string; assigneeId: string; status: "Pending" | "In Progress" | "Done" };
export type Leave = { id: string; orgId: string; userId: string; from: string; to: string; reason: string; status: "Pending" | "Approved" | "Rejected" };
export type TaskComment = { id: string; orgId: string; taskId: string; userId: string; body: string; createdAt: number };
export type TimeLog = { id: string; orgId: string; taskId: string; userId: string; hours: number; note: string; date: string; createdAt: number };
export type Notification = { id: string; orgId: string; userId: string; kind: "task_assigned" | "leave_status" | "task_comment"; title: string; body: string; href?: string; read: boolean; createdAt: number };

type DB = {
  users: User[];
  orgs: Org[];
  projects: Project[];
  tasks: Task[];
  leaves: Leave[];
  comments: TaskComment[];
  timeLogs: TimeLog[];
  notifications: Notification[];
  sessionUserId: string | null;
};

const KEY = "flowdesk_db_v1";

const empty: DB = { users: [], orgs: [], projects: [], tasks: [], leaves: [], comments: [], timeLogs: [], notifications: [], sessionUserId: null };

function read(): DB {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    // forward-compatible defaults for older snapshots
    return {
      ...empty,
      ...parsed,
      comments: parsed.comments ?? [],
      timeLogs: parsed.timeLogs ?? [],
      notifications: parsed.notifications ?? [],
    };
  } catch {
    return empty;
  }
}

function write(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const db = {
  get: read,
  set: write,
};

const uid = () => Math.random().toString(36).slice(2, 10);

export function signUp(input: { name: string; email: string; password: string; orgName: string }) {
  const cur = read();
  if (cur.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("Email already registered");
  }
  const domain = input.email.split("@")[1] || "yourdomain.com";
  const orgId = uid();
  const org: Org = { id: orgId, name: input.orgName, domain };
  const admin: User = { id: uid(), email: input.email, password: input.password, name: input.name, role: "admin", orgId };
  const pm: User = { id: uid(), email: `pm@${domain}`, password: "demo123", name: "Priya Manager", role: "pm", orgId };
  const dev: User = { id: uid(), email: `dev@${domain}`, password: "demo123", name: "Dev Singh", role: "developer", orgId };
  const dev2: User = { id: uid(), email: `dev2@${domain}`, password: "demo123", name: "Alex Coder", role: "developer", orgId };

  const proj: Project = { id: uid(), orgId, name: "Website Redesign", description: "Rebuild marketing site with new brand.", status: "Active", deadline: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) };
  const task1: Task = { id: uid(), orgId, projectId: proj.id, title: "Build hero section", description: "Implement responsive hero.", assigneeId: dev.id, status: "In Progress" };
  const task2: Task = { id: uid(), orgId, projectId: proj.id, title: "Wire up contact form", description: "POST to /contact.", assigneeId: dev2.id, status: "Pending" };

  const next: DB = {
    ...cur,
    users: [...cur.users, admin, pm, dev, dev2],
    orgs: [...cur.orgs, org],
    projects: [...cur.projects, proj],
    tasks: [...cur.tasks, task1, task2],
    leaves: cur.leaves,
    sessionUserId: admin.id,
  };
  write(next);
  return admin;
}

export function signIn(email: string, password: string) {
  const cur = read();
  const user = cur.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) throw new Error("Invalid email or password");
  write({ ...cur, sessionUserId: user.id });
  return user;
}

export function signOut() {
  const cur = read();
  write({ ...cur, sessionUserId: null });
}

export function currentUser(): User | null {
  const cur = read();
  if (!cur.sessionUserId) return null;
  return cur.users.find((u) => u.id === cur.sessionUserId) ?? null;
}

export function rollback() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  write(empty);
}

// CRUD helpers
export function update(fn: (d: DB) => DB) {
  write(fn(read()));
}

export function notify(input: { orgId: string; userId: string; kind: Notification["kind"]; title: string; body: string }) {
  update((d) => ({
    ...d,
    notifications: [
      { id: uid(), createdAt: Date.now(), read: false, ...input },
      ...d.notifications,
    ],
  }));
}

export { uid };

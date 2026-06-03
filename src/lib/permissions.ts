import type { Role, User, Task, Leave } from "./store";

// Single source of truth for role-based access control.
// Admin = full access. PM = manage tasks/leaves + limited project edits, read-only members.
// Developer = own tasks (status only) + own leave requests + My Work dashboard.

export const can = {
  // Tab visibility
  viewMyWork: (r: Role) => r === "developer",
  viewMembers: (r: Role) => r === "admin" || r === "pm",
  viewProjects: (r: Role) => r === "admin" || r === "pm",
  viewTasks: (_r: Role) => true,
  viewLeaves: (_r: Role) => true,
  viewWorkload: (r: Role) => r === "admin" || r === "pm",
  viewSprints: (r: Role) => r === "admin" || r === "pm",
  viewReports: (r: Role) => r === "admin" || r === "pm",

  // Sprints
  manageSprints: (r: Role) => r === "admin" || r === "pm",

  // Members
  addMember: (r: Role) => r === "admin",
  removeMember: (r: Role) => r === "admin",
  editMemberRole: (r: Role) => r === "admin",

  // Projects
  createProject: (r: Role) => r === "admin",
  deleteProject: (r: Role) => r === "admin",
  editProjectFull: (r: Role) => r === "admin",
  editProjectLimited: (r: Role) => r === "admin" || r === "pm",

  // Tasks
  createTask: (r: Role) => r === "admin" || r === "pm",
  deleteTask: (r: Role) => r === "admin" || r === "pm",
  editTaskFull: (r: Role) => r === "admin" || r === "pm",
  updateTaskStatus: (u: User, t: Task) =>
    u.role === "admin" || u.role === "pm" || (u.role === "developer" && t.assigneeId === u.id),
  commentOnTask: (u: User, t: Task) =>
    u.role === "admin" || u.role === "pm" || (u.role === "developer" && t.assigneeId === u.id),
  logTimeOnTask: (u: User, t: Task) =>
    u.role === "developer" && t.assigneeId === u.id,

  // Leaves
  createLeave: (_r: Role) => true,
  moderateLeave: (r: Role) => r === "admin" || r === "pm",
  deleteLeave: (u: User, l: Leave) => {
    if (u.role === "admin") return true;
    if (u.role === "pm") return true;
    return l.userId === u.id && l.status === "Pending";
  },
};

export type TabId = "mywork" | "members" | "projects" | "tasks" | "leaves";

export function visibleTabs(role: Role) {
  const tabs: { id: TabId; label: string }[] = [];
  if (can.viewMyWork(role)) tabs.push({ id: "mywork", label: "My Work" });
  if (can.viewMembers(role)) tabs.push({ id: "members", label: "Members" });
  if (can.viewProjects(role)) tabs.push({ id: "projects", label: "Projects" });
  if (can.viewTasks(role)) tabs.push({ id: "tasks", label: "Tasks" });
  if (can.viewLeaves(role)) tabs.push({ id: "leaves", label: "Leave Requests" });
  return tabs;
}

export function defaultTabFor(role: Role): TabId {
  if (role === "admin") return "members";
  if (role === "pm") return "projects";
  return "mywork";
}

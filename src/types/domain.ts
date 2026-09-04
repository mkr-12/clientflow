export const PROJECT_STATUSES = ["new", "hearing", "quoted", "won", "in_progress", "delivered", "lost"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MemberRole = "admin" | "member";

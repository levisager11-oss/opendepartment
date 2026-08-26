export type AdminFile = {
  id: string;
  title: string;
  category: string;
  kind: string;
  size_bytes: number;
  score: number;
  upvotes: number;
  downvotes: number;
  report_count: number;
  created_at: string;
  owner_id: string;
  case_number: number;
  owner_username: string | null;
  owner_email: string | null;
};

export type AdminReport = {
  id: string;
  file_id: string | null;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  file_title: string | null;
  reporter_username: string | null;
};

export type AdminUser = {
  id: string;
  username: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  email: string | null;
  file_count: number;
};

export type AdminSubject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  file_count: number;
};

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  target: string | null;
  detail: unknown;
  created_at: string;
  actor_username: string | null;
};

export type InviteEntry = {
  code: string;
  note: string | null;
  max_uses: number | null;
  uses: number;
  grants_admin: boolean;
  expires_at: string | null;
  created_at: string;
};

/** The department's own `settings` row, as the settings screen edits it. */
export type DepartmentSettings = {
  department_name: string;
  tagline: string | null;
  subject_label: string;
  docket_prefix: string;
  seal_top: string;
  seal_bottom: string;
  accent: string;
  categories: string[];
  max_upload_mb: number;
  operator_name: string | null;
  operator_contact: string | null;
};

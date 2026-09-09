export type FileKind = "image" | "pdf" | "video" | "audio" | "other";

export type Subject = {
  id: string;
  name: string;
  description?: string | null;
};

export type CaseFile = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  kind: FileKind;
  mime_type: string;
  size_bytes: number;
  original_name: string;
  storage_path: string;
  /** The small copy, when one was made. Null is normal -- see thumbnail.ts. */
  thumb_path: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  view_count: number;
  case_number: number;
  created_at: string;
  owner_id: string;
  owner_username: string | null;
  subjects: Subject[];
  /** Only populated for admins. */
  owner_email?: string | null;
  /** The signed-in user's own vote: 1, -1 or 0. */
  my_vote?: number;
};

export type Comment = {
  id: string;
  file_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username: string | null;
};

export type Profile = {
  id: string;
  username: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  email?: string | null;
  file_count?: number;
};

export type Report = {
  id: string;
  file_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
};

export type Invite = {
  code: string;
  note: string | null;
  max_uses: number | null;
  uses: number;
  grants_admin: boolean;
  expires_at: string | null;
  created_at: string;
};

export type SortKey = "top" | "new" | "worst" | "views" | "discussed";

/** The bucket every department stores its exhibits in. */
export const STORAGE_BUCKET = "department-files";

/**
 * How long a signed exhibit link stays good, in seconds.
 *
 * This number is how long deletion and banning take to actually bite. A signed
 * Storage URL carries its own authorisation and cannot be revoked -- there is
 * no list to remove it from -- so between the moment a document is deleted, or
 * a member is banned, and the moment their outstanding links stop working,
 * exactly this much time passes. At the hour it used to be, "delete" meant
 * "delete, and it remains readable to anyone who had the page open until after
 * lunch", which is not what the button says and not what somebody asking for a
 * document about them to come down is being promised.
 *
 * Ten minutes is the trade. It is longer than reading a page and shorter than
 * leaving one open, the file view already offers a retry that mints a fresh
 * link when a stale one fails, and a vault thumbnail that expires behind an
 * idle tab costs a reload. Shorter would start costing people mid-video.
 */
export const SIGNED_URL_TTL = 600;

/**
 * The objects a delete_file() call left for the caller to remove.
 *
 * The function has had two return shapes and both are live at once. A
 * department running schema 2 or older hands back the storage path as a bare
 * string; from schema 3 it hands back an object carrying the thumbnail beside
 * it. The app deploys before any administrator re-runs the file -- that is the
 * whole reason the version notice exists -- so reading only the new shape
 * would silently start leaving originals behind in every department that has
 * not updated yet.
 *
 * Anything unrecognised yields nothing to remove, which leaves the objects for
 * the administrator's orphan sweep rather than throwing away a deletion.
 */
export function deletedObjectPaths(data: unknown): string[] {
  if (typeof data === "string") return data ? [data] : [];
  if (data && typeof data === "object") {
    const list = (data as { storage_paths?: unknown }).storage_paths;
    if (Array.isArray(list)) {
      return list.filter((p): p is string => typeof p === "string" && p !== "");
    }
  }
  return [];
}

/**
 * Categories a department starts with. A department can replace this list
 * entirely from its settings, so nothing in the code may assume these values.
 */
export const DEFAULT_CATEGORIES = [
  "EXHIBIT",
  "WITNESS STATEMENT",
  "SURVEILLANCE",
  "MEMORANDUM",
  "TRANSCRIPT",
  "CORRESPONDENCE",
  "MISCELLANEOUS",
] as const;

export const ACCEPTED_MIME: Record<string, FileKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/avif": "image",
  "image/heic": "image",
  "image/heif": "image",
  "application/pdf": "pdf",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "video/x-m4v": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/webm": "audio",
  "audio/ogg": "audio",
};

export function kindFromMime(mime: string): FileKind {
  return ACCEPTED_MIME[mime] ?? "other";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Zero-padded docket number. The prefix comes from the department's settings,
 * so the same code renders LF-0007 for one archive and MOM-0007 for another.
 */
export function caseLabel(n: number, prefix: string): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

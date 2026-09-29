import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ visibility: "unlisted" }));
vi.mock("@/lib/control/departments", () => ({
  resolveDepartment: async (slug: string) => ({
    slug, supabase_url: "https://x.supabase.co", anon_key: "k",
    display_name: "Quiet Archive", tagline: null, visibility: state.visibility,
  }),
}));
vi.mock("@/lib/tenant/branding", () => ({ getBranding: async () => ({ departmentName: "Quiet Archive" }) }));
vi.mock("@/lib/i18n/detect", () => ({ detectLocale: async () => "en" }));
vi.mock("@/lib/tenant/legal", () => ({
  getDeptLegalDoc: () => ({ title: "Imprint", description: "Who runs this archive." }),
}));
import { deptLegalMetadata } from "@/lib/tenant/legal-page";

const metadataFor = () =>
  deptLegalMetadata("imprint")({ params: Promise.resolve({ slug: "quiet" }) });

beforeEach(() => { state.visibility = "unlisted"; });

it("keeps an unlisted department's legal pages out of search results", async () => {
  expect((await metadataFor()).robots).toEqual({ index: false, follow: false });
});

it("lets a public department's legal pages be indexed", async () => {
  state.visibility = "public";
  expect((await metadataFor()).robots).toEqual({ index: true, follow: true });
});

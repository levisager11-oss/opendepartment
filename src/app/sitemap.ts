import type { MetadataRoute } from "next";
import { publicDirectory } from "@/lib/control/departments";
import { absolute } from "@/lib/seo";

/**
 * Rebuilt hourly rather than at build time: departments appear in the
 * directory when their owners flip a switch, not when we deploy.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absolute("/"), lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: absolute("/directory"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absolute("/legal/terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absolute("/legal/privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // A department that is unreachable or a control plane that is not configured
  // must not take the sitemap down with it -- an empty department list is a
  // valid sitemap, a 500 is not.
  let departments: MetadataRoute.Sitemap = [];
  try {
    departments = (await publicDirectory()).map((dept) => ({
      url: absolute(`/d/${dept.slug}`),
      lastModified: new Date(dept.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // fall through with the static routes only
  }

  return [...staticRoutes, ...departments];
}

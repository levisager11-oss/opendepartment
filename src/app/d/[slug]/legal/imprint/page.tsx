import { DeptLegalPage, deptLegalMetadata } from "@/lib/tenant/legal-page";

export const generateMetadata = deptLegalMetadata("imprint");

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <DeptLegalPage doc="imprint" params={params} />;
}

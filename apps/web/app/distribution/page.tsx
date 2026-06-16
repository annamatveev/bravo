import { DistributionPanel } from "@/components/distribution/DistributionPanel";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export default function DistributionPage() {
  return <DistributionPanel />;
}

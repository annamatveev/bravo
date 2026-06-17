import { EvalsConfig } from "@/components/evals/EvalsConfig";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export default function EvalsPage() {
  return <EvalsConfig />;
}

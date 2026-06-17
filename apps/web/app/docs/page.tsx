import { ApiExplorer } from "@/components/docs/ApiExplorer";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export default function DocsPage() {
  return <ApiExplorer />;
}

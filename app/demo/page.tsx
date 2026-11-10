import { notFound } from "next/navigation";
import Workspace from "../components/workspace";
export const dynamic = "force-dynamic";
export default function LocalDemo() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ACCOUNTPILOT_ENABLE_LOCAL_DEMO !== "true"
  )
    notFound();
  return <Workspace />;
}

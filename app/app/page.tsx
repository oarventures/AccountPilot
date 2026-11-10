import { redirect } from "next/navigation";
import { memberAccess, AccessError } from "@/lib/server/access";
import Workspace from "../components/workspace";
export const dynamic = "force-dynamic";
export default async function MemberWorkspace() {
  let memberId: string;
  try {
    memberId = (await memberAccess()).user.id;
  } catch (error) {
    if (error instanceof AccessError && error.status === 403)
      redirect("/membership");
    if (
      error instanceof AccessError &&
      (error.status === 401 || error.status === 503)
    )
      redirect("/login");
    throw error;
  }
  return <Workspace key={memberId} memberId={memberId} />;
}

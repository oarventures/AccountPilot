import { memberAccess, json, apiError } from "@/lib/server/access";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { user, membership } = await memberAccess();
    return json({ userId: user.id, accessUntil: membership.access_until });
  } catch (error) {
    return apiError(error);
  }
}

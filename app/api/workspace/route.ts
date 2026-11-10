import {
  memberAccess,
  sameOrigin,
  json,
  apiError,
  AccessError,
  readJson,
} from "@/lib/server/access";
import { validData } from "@/lib/workspace-data";
import { migrateDemo, allDocuments } from "@/lib/context";
export const dynamic = "force-dynamic";
async function workspaceAccess(request: Request) {
  const auth = await memberAccess();
  if (request.headers.get("x-accountpilot-user") !== auth.user.id)
    throw new AccessError(
      401,
      "Your signed-in account changed. Reopen the workspace before continuing.",
    );
  return auth;
}
export async function GET(request: Request) {
  try {
    const { client, user } = await workspaceAccess(request);
    const { data, error } = await client
      .from("workspaces")
      .select("payload,revision")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error)
      throw new AccessError(503, "Your workspace could not be loaded.");
    return json({
      data: data?.payload ?? null,
      revision: data?.revision ?? 0,
      userId: user.id,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { client, user } = await workspaceAccess(request);
    sameOrigin(request);
    const body = await readJson(request);
    if (
      !body ||
      typeof body !== "object" ||
      !("data" in body) ||
      !("revision" in body) ||
      !Number.isSafeInteger(body.revision) ||
      Number(body.revision) < 0 ||
      !validData(body.data)
    )
      throw new AccessError(400, "Invalid workspace or revision.");
    const data = migrateDemo(body.data);
    if (allDocuments(data.context!).reduce((n, d) => n + d.bytes, 0) > 800000)
      throw new AccessError(413, "Attachment allowance exceeded.");
    const revision = Number(body.revision);
    const result =
      revision === 0
        ? await client
            .from("workspaces")
            .insert({ user_id: user.id, payload: data, revision: 1 })
            .select("revision")
            .single()
        : await client
            .from("workspaces")
            .update({
              payload: data,
              revision: revision + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("revision", revision)
            .select("revision")
            .maybeSingle();
    if (result.error?.code === "23505" || (!result.error && !result.data))
      throw new AccessError(
        409,
        "A newer workspace exists. Reload before saving; your unsaved copy has not replaced it.",
      );
    if (result.error) throw new AccessError(503, "Workspace was not saved.");
    return json({ revision: result.data!.revision, userId: user.id });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { client, user } = await workspaceAccess(request);
    sameOrigin(request);
    const { error } = await client
      .from("workspaces")
      .delete()
      .eq("user_id", user.id);
    if (error) throw new AccessError(503, "Workspace deletion failed.");
    return json({ deleted: true, userId: user.id });
  } catch (error) {
    return apiError(error);
  }
}

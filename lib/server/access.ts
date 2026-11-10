import "server-only";
import { userClient } from "./supabase";
import { authConfigured, appUrl } from "./config";
import { hasPaidAccess, trustedOrigin } from "../membership-policy";
export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function identity() {
  if (!authConfigured())
    throw new AccessError(503, "Membership setup is not complete.");
  const client = await userClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new AccessError(401, "Sign in to continue.");
  return { client, user };
}
export async function memberAccess() {
  const auth = await identity();
  const { data, error } = await auth.client
    .from("memberships")
    .select("status,access_until,stripe_customer_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error)
    throw new AccessError(
      503,
      "Membership could not be verified. Please retry.",
    );
  if (!hasPaidAccess(data))
    throw new AccessError(403, "An active paid membership is required.");
  return { ...auth, membership: data! };
}
export function sameOrigin(request: Request) {
  if (!trustedOrigin(request.headers.get("origin"), appUrl()))
    throw new AccessError(403, "This request origin is not allowed.");
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function apiError(error: unknown) {
  return error instanceof AccessError
    ? json({ error: error.message }, error.status)
    : json(
        { error: "The request could not be completed. No access was granted." },
        503,
      );
}
export async function readRawText(
  request: Request,
  limit = 3_000_000,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "A request body is required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new AccessError(413, "Workspace exceeds the request size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function readJson(
  request: Request,
  limit = 3_000_000,
): Promise<unknown> {
  const raw = await readRawText(request, limit);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AccessError(400, "Invalid JSON.");
  }
}

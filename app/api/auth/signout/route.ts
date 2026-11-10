import { sameOrigin, identity, apiError, json } from "@/lib/server/access";
export async function POST(request: Request) {
  try {
    const { client } = await identity();
    sameOrigin(request);
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return json({ redirect: "/login" });
  } catch (error) {
    return apiError(error);
  }
}

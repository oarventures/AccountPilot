import { userClient } from "@/lib/server/supabase";
import { authConfigured, appUrl } from "@/lib/server/config";
import {
  sameOrigin,
  json,
  apiError,
  AccessError,
  readJson,
} from "@/lib/server/access";
export async function POST(request: Request) {
  try {
    if (!authConfigured())
      throw new AccessError(503, "Membership setup is not complete.");
    sameOrigin(request);
    const body = (await readJson(request, 10000)) as {
      email?: unknown;
      password?: unknown;
      action?: unknown;
    };
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !/^\S+@\S+\.\S+$/.test(body.email) ||
      body.email.length > 254 ||
      body.password.length < 12 ||
      body.password.length > 128 ||
      !["signup", "login"].includes(String(body.action))
    )
      throw new AccessError(
        400,
        "Use a valid email and a password of 12–128 characters.",
      );
    const client = await userClient();
    if (body.action === "signup") {
      const { error } = await client.auth.signUp({
        email: body.email,
        password: body.password,
        options: { emailRedirectTo: appUrl() + "/auth/callback" },
      });
      if (error)
        throw new AccessError(
          400,
          "Sign-up could not be completed. Please retry or sign in.",
        );
      return json({
        message: "Check your email to confirm your account, then sign in.",
      });
    }
    const { error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error)
      throw new AccessError(
        401,
        "Sign-in failed. Check your details and email confirmation.",
      );
    return json({ redirect: "/app" });
  } catch (error) {
    return apiError(error);
  }
}

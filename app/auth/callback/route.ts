import { NextResponse } from "next/server";
import { appUrl, authConfigured } from "@/lib/server/config";
import { userClient } from "@/lib/server/supabase";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!authConfigured())
    return new Response("Membership setup is incomplete.", { status: 503 });
  const target = new URL("/login", appUrl());
  target.searchParams.set("confirmation", "failed");
  if (code) {
    const client = await userClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/membership", appUrl()));
  }
  return NextResponse.redirect(target);
}

"use client";
import { useState } from "react";
export function MemberAction({
  endpoint,
  children,
  disabled = false,
}: {
  endpoint: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="primary"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            const body = await response.json();
            if (!response.ok)
              throw new Error(body.error || "The request failed.");
            if (
              endpoint === "/api/auth/signout" &&
              typeof BroadcastChannel !== "undefined"
            ) {
              const channel = new BroadcastChannel("accountpilot-session");
              channel.postMessage({ type: "signed-out" });
              channel.close();
            }
            const target = body.url || body.redirect;
            if (typeof target !== "string")
              throw new Error("No destination was returned.");
            if (target.startsWith("/") && !target.startsWith("//"))
              window.location.assign(target);
            else {
              const url = new URL(target);
              if (
                url.protocol !== "https:" ||
                !["checkout.stripe.com", "billing.stripe.com"].includes(
                  url.hostname,
                )
              )
                throw new Error("Unexpected billing destination.");
              window.location.assign(url.href);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Please retry.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Please wait…" : children}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function LoginForm({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="member-switch">
        <button
          aria-pressed={mode === "login"}
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          aria-pressed={mode === "signup"}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: mode,
                email: f.get("email"),
                password: f.get("password"),
              }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || "Please retry.");
            if (body.redirect) {
              if (typeof BroadcastChannel !== "undefined") {
                const channel = new BroadcastChannel("accountpilot-session");
                channel.postMessage({ type: "signed-in" });
                channel.close();
              }
              window.location.assign("/app");
            } else setMessage(body.message);
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Could not connect.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email address
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            disabled={!enabled || busy}
          />
        </label>
        <label>
          Password (12–128 characters)
          <input
            type="password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            disabled={!enabled || busy}
          />
        </label>
        <button className="primary" disabled={!enabled || busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
      <p className="muted">
        Confirm your email before signing in. Creating an account does not grant
        paid access. Passwords are handled by the authentication provider and
        are not saved in your workspace.
      </p>
    </>
  );
}

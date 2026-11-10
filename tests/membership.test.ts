import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasPaidAccess,
  trustedOrigin,
  mayApplyEvent,
} from "../lib/membership-policy";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import Stripe from "stripe";
test("membership fails closed for absent, expired, malformed or inactive access", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  assert.equal(hasPaidAccess(null, now), false);
  assert.equal(
    hasPaidAccess({ status: "active", access_until: "invalid" }, now),
    false,
  );
  assert.equal(
    hasPaidAccess(
      { status: "active", access_until: "2026-11-09T11:59:59Z" },
      now,
    ),
    false,
  );
  assert.equal(
    hasPaidAccess({ status: "trialing", access_until: "2099-01-01" }, now),
    false,
  );
  assert.equal(
    hasPaidAccess({ status: "active", access_until: "2099-01-01" }, now),
    true,
  );
});
test("state-changing requests require the configured origin", () => {
  assert.equal(trustedOrigin(null, "https://accountpilot.example"), false);
  assert.equal(
    trustedOrigin("https://attacker.example", "https://accountpilot.example"),
    false,
  );
  assert.equal(
    trustedOrigin(
      "https://accountpilot.example.attacker.example",
      "https://accountpilot.example",
    ),
    false,
  );
  assert.equal(
    trustedOrigin(
      "https://accountpilot.example",
      "https://accountpilot.example",
    ),
    true,
  );
});
test("older billing events cannot restore expired or canceled access", () => {
  const current = {
    subscription_created: 100,
    event_created: 300,
    status: "inactive",
  };
  assert.equal(
    mayApplyEvent(current, {
      subscription_created: 100,
      event_created: 200,
      status: "active",
    }),
    false,
  );
  assert.equal(
    mayApplyEvent(current, {
      subscription_created: 100,
      event_created: 300,
      status: "active",
    }),
    false,
  );
  assert.equal(
    mayApplyEvent(current, {
      subscription_created: 100,
      event_created: 300,
      status: "inactive",
    }),
    true,
  );
});
test("Stripe signature verification rejects tampering and unsigned events", () => {
  const stripe = new Stripe("sk_test_unit_fixture_not_a_real_key");
  const secret = "unit-test-signing-fixture";
  const payload = JSON.stringify({
    id: "evt_fixture",
    type: "customer.subscription.updated",
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  assert.equal(
    stripe.webhooks.constructEvent(payload, signature, secret).id,
    "evt_fixture",
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload + " ", signature, secret),
  );
  assert.throws(() => stripe.webhooks.constructEvent(payload, "", secret));
});
test("actual PostgreSQL policies isolate users and keep billing privileges server-only", async (t) => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222",
    c = "33333333-3333-4333-8333-333333333333";
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/001_private_membership.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/002_account_attachments.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.query("insert into auth.users(id) values($1),($2),($3)", [a, b, c]);
  const asUser = async (id: string) => {
    await db.exec("reset role; set role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  const event = async (
    eventId: string,
    userId: string,
    status: string,
    created: number,
    subCreated = 100,
    subId = "sub_" + userId,
  ) => {
    await db.exec("reset role; set role service_role;");
    await db.query(
      "select public.apply_subscription_event($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        eventId,
        userId,
        "cus_" + userId,
        subId,
        status,
        status === "active" ? "2099-01-01T00:00:00Z" : null,
        subCreated,
        created,
      ],
    );
  };
  try {
    await event("evt_a", a, "active", 100);
    await event("evt_b", b, "active", 100);
    await t.test("paid users can save their own workspace", async () => {
      await asUser(a);
      await db.query(
        "insert into public.workspaces(user_id,payload) values($1,$2)",
        [a, { private: "User A fictional plan" }],
      );
      await asUser(b);
      await db.query(
        "insert into public.workspaces(user_id,payload) values($1,$2)",
        [b, { private: "User B fictional plan" }],
      );
    });
    await t.test(
      "another paid user cannot read or overwrite a known owner ID",
      async () => {
        await asUser(b);
        assert.equal(
          (
            await db.query("select * from public.workspaces where user_id=$1", [
              a,
            ])
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "update public.workspaces set payload=$1 where user_id=$2 returning user_id",
              [{ private: "attack" }, a],
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "delete from public.workspaces where user_id=$1 returning user_id",
              [a],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.workspaces(user_id,payload) values($1,$2)",
            [a, {}],
          ),
        );
        await assert.rejects(
          db.query(
            "insert into public.workspaces(user_id,payload) values($1,$2)",
            [c, {}],
          ),
          /row-level security/,
        );
        await assert.rejects(
          db.query("update public.workspaces set user_id=$1 where user_id=$2", [
            c,
            b,
          ]),
          /row-level security/,
        );
      },
    );
    await t.test(
      "users cannot change their own paid entitlement or call the billing function",
      async () => {
        await asUser(c);
        await assert.rejects(
          db.query(
            "insert into public.memberships(user_id,stripe_customer_id,stripe_subscription_id,status,access_until,subscription_created,event_created) values($1,'fake','fake','active','2099-01-01',1,1)",
            [c],
          ),
        );
        await assert.rejects(
          db.query(
            "select public.apply_subscription_event('fake',$1,'fake','fake','active','2099-01-01',1,1)",
            [c],
          ),
        );
        await assert.rejects(
          db.query(
            "update public.memberships set status='active' where user_id=$1",
            [c],
          ),
        );
      },
    );
    await t.test(
      "unpaid and anonymous users cannot access account memory",
      async () => {
        await asUser(c);
        assert.equal(
          (await db.query("select * from public.workspaces")).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.workspaces(user_id,payload) values($1,$2)",
            [c, {}],
          ),
        );
        await db.exec("reset role;set role anon;");
        await assert.rejects(db.query("select * from public.workspaces"));
      },
    );
    await t.test(
      "replayed and out-of-order billing events do not restore access",
      async () => {
        await event("evt_cancel", a, "inactive", 300);
        await event("evt_old", a, "active", 200);
        await event("evt_same_second", a, "active", 300);
        await event("evt_cancel", a, "active", 400);
        await asUser(a);
        assert.equal(
          (await db.query("select * from public.workspaces")).rows.length,
          0,
        );
        const result = await db.query<{ status: string }>(
          "select status from public.memberships",
        );
        assert.equal(result.rows[0].status, "inactive");
      },
    );
    await t.test(
      "a newer subscription wins over late events from an old one",
      async () => {
        await event("evt_new_subscription", a, "active", 500, 400, "sub_new");
        await event(
          "evt_old_subscription_cancel",
          a,
          "inactive",
          700,
          100,
          "sub_" + a,
        );
        await asUser(a);
        assert.equal(
          (await db.query("select * from public.workspaces")).rows.length,
          1,
        );
      },
    );
    await t.test(
      "expired membership denies access even if its status says active",
      async () => {
        await db.exec("reset role;");
        await db.query(
          "update public.memberships set access_until='2000-01-01' where user_id=$1",
          [a],
        );
        await asUser(a);
        assert.equal(
          (await db.query("select * from public.workspaces")).rows.length,
          0,
        );
      },
    );
    await t.test("membership rows reveal only the current user", async () => {
      await asUser(b);
      const rows = (
        await db.query<{ user_id: string }>(
          "select user_id from public.memberships",
        )
      ).rows;
      assert.deepEqual(
        rows.map((r) => r.user_id),
        [b],
      );
    });
    await t.test(
      "billing service is not granted access to workspace contents",
      async () => {
        await db.exec("reset role;set role service_role;");
        await assert.rejects(db.query("select * from public.workspaces"));
      },
    );
  } finally {
    await db.close();
  }
});

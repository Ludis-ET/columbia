#!/usr/bin/env node
/**
 * Creates (or updates) a local dev admin account in Supabase Auth + profiles.
 *
 * Requires the service-role key in the environment. This script is the ONE
 * place that needs it — the Next.js app deliberately never loads it.
 *
 *   1. Supabase dashboard → Project Settings → API → service_role (secret)
 *   2. Add to .env.local (do NOT commit):
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   3. pnpm admin:seed
 *
 * Safe to re-run: upserts the profile and resets the dev password.
 */

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

/** Dev-only credentials printed after a successful run. */
const DEV_ADMIN = {
  email: "admin@columbiacare.local",
  password: "ColumbiaDev-Admin2026!",
  fullName: "Columbia Care",
  role: "owner",
};

async function loadEnv() {
  try {
    const text = await readFile(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* env may come from the shell instead */
  }
}

await loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`
Missing Supabase credentials.

  NEXT_PUBLIC_SUPABASE_URL          — already in .env.local
  SUPABASE_SERVICE_ROLE_KEY       — add from Supabase → Settings → API → service_role

Then run:  pnpm admin:seed
`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Find an auth user by email (admin list is paginated). */
async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

let userId;

const existing = await findUserByEmail(DEV_ADMIN.email);

if (existing) {
  userId = existing.id;
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: DEV_ADMIN.password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Updated existing auth user: ${DEV_ADMIN.email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: DEV_ADMIN.email,
    password: DEV_ADMIN.password,
    email_confirm: true,
    user_metadata: { full_name: DEV_ADMIN.fullName },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created auth user: ${DEV_ADMIN.email}`);
}

const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: userId,
    email: DEV_ADMIN.email,
    full_name: DEV_ADMIN.fullName,
    role: DEV_ADMIN.role,
  },
  { onConflict: "id" },
);

if (profileError) throw profileError;

console.log(`
Dev admin ready.

  URL:      /admin/login  (http://localhost:3000/admin/login when running locally)
  Email:    ${DEV_ADMIN.email}
  Password: ${DEV_ADMIN.password}
  Role:     ${DEV_ADMIN.role}

Change these before any real deployment. This account is for local development only.
`);

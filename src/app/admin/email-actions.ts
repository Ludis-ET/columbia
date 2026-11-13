"use server";

import { getAdminProfile } from "@/lib/db/server";
import { verifyEmailConnection } from "@/lib/email/send";

export interface EmailConnectionState {
  ok: boolean;
  message: string;
}

export async function checkEmailConnection(): Promise<EmailConnectionState> {
  const profile = await getAdminProfile();
  if (profile?.role !== "owner") {
    return { ok: false, message: "Only the signed-in owner can check email settings." };
  }
  return verifyEmailConnection();
}

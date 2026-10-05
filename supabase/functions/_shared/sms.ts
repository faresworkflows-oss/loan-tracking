// Shared Africa's Talking SMS helper, used by every edge function that
// needs to notify a borrower. One-way SMS only.
//
// Requires these secrets set in Supabase (Settings -> Edge Functions -> Secrets):
//   AT_USERNAME   e.g. "sandbox" for testing, your live username in production
//   AT_API_KEY    from your Africa's Talking account
//   AT_SENDER_ID  optional — a registered short code/alphanumeric sender ID
//   AT_ENV        "sandbox" | "production" (defaults to "sandbox" if unset)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SmsType = "reminder" | "overdue" | "payment_received" | "account_created";

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; raw?: unknown; error?: string }> {
  const username = Deno.env.get("AT_USERNAME");
  const apiKey = Deno.env.get("AT_API_KEY");
  const senderId = Deno.env.get("AT_SENDER_ID");
  const env = Deno.env.get("AT_ENV") ?? "sandbox";

  if (!username || !apiKey) {
    return { ok: false, error: "AT_USERNAME / AT_API_KEY not configured" };
  }

  const baseUrl =
    env === "production"
      ? "https://api.africastalking.com/version1/messaging"
      : "https://api.sandbox.africastalking.com/version1/messaging";

  const body = new URLSearchParams({ username, to, message });
  if (senderId) body.set("from", senderId);

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    const json = await res.json();
    const recipients = json?.SMSMessageData?.Recipients ?? [];
    const failed = recipients.find((r: { status: string }) => r.status !== "Success");
    if (!res.ok || failed) {
      return { ok: false, raw: json, error: failed?.status ?? `HTTP ${res.status}` };
    }
    return { ok: true, raw: json };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Sends an SMS and logs the attempt to notifications_log, regardless of outcome. */
export async function sendAndLog(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  borrowerId: string | null;
  phone: string;
  type: SmsType;
  message: string;
}): Promise<{ ok: boolean }> {
  const admin = createClient(params.supabaseUrl, params.serviceRoleKey);
  const result = await sendSms(params.phone, params.message);

  await admin.from("notifications_log").insert({
    borrower_id: params.borrowerId,
    type: params.type,
    message: params.message,
    status: result.ok ? "sent" : "failed",
    provider_message_id:
      (result.raw as { SMSMessageData?: { Recipients?: { messageId?: string }[] } } | undefined)
        ?.SMSMessageData?.Recipients?.[0]?.messageId ?? null,
  });

  return { ok: result.ok };
}

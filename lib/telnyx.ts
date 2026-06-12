/**
 * Direct Telnyx send — a single API call is not orchestration (n8n policy),
 * so OTP texts go straight from the server action. The from-number is config
 * only: swapping to the dedicated EasyCaseload number is an env edit.
 */
export async function sendSms(to: string, text: string): Promise<{ error: string | null }> {
  const apiKey = process.env.TELNYX_API_KEY
  const from = process.env.TELNYX_FROM_NUMBER
  if (!apiKey || !from) return { error: "Text messaging is not configured yet" }

  const res = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, text }),
  })

  if (!res.ok) return { error: `Could not send the text message (${res.status})` }
  return { error: null }
}

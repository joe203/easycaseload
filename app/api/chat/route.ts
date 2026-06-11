import { anthropic } from "@ai-sdk/anthropic"
import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    // Anthropic only (CLAUDE.md §9). Haiku for fast, low-cost support chat.
    // This is the public FAQ assistant — the full assistant identity arrives
    // with the intelligence pipeline (Phase 6+, CLAUDE.md §13).
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `You are the EasyCaseload assistant, a helpful and friendly AI that answers questions about the EasyCaseload platform.

EasyCaseload is an AI administrative assistant for itinerant teachers — educators and specialists (like speech-language pathologists and occupational therapists) who travel between school campuses serving students. It handles the paperwork so teachers can focus on their students.

Key capabilities include:
- Student caseload and school management
- Session logging and documentation
- Progress notes and reports
- IEP goal tracking
- Conversational, voice-friendly input (teachers can simply talk; coming features expand this)

Keep your responses concise, helpful, and professional. If you don't know something specific about EasyCaseload, be honest and suggest the user reach out through the contact page for detailed questions.`,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}

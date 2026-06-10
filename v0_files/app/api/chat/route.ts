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
    model: "openai/gpt-5-mini",
    system: `You are the EasyCaseload assistant, a helpful and friendly AI that assists users with questions about the EasyCaseload platform.

EasyCaseload is a caseload management tool designed for independent professionals like speech-language pathologists, occupational therapists, and other specialists who work in schools or private practice.

Key features include:
- Student/client management
- Session tracking and documentation
- Progress notes and reports
- Scheduling and calendar integration
- IEP goal tracking

Keep your responses concise, helpful, and professional. If you don't know something specific about EasyCaseload, be honest and suggest the user contact support for detailed questions.`,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}

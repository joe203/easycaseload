import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const N8N_WEBHOOK_URL = "https://n8nfor516.online/webhook/easycaseload/email-client"
const N8N_API_KEY = process.env.N8N_API_KEY || ""

// Mock data to use while n8n workflow is being configured
const getMockEmails = (folder: string, userEmail: string) => {
  const mockEmails = {
    inbox: [
      {
        id: "1",
        from: "parent@example.com",
        to: userEmail,
        subject: "Question about IEP meeting",
        body: "Hi, I wanted to follow up on the IEP meeting scheduled for next week. Could you please confirm the time?",
        date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        read: false,
      },
      {
        id: "2",
        from: "teacher@school.edu",
        to: userEmail,
        subject: "Student progress update",
        body: "I wanted to share some positive updates about the student's progress in class this week.",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        read: true,
      },
    ],
    sent: [
      {
        id: "3",
        from: userEmail,
        to: "parent@example.com",
        subject: "Re: IEP meeting confirmation",
        body: "Thank you for reaching out. The meeting is confirmed for Tuesday at 3pm.",
        date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        read: true,
      },
    ],
    outbox: [
      {
        id: "4",
        from: userEmail,
        to: "admin@school.edu",
        subject: "Monthly report submission",
        body: "Please find attached the monthly progress reports for my caseload.",
        date: new Date().toISOString(),
        read: false,
      },
    ],
  }
  return mockEmails[folder as keyof typeof mockEmails] || []
}

export async function GET(request: NextRequest) {
  console.log("[v0] Email API GET request received")
  
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] User:", user?.email || "not authenticated")

  if (!user) {
    console.log("[v0] Unauthorized - no user")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "inbox"

  console.log("[v0] Calling n8n webhook with POST for folder:", folder)
  console.log("[v0] N8N_API_KEY present:", !!N8N_API_KEY, "length:", N8N_API_KEY?.length || 0)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  
  if (N8N_API_KEY) {
    headers["X-API-Key"] = N8N_API_KEY
  }

  console.log("[v0] Request headers:", JSON.stringify(headers))

  // Map folder to route name
  const routeMap: Record<string, string> = {
    inbox: "get_inbox",
    sent: "get_sent",
    outbox: "get_outbox",
  }
  
  // Map folder to status
  const statusMap: Record<string, string> = {
    inbox: "received",
    sent: "sent",
    outbox: "pending_approval",
  }

  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "25")

  const payload = {
    route: routeMap[folder] || "get_inbox",
    userId: user.id,
    userEmail: user.email,
    from_email: user.email,
    folder,
    status: statusMap[folder] || "received",
    page,
    limit,
  }

  console.log("[v0] Request payload:", JSON.stringify(payload))

  try {
    // n8n webhook only accepts POST requests
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    console.log("[v0] n8n response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] n8n error response:", errorText)
      // Return mock data while n8n workflow is being configured
      console.log("[v0] Returning mock data for folder:", folder)
      return NextResponse.json({ 
        emails: getMockEmails(folder, user.email || "user@example.com"),
        isMockData: true 
      })
    }

    const data = await response.json()
    console.log("[v0] n8n response data:", JSON.stringify(data))
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching emails:", error)
    // Return mock data while n8n workflow is being configured
    return NextResponse.json({ 
      emails: getMockEmails(folder, user.email || "user@example.com"),
      isMockData: true 
    })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { to, subject, body: emailBody, action } = body

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  
  if (N8N_API_KEY) {
    headers["X-API-Key"] = N8N_API_KEY
  }

  const payload = {
    route: action || "send_email",
    userId: user.id,
    userEmail: user.email,
    from_email: user.email,
    to,
    subject,
    body: emailBody,
  }

  console.log("[v0] Send email payload:", JSON.stringify(payload))

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error("Failed to send email")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

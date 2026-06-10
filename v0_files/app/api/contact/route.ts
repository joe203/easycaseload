export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { name, email, message } = body

    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return Response.json(
        { success: false, message: "Please enter your name (2-100 characters)." },
        { status: 400 }
      )
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length < 10 ||
      message.trim().length > 1000
    ) {
      return Response.json(
        { success: false, message: "Please enter a message (10-1000 characters)." },
        { status: 400 }
      )
    }

    const response = await fetch(
      "https://n8nfor516.online/webhook/easycaseload/contact",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      }
    )

    const data = await response.json()
    return Response.json(data)
  } catch {
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}

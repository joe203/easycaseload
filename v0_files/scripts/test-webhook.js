// Test script to directly call the n8n webhook
const N8N_WEBHOOK_URL = "https://n8nfor516.online/webhook/easycaseload/email-client"
const N8N_API_KEY = process.env.N8N_API_KEY || ""

async function testWebhook() {
  console.log("Testing n8n webhook...")
  console.log("URL:", N8N_WEBHOOK_URL)
  console.log("API Key present:", !!N8N_API_KEY, "length:", N8N_API_KEY?.length || 0)
  
  const headers = {
    "Content-Type": "application/json",
  }
  
  if (N8N_API_KEY) {
    headers["X-API-Key"] = N8N_API_KEY
  }
  
  const body = {
    route: "get_outbox",
    userId: "b5057d02-c033-41e0-a07a-b3fc47eb3551",
    userEmail: "joe.cabrera.21@gmail.com",
    folder: "outbox",
    status: "pending_approval",
    page: 1,
    limit: 25
  }
  
  console.log("\nRequest headers:", JSON.stringify(headers, null, 2))
  console.log("Request body:", JSON.stringify(body, null, 2))
  
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    
    console.log("\nResponse status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log("Response body:", text)
    
    try {
      const json = JSON.parse(text)
      console.log("Parsed JSON:", JSON.stringify(json, null, 2))
    } catch {
      console.log("(Response is not valid JSON)")
    }
  } catch (error) {
    console.error("Error:", error)
  }
}

testWebhook()

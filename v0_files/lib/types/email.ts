export interface Email {
  // ID fields
  _id?: string
  id?: string
  inbox_id?: string
  message_id?: string
  
  // Sender fields
  from?: string
  from_email?: string
  from_name?: string
  
  // Recipient fields  
  to?: string
  to_email?: string
  to_name?: string
  
  // Content
  subject: string
  body?: string
  text?: string
  html?: string
  preview?: string
  
  // Dates
  date?: string
  received_at?: string
  created_at?: string
  updated_at?: string
  
  // Status
  status?: string
  folder?: string
  read?: boolean
  
  // Metadata
  source?: string
  provider?: string
  userEmail?: string
}

// n8n API response structure
export interface EmailApiResponse {
  success: boolean
  type: string
  count: number
  emails: Email[]
  message: string
}

export interface SendEmailPayload {
  to: string
  subject: string
  body: string
}

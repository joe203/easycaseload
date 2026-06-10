"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Inbox, Send, Clock, Plus, Mail, RefreshCw, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { Email } from "@/lib/types/email"

interface EmailClientContentProps {
  userEmail: string
}

// Helper functions to handle field mapping from n8n payload
const getEmailId = (email: Email): string => {
  return email.id || email._id || email.inbox_id || email.message_id || ""
}

const getEmailFrom = (email: Email): string => {
  return email.from || email.from_email || email.from_name || "Unknown Sender"
}

const getEmailTo = (email: Email): string => {
  return email.to || email.to_email || email.to_name || "Unknown Recipient"
}

const getEmailBody = (email: Email): string => {
  // Strip HTML tags for plain text display
  const htmlContent = email.html || ""
  const plainText = email.body || email.text || email.preview || ""
  
  if (plainText) return plainText
  
  // Strip HTML tags if only HTML content is available
  if (htmlContent) {
    return htmlContent.replace(/<[^>]*>/g, "")
  }
  
  return ""
}

const getEmailDate = (email: Email): string => {
  return email.date || email.received_at || email.created_at || email.updated_at || ""
}

export function EmailClientContent({ userEmail }: EmailClientContentProps) {
  const [activeTab, setActiveTab] = useState("inbox")
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [sending, setSending] = useState(false)

  // Compose form state
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")

  const fetchEmails = async (folder: string) => {
    console.log("[v0] fetchEmails called with folder:", folder)
    setLoading(true)
    try {
      const url = `/api/email?folder=${folder}`
      console.log("[v0] Fetching from:", url)
      const response = await fetch(url)
      console.log("[v0] Response status:", response.status)
      const data = await response.json()
      console.log("[v0] Received data:", data)
      setEmails(data.emails || [])
    } catch (error) {
      console.error("[v0] Error fetching emails:", error)
      toast.error("Failed to fetch emails")
      setEmails([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch emails on initial mount
  useEffect(() => {
    console.log("[v0] EmailClientContent mounted, fetching initial emails for:", activeTab)
    fetchEmails(activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setSelectedEmail(null)
    fetchEmails(value)
  }

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error("Please fill in all fields")
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      toast.success("Email sent successfully")
      setComposeOpen(false)
      setComposeTo("")
      setComposeSubject("")
      setComposeBody("")
      
      // Refresh current folder
      fetchEmails(activeTab)
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send email")
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const renderEmailList = () => {
    if (loading) {
      return (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Loading emails...
        </div>
      )
    }

    if (emails.length === 0) {
      return (
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
          <Mail className="mb-2 h-8 w-8" />
          <p>No emails in this folder</p>
          <p className="mt-1 text-sm">Emails will appear here once the webhook is configured</p>
        </div>
      )
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="flex flex-col gap-2 pr-4">
          {emails.map((email) => (
            <button
              key={getEmailId(email)}
              onClick={() => setSelectedEmail(email)}
              className="flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {activeTab === "inbox" ? getEmailFrom(email) : getEmailTo(email)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(getEmailDate(email))}
                </span>
              </div>
              <span className="text-sm font-medium">{email.subject}</span>
              <span className="line-clamp-1 text-sm text-muted-foreground">
                {getEmailBody(email)}
              </span>
              {!email.read && activeTab === "inbox" && (
                <Badge variant="secondary" className="mt-1 w-fit">
                  Unread
                </Badge>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    )
  }

  const renderEmailDetail = () => {
    if (!selectedEmail) return null

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEmail(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </div>
          <CardTitle className="mt-2">{selectedEmail.subject}</CardTitle>
          <CardDescription>
            <div className="flex flex-col gap-1">
              <span>
                <strong>From:</strong> {getEmailFrom(selectedEmail)}
              </span>
              <span>
                <strong>To:</strong> {getEmailTo(selectedEmail)}
              </span>
              <span>
                <strong>Date:</strong> {formatDate(getEmailDate(selectedEmail))}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap rounded-lg bg-muted p-4">
            {getEmailBody(selectedEmail)}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
          <p className="text-muted-foreground">
            Manage your emails - {userEmail}
          </p>
        </div>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>New Email</DialogTitle>
              <DialogDescription>
                Compose and send a new email
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>To</FieldLabel>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Subject</FieldLabel>
                <Input
                  placeholder="Email subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Message</FieldLabel>
                <Textarea
                  placeholder="Write your message..."
                  className="min-h-[200px]"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setComposeOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={sending}>
                {sending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedEmail ? (
        renderEmailDetail()
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="inbox" className="gap-2">
                <Inbox className="h-4 w-4" />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <Send className="h-4 w-4" />
                Sent
              </TabsTrigger>
              <TabsTrigger value="outbox" className="gap-2">
                <Clock className="h-4 w-4" />
                Outbox
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEmails(activeTab)}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <TabsContent value="inbox" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Inbox</CardTitle>
                <CardDescription>
                  Emails you have received
                </CardDescription>
              </CardHeader>
              <CardContent>{renderEmailList()}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Sent</CardTitle>
                <CardDescription>
                  Emails you have sent
                </CardDescription>
              </CardHeader>
              <CardContent>{renderEmailList()}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outbox" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Outbox</CardTitle>
                <CardDescription>
                  Emails waiting to be sent
                </CardDescription>
              </CardHeader>
              <CardContent>{renderEmailList()}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

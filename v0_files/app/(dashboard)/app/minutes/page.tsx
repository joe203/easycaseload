"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Timer, Plus, Trash2, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Session {
  id: string
  minutes: number
  note: string
  logged_at: string
}

export default function MinutesPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [minutes, setMinutes] = useState("30")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  const loadSessions = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single()

    const stored = profile?.preferences?.minute_sessions
    if (Array.isArray(stored)) {
      setSessions(stored)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleLogSession = async () => {
    const mins = parseInt(minutes)
    if (isNaN(mins) || mins <= 0) return

    setLoading(true)
    const newSession: Session = {
      id: crypto.randomUUID(),
      minutes: mins,
      note: note.trim(),
      logged_at: new Date().toISOString(),
    }

    const updated = [...sessions, newSession]
    setSessions(updated)
    setNote("")

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single()

      const existingPrefs = profile?.preferences || {}
      await supabase
        .from("profiles")
        .update({
          preferences: { ...existingPrefs, minute_sessions: updated },
        })
        .eq("id", user.id)
    }
    setLoading(false)
  }

  const handleDeleteSession = async (id: string) => {
    const updated = sessions.filter((s) => s.id !== id)
    setSessions(updated)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single()

      const existingPrefs = profile?.preferences || {}
      await supabase
        .from("profiles")
        .update({
          preferences: { ...existingPrefs, minute_sessions: updated },
        })
        .eq("id", user.id)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Minutes Tracking
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log and track session minutes. This module is in early testing.
        </p>
      </div>

      {/* Total display */}
      <Card className="border-border/60">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Timer className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-3xl font-semibold text-foreground">
              {totalMinutes === 0
                ? "0 min"
                : totalHours > 0
                  ? `${totalHours}h ${remainingMinutes}m`
                  : `${totalMinutes} min`}
            </p>
            <p className="text-sm text-muted-foreground">
              Total across {sessions.length} session
              {sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Log form */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Log a session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="1"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-24"
                  placeholder="30"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="note" className="text-xs text-muted-foreground">
                  Note (optional)
                </Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Speech session with Alex"
                />
              </div>
            </div>
            <Button
              onClick={handleLogSession}
              disabled={loading}
              className="w-fit gap-2"
            >
              <Plus className="h-4 w-4" />
              Log session
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session list */}
      {sessions.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Recent sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {[...sessions].reverse().map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.minutes} min
                      </p>
                      {session.note && (
                        <p className="text-xs text-muted-foreground">
                          {session.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.logged_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useState, useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Users, School, BarChart3, Settings2, Timer, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useStudents } from "@/hooks/useStudents"
import { useSchools } from "@/hooks/useSchools"

interface ModuleConfig {
  key: string
  label: string
  description: string
  defaultEnabled: boolean
}

const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    key: "minutes_tracking",
    label: "Minutes Tracking",
    description: "Track session minutes for students",
    defaultEnabled: false,
  },
]

interface DashboardContentProps {
  firstName: string
  userId: string
  initialPreferences: Record<string, boolean>
}

export function DashboardContent({
  firstName,
  userId,
  initialPreferences,
}: DashboardContentProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [showSettings, setShowSettings] = useState(false)
  const [loggedSessions, setLoggedSessions] = useState<
    { id: number; time: string }[]
  >([])

  // Live counts — Realtime-backed queries, no refresh needed (CLAUDE.md §12)
  const { data: students } = useStudents()
  const { data: schools } = useSchools()
  const activeStudentCount = students?.filter((s) => s.status === "active").length
  const schoolCount = schools?.length

  const isModuleEnabled = useCallback(
    (key: string) => {
      const mod = AVAILABLE_MODULES.find((m) => m.key === key)
      if (preferences[key] !== undefined) return preferences[key]
      return mod?.defaultEnabled ?? false
    },
    [preferences]
  )

  // Optimistic toggle: update UI immediately, roll back if the write fails
  const preferencesMutation = useMutation({
    mutationFn: async (updated: Record<string, boolean>) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("teachers")
        .update({ preferences: updated })
        .eq("auth_user_id", userId)
      if (error) throw error
      return updated
    },
    onError: (_err, _updated, context) => {
      if (context) setPreferences(context as Record<string, boolean>)
    },
    onMutate: () => preferences,
  })

  const toggleModule = (key: string) => {
    const updated = { ...preferences, [key]: !isModuleEnabled(key) }
    setPreferences(updated)
    preferencesMutation.mutate(updated)
  }

  const handleLogSession = () => {
    const now = new Date()
    setLoggedSessions((prev) => [
      ...prev,
      {
        id: Date.now(),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground text-balance">
            Good {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Here's an overview of your caseload."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Modules
        </Button>
      </div>

      {/* Module settings panel */}
      {showSettings && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Dashboard Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {AVAILABLE_MODULES.map((mod) => (
                <div
                  key={mod.key}
                  className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3"
                >
                  <div>
                    <Label htmlFor={mod.key} className="text-sm font-medium">
                      {mod.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {mod.description}
                    </p>
                  </div>
                  <Switch
                    id={mod.key}
                    checked={isModuleEnabled(mod.key)}
                    onCheckedChange={() => toggleModule(mod.key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {activeStudentCount ?? "--"}
              </p>
              <p className="text-xs text-muted-foreground">Active students</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <School className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {schoolCount ?? "--"}
              </p>
              <p className="text-xs text-muted-foreground">Schools</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">--</p>
              <p className="text-xs text-muted-foreground">Reports this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Minutes Tracking module (only shown when enabled) */}
      {isModuleEnabled("minutes_tracking") && (
        <Card className="border-border/60">
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                <Timer className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Minutes Tracking
                </p>
                <p className="text-xs text-muted-foreground">
                  {loggedSessions.length === 0
                    ? "No sessions logged today"
                    : `${loggedSessions.length} session${loggedSessions.length > 1 ? "s" : ""} logged`}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleLogSession} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Log session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/app/students">View students</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/app/schools">View schools</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/app/reports">View reports</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}

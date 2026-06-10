"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { School, SchoolFormData } from "@/lib/types/school"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

interface SchoolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  school?: School | null
  onSave: (data: SchoolFormData) => Promise<{ error: string | null }>
}

export function SchoolDialog({ open, onOpenChange, school, onSave }: SchoolDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<SchoolFormData>({
    school_name: "",
    district_name: "",
    campus_name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  })

  const isEditing = !!school

  useEffect(() => {
    if (school) {
      setFormData({
        school_name: school.school_name,
        district_name: school.district_name || "",
        campus_name: school.campus_name || "",
        address: school.address || "",
        city: school.city || "",
        state: school.state || "",
        zip: school.zip || "",
        notes: school.notes || "",
      })
    } else {
      setFormData({
        school_name: "",
        district_name: "",
        campus_name: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
      })
    }
    setError(null)
  }, [school, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.school_name.trim()) {
      setError("School name is required")
      return
    }

    setIsSubmitting(true)
    const result = await onSave(formData)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit School" : "Add School"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the school information below."
                : "Add a new school to your caseload."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="school_name">
                School Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) =>
                  setFormData({ ...formData, school_name: e.target.value })
                }
                placeholder="Lincoln Elementary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="district_name">District</Label>
                <Input
                  id="district_name"
                  value={formData.district_name}
                  onChange={(e) =>
                    setFormData({ ...formData, district_name: e.target.value })
                  }
                  placeholder="Springfield ISD"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="campus_name">Campus</Label>
                <Input
                  id="campus_name"
                  value={formData.campus_name}
                  onChange={(e) =>
                    setFormData({ ...formData, campus_name: e.target.value })
                  }
                  placeholder="Main Campus"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3 flex flex-col gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="Springfield"
                />
              </div>
              <div className="col-span-1 flex flex-col gap-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, state: value })
                  }
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="--" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                  placeholder="12345"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this school..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
              {isEditing ? "Save Changes" : "Add School"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

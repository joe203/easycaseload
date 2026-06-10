'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { createStudent, updateStudent } from '@/lib/actions/students'
import type { Student, StudentFormData } from '@/lib/types/student'
import { STUDENT_STATUS_OPTIONS, GRADE_OPTIONS } from '@/lib/types/student'
import { toast } from 'sonner'

interface StudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
  student?: Student | null
  onSuccess?: () => void
}

export function StudentDialog({
  open,
  onOpenChange,
  schoolId,
  student,
  onSuccess,
}: StudentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<StudentFormData>({
    first_name: '',
    last_name: '',
    grade: '',
    student_id_number: '',
    case_manager: '',
    status: 'active',
    notes: '',
  })

  const isEditing = !!student

  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        grade: student.grade || '',
        student_id_number: student.student_id_number || '',
        case_manager: student.case_manager || '',
        status: student.status,
        notes: student.notes || '',
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        grade: '',
        student_id_number: '',
        case_manager: '',
        status: 'active',
        notes: '',
      })
    }
  }, [student, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First name and last name are required')
      return
    }

    setIsLoading(true)

    try {
      if (isEditing && student) {
        const { error } = await updateStudent(student.id, schoolId, formData)
        if (error) {
          toast.error(error)
          return
        }
        toast.success('Student updated successfully')
      } else {
        const { error } = await createStudent(schoolId, formData)
        if (error) {
          toast.error(error)
          return
        }
        toast.success('Student added successfully')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the student information below.'
              : 'Enter the student details to add them to this school.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                placeholder="Enter first name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={formData.grade || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_id_number">Student ID</Label>
              <Input
                id="student_id_number"
                value={formData.student_id_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, student_id_number: e.target.value })
                }
                placeholder="Enter student ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="case_manager">Case Manager</Label>
              <Input
                id="case_manager"
                value={formData.case_manager || ''}
                onChange={(e) =>
                  setFormData({ ...formData, case_manager: e.target.value })
                }
                placeholder="Enter case manager name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: StudentFormData['status']) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add any additional notes about this student..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {isEditing ? 'Save Changes' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

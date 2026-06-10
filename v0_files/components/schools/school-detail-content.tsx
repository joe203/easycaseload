'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Users,
  Building2,
  MapPin,
  FileText
} from 'lucide-react'
import { getSchool } from '@/lib/actions/schools'
import { getStudentsBySchool, deleteStudent } from '@/lib/actions/students'
import { StudentDialog } from '@/components/students/student-dialog'
import type { School } from '@/lib/types/school'
import type { Student } from '@/lib/types/student'
import { toast } from 'sonner'

interface SchoolDetailContentProps {
  schoolId: string
}

export function SchoolDetailContent({ schoolId }: SchoolDetailContentProps) {
  const router = useRouter()
  const [school, setSchool] = useState<School | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [schoolResult, studentsResult] = await Promise.all([
        getSchool(schoolId),
        getStudentsBySchool(schoolId),
      ])

      if (schoolResult.error) {
        toast.error(schoolResult.error)
        router.push('/app/schools')
        return
      }

      setSchool(schoolResult.data)
      setStudents(studentsResult.data || [])
      setFilteredStudents(studentsResult.data || [])
    } catch {
      toast.error('Failed to load school data')
    } finally {
      setIsLoading(false)
    }
  }, [schoolId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredStudents(
        students.filter(
          (student) =>
            student.first_name.toLowerCase().includes(query) ||
            student.last_name.toLowerCase().includes(query) ||
            student.student_id_number?.toLowerCase().includes(query) ||
            student.grade?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, students])

  const handleAddStudent = () => {
    setSelectedStudent(null)
    setDialogOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    setDialogOpen(true)
  }

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return

    const { error } = await deleteStudent(studentToDelete.id, schoolId)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Student deleted successfully')
      loadData()
    }
    setDeleteDialogOpen(false)
    setStudentToDelete(null)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'graduated':
        return 'outline'
      case 'transferred':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!school) {
    return (
      <Empty
        icon={Building2}
        title="School not found"
        description="The school you're looking for doesn't exist or you don't have access to it."
        action={
          <Button onClick={() => router.push('/app/schools')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Schools
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/app/schools')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{school.school_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              {school.district_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {school.district_name}
                </span>
              )}
              {school.city && school.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {school.city}, {school.state}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleAddStudent}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      {/* Students Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students
                <Badge variant="secondary" className="ml-2">
                  {students.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage students enrolled at this school
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <Empty
              icon={Users}
              title="No students yet"
              description="Add your first student to start tracking their progress."
              action={
                <Button onClick={handleAddStudent}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              }
            />
          ) : filteredStudents.length === 0 ? (
            <Empty
              icon={Search}
              title="No students found"
              description="Try adjusting your search query."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Case Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/app/students/${student.id}`)}
                          className="text-left font-medium hover:text-primary hover:underline"
                        >
                          {student.last_name}, {student.first_name}
                        </button>
                      </TableCell>
                      <TableCell>{student.grade || '-'}</TableCell>
                      <TableCell>{student.student_id_number || '-'}</TableCell>
                      <TableCell>{student.case_manager || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(student.status)}>
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/app/students/${student.id}`)}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(student)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Dialog */}
      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        student={selectedStudent}
        onSuccess={loadData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {studentToDelete?.first_name}{' '}
              {studentToDelete?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Empty } from "@/components/ui/empty"
import { 
  ArrowLeft, 
  Upload, 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  FileText,
  User,
  GraduationCap,
  Calendar,
  StickyNote
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { deleteDocument } from "@/lib/actions/documents"
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog"
import type { Student } from "@/lib/types/student"
import type { StudentDocument } from "@/lib/types/document"
import type { School } from "@/lib/types/school"
import { STUDENT_STATUS_OPTIONS, GRADE_OPTIONS } from "@/lib/types/student"

interface StudentDetailContentProps {
  student: Student
  school: School | null
  initialDocuments: StudentDocument[]
  teacherId: string
}

export function StudentDetailContent({
  student,
  school,
  initialDocuments,
  teacherId,
}: StudentDetailContentProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState(initialDocuments)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<StudentDocument | null>(null)
  const [isPending, startTransition] = useTransition()

  const statusLabel = STUDENT_STATUS_OPTIONS.find(s => s.value === student.status)?.label || student.status
  const gradeLabel = GRADE_OPTIONS.find(g => g.value === student.grade)?.label || student.grade

  const handleDocumentUploaded = (doc: StudentDocument) => {
    setDocuments(prev => [doc, ...prev])
  }

  const handleDeleteDocument = async () => {
    if (!deletingDocument) return

    startTransition(async () => {
      const result = await deleteDocument(
        deletingDocument.id,
        student.id,
        deletingDocument.file_path
      )

      if (!result.error) {
        setDocuments(prev => prev.filter(d => d.id !== deletingDocument.id))
      }
      setDeletingDocument(null)
    })
  }

  const handleViewDocument = async (doc: StudentDocument) => {
    if (!doc.file_path) return
    const supabase = createClient()

    const { data, error } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(doc.file_path, 3600)

    if (error) return

    window.open(data.signedUrl, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(school ? `/app/schools/${school.id}` : "/app/students")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {school?.school_name ?? "No school assigned"}
          </p>
        </div>
        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
          {statusLabel}
        </Badge>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gradeLabel && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <p className="font-medium">{gradeLabel}</p>
                </div>
              </div>
            )}
            {student.student_id_number && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student ID</p>
                  <p className="font-medium">{student.student_id_number}</p>
                </div>
              </div>
            )}
            {student.case_manager && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Case Manager</p>
                  <p className="font-medium">{student.case_manager}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="font-medium">{formatDate(student.created_at)}</p>
              </div>
            </div>
          </div>
          {student.notes && (
            <div className="mt-4 flex items-start gap-3 border-t pt-4">
              <StickyNote className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm">{student.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Documents</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            </CardDescription>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <Empty
              icon={FileText}
              title="No documents yet"
              description="Upload documents for this student such as IEPs, evaluations, progress reports, and more."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.title}</span>
                          {doc.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {doc.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.doc_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.file_name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.uploaded_at)}
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
                            <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingDocument(doc)}
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

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        studentId={student.id}
        teacherId={teacherId}
        onSuccess={handleDocumentUploaded}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDocument} onOpenChange={() => setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingDocument?.title}&quot;? This action cannot be undone
              and will permanently remove the file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

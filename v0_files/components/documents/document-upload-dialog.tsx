"use client"

import { useState, useRef, useTransition } from "react"
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
import { Upload, FileText, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createDocument } from "@/lib/actions/documents"
import type { StudentDocument, DocumentFormData } from "@/lib/types/document"
import { DOC_TYPE_OPTIONS } from "@/lib/types/document"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  schoolId: string
  userId: string
  onSuccess: (doc: StudentDocument) => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  studentId,
  schoolId,
  userId,
  onSuccess,
}: DocumentUploadDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<DocumentFormData>({
    title: "",
    doc_type: "IEP",
    description: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill title from filename if empty
      if (!formData.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
        setFormData(prev => ({ ...prev, title: nameWithoutExt }))
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const resetForm = () => {
    setFormData({ title: "", doc_type: "IEP", description: "" })
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError("Please select a file to upload")
      return
    }

    if (!formData.title.trim()) {
      setError("Please enter a document title")
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()
      
      // Create unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/${schoolId}/${studentId}/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Create document record
      startTransition(async () => {
        const result = await createDocument(
          studentId,
          schoolId,
          formData,
          filePath,
          selectedFile.name
        )

        if (result.error) {
          setError(result.error)
          setIsUploading(false)
          return
        }

        if (result.data) {
          onSuccess(result.data)
          resetForm()
          onOpenChange(false)
        }
        setIsUploading(false)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document")
      setIsUploading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const isLoading = isPending || isUploading

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this student. Supported formats: PDF, Word, images, text files.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* File Upload */}
          <div className="flex flex-col gap-2">
            <Label>File</Label>
            {selectedFile ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select a file
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Document title"
              disabled={isLoading}
            />
          </div>

          {/* Document Type */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc_type">Document Type</Label>
            <Select
              value={formData.doc_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, doc_type: value as DocumentFormData['doc_type'] }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedFile}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

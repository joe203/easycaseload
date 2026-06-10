"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { School, Plus, MoreHorizontal, Pencil, Trash2, MapPin, Users, Eye } from "lucide-react"
import { SchoolDialog } from "./school-dialog"
import { createSchool, updateSchool, deleteSchool } from "@/lib/actions/schools"
import type { School as SchoolType, SchoolFormData } from "@/lib/types/school"

interface SchoolsContentProps {
  initialSchools: SchoolType[]
}

export function SchoolsContent({ initialSchools }: SchoolsContentProps) {
  const router = useRouter()
  const [schools, setSchools] = useState(initialSchools)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null)
  const [deletingSchool, setDeletingSchool] = useState<SchoolType | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = async (data: SchoolFormData) => {
    const result = await createSchool(data)
    if (result.data) {
      startTransition(() => {
        setSchools((prev) => [...prev, result.data!].sort((a, b) => 
          a.school_name.localeCompare(b.school_name)
        ))
      })
    }
    return { error: result.error }
  }

  const handleUpdate = async (data: SchoolFormData) => {
    if (!editingSchool) return { error: "No school selected" }
    const result = await updateSchool(editingSchool.id, data)
    if (result.data) {
      startTransition(() => {
        setSchools((prev) =>
          prev
            .map((s) => (s.id === editingSchool.id ? result.data! : s))
            .sort((a, b) => a.school_name.localeCompare(b.school_name))
        )
      })
    }
    return { error: result.error }
  }

  const handleDelete = async () => {
    if (!deletingSchool) return
    const result = await deleteSchool(deletingSchool.id)
    if (!result.error) {
      startTransition(() => {
        setSchools((prev) => prev.filter((s) => s.id !== deletingSchool.id))
      })
    }
    setDeletingSchool(null)
  }

  const openCreateDialog = () => {
    setEditingSchool(null)
    setDialogOpen(true)
  }

  const openEditDialog = (school: SchoolType) => {
    setEditingSchool(school)
    setDialogOpen(true)
  }

  const formatLocation = (school: SchoolType) => {
    const parts = [school.city, school.state].filter(Boolean)
    return parts.join(", ") || "—"
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Schools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the schools on your caseload.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add School
        </Button>
      </div>

      {/* Schools table or empty state */}
      {schools.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <School className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">No schools yet</h3>
            <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
              Add your first school to start tracking students and sessions.
            </p>
            <Button onClick={openCreateDialog} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add School
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <button 
                        onClick={() => router.push(`/app/schools/${school.id}`)}
                        className="text-left font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {school.school_name}
                      </button>
                      {school.campus_name && (
                        <span className="text-xs text-muted-foreground">
                          {school.campus_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {school.district_name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{formatLocation(school)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/app/schools/${school.id}`)}>
                          <Users className="mr-2 h-4 w-4" />
                          View Students
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(school)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingSchool(school)}
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
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <SchoolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        school={editingSchool}
        onSave={editingSchool ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingSchool}
        onOpenChange={(open) => !open && setDeletingSchool(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingSchool?.school_name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

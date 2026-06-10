import { getSchools } from "@/lib/actions/schools"
import { SchoolsContent } from "@/components/schools/schools-content"

export default async function SchoolsPage() {
  const { data: schools } = await getSchools()
  return <SchoolsContent initialSchools={schools || []} />
}

import { SchoolDetailContent } from '@/components/schools/school-detail-content'

interface SchoolDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SchoolDetailPage({ params }: SchoolDetailPageProps) {
  const { id } = await params
  
  return <SchoolDetailContent schoolId={id} />
}

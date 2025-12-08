import { redirect } from 'next/navigation'

interface PageProps { params: { id: string } }

export default function Page({ params }: PageProps) {
  const { id } = params
  // Redirect `/listings/[id]/view` to the canonical listing page
  redirect(`/listings/${id}`)
}

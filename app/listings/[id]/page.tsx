import EditListingForm from '@/components/edit-listing-form'

interface PageProps {
  params: {
    id: string
  }
}

export default function Page({ params }: PageProps) {
  const { id } = params
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <EditListingForm propertyId={id} />
      </div>
    </main>
  )
}

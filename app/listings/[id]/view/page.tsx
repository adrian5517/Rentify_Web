import Image from 'next/image'
import Link from 'next/link'

interface PageProps {
  params: { id: string }
}

import config from '@/lib/config'
import dynamic from 'next/dynamic'

const ContractButton = dynamic(() => import('@/components/contract-button'), { ssr: false })

const API_BASE = config.API_API

async function fetchProperty(id: string) {
  const res = await fetch(`${API_BASE}/api/properties/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load property')
  const data = await res.json()
  return data.property || data
}

export default async function Page({ params }: PageProps) {
  const { id } = params
  let property: any = null
  try {
    property = await fetchProperty(id)
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold">Listing not found</h2>
          <p className="text-sm text-slate-600 mt-2">We couldn't find the listing you requested.</p>
        </div>
      </main>
    )
  }

  const images: string[] = property.images || property.imagesUrls || property.photos || []

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Image gallery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="md:col-span-2">
              {images && images.length > 0 ? (
                <div className="relative w-full h-96">
                  <Image src={images[0]} alt={property.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
              ) : (
                <div className="w-full h-96 bg-slate-100 flex items-center justify-center">
                  <p className="text-slate-500">No images</p>
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
                <p className="text-xl text-emerald-600 font-semibold mt-2">₱{Number(property.price).toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-3">{property.location?.address || property.address}</p>
              </div>

              <div className="mt-4 flex gap-3">
                <Link href={`/listings/${id}`} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Edit Listing
                </Link>
                <ContractButton propertyId={id} />
                <a href={`tel:${property.phoneNumber || property.phone || ''}`} className="inline-flex items-center px-4 py-2 border rounded text-sm">
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 border-t">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">{property.description}</p>

            <h3 className="text-md font-semibold mt-4">Amenities</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {(property.amenities || []).map((a: string, i: number) => (
                <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded">{a}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

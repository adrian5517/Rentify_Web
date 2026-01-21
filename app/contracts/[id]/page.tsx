import React from 'react'
import config from '@/lib/config'
import dynamic from 'next/dynamic'

const ContractChat = dynamic(() => import('@/components/contract-chat'))

interface PageProps { params: { id: string } }

const API_BASE = config.API_API

async function fetchContract(id: string) {
  const res = await fetch(`${API_BASE}/api/contracts/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load contract')
  const data = await res.json()
  return data.contract || data
}

export default async function Page({ params }: PageProps) {
  const { id } = params
  let contract: any = null
  try {
    contract = await fetchContract(id)
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold">Contract not found</h2>
          <p className="text-sm text-slate-600 mt-2">We couldn't find the contract you requested.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold">Contract {contract._id}</h1>
          <div className="mt-4 space-y-2">
            <div><strong>Property:</strong> {contract.property?._id || contract.property}</div>
            <div><strong>Owner:</strong> {contract.owner?._id || contract.owner}</div>
            <div><strong>Renter:</strong> {contract.renter?._id || contract.renter || '—'}</div>
            <div><strong>Status:</strong> {contract.status}</div>
            <div><strong>Rent:</strong> {contract.rentAmount} {contract.currency}</div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold">Payment Schedule</h3>
            <div className="mt-2 divide-y">
              {(contract.paymentSchedule || []).map((s:any, i:number) => (
                <div key={i} className="py-2 flex justify-between">
                  <div>{new Date(s.dueDate).toLocaleDateString()} — {s.amount} {contract.currency}</div>
                  <div className="text-sm text-slate-600">{s.status || 'pending'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment UI removed: contracts/agreement only view per product decision */}

          <div className="mt-6">
            <h3 className="font-semibold">Conversation</h3>
            <div className="mt-2 bg-white p-4 rounded">
              <ContractChat userA={contract.owner?._id || contract.owner} userB={contract.renter?._id || contract.renter} contractId={contract._id} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

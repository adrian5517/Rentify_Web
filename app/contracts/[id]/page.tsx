import React from 'react'
import config from '@/lib/config'
import dynamic from 'next/dynamic'

const PaymentWidget = dynamic(() => import('@/components/payment-widget'))
const ContractChat = dynamic(() => import('@/components/contract-chat'), { ssr: false })

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

  const firstAmount = contract?.paymentSchedule?.[0]?.amount || contract?.rentAmount || 0

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

          <div className="mt-6">
            <h3 className="font-semibold">Make a payment</h3>
            <div className="mt-2">
              <PaymentWidget contractId={contract._id} amount={firstAmount} currency={contract.currency} />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold">Payments</h3>
            <div className="mt-2 divide-y">
              {(contract.payments || []).length === 0 && <div className="text-sm text-slate-600">No payments yet.</div>}
              {(contract.payments || []).map((p:any) => (
                <div key={p._id || p.id} className="py-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.amount} {p.currency}</div>
                    <div className="text-sm text-slate-500">{new Date(p.createdAt || p.timestamp || p.date).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-slate-700">{p.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

import React from 'react'
import config from '@/lib/config'
import ContractPageClient from '@/components/contract-page-client'

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
          <ContractPageClient contract={contract} />
        </div>
      </div>
    </main>
  )
}

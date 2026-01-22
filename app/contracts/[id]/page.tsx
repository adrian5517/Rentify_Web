import React from 'react'
import ContractPageClient from '@/components/contract-page-client'

interface PageProps { params: { id: string } }

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold">Contract {id}</h1>
          <ContractPageClient id={id} />
        </div>
      </div>
    </main>
  )
}

"use client"

import React, { useEffect, useState } from 'react'
import config from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'
import ContractModal from '@/components/contract-modal'

export const dynamic = 'force-dynamic'

export default function ContractsPage() {
  const token = useAuthStore((s:any)=>s.token)
  const [contracts, setContracts] = useState<any[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any|null>(null)

  useEffect(()=>{ fetchContracts() }, [])

  const fetchContracts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/me`, { headers: { ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include' })
      const data = await res.json()
      if (res.ok) setContracts(data.contracts || [])
      else setContracts([])
    } catch (e) {
      setContracts([])
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold">My Contracts</h1>
        <p className="text-sm text-slate-600 mt-2">Contracts where you are owner or renter.</p>

        <div className="mt-6">
          {loading ? <div>Loading…</div> : (
            <div className="grid gap-3">
              {contracts && contracts.length > 0 ? contracts.map(c=> (
                <div key={c._id} className="p-4 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{c._id}</div>
                    <div className="text-sm text-slate-600">Property: {c.property?._id || c.property}</div>
                    <div className="text-sm text-slate-600">Status: {c.status}</div>
                  </div>
                  <div>
                    <button onClick={()=>setSelected(c)} className="px-3 py-2 bg-blue-600 text-white rounded">View</button>
                  </div>
                </div>
              )) : <div className="text-slate-600">No contracts found.</div>}
            </div>
          )}
        </div>

        {selected && <div className="mt-6"><ContractModal contract={selected} onClose={()=>setSelected(null)} onSaved={()=>fetchContracts()} /></div>}
      </div>
    </main>
  )
}

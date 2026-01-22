"use client"

import React, { useEffect, useState } from 'react'
import config from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'
import ContractModal from '@/components/contract-modal'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ContractsPage() {
  const token = useAuthStore((s:any)=>s.token)
  const user = useAuthStore((s:any)=>s.user)
  const [contracts, setContracts] = useState<any[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any|null>(null)
  const [error, setError] = useState<string | null>(null)

  const fmtPerson = (p:any) => {
    if (!p) return ''
    if (typeof p === 'string') return p
    return p.name || p.fullName || p.email || p._id || ''
  }

  useEffect(()=>{
    if (!token) {
      // wait for login/token
      setContracts(null)
      return
    }
    fetchContracts()
  }, [token])

  const fetchContracts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/me`, { headers: { ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include' })
      const data = await res.json()
      if (res.ok) setContracts(data.contracts || [])
      else {
        setContracts([])
        setError(data?.message || 'Failed to load contracts')
      }
    } catch (e:any) {
      setContracts([])
      setError(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Contracts</h1>
          <p className="mt-2 text-sm text-slate-500">Manage your rental agreements — view status, open the agreement, or accept when you're the renter.</p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-slate-600">Showing contracts for <strong className="text-slate-800">{user?.fullName || user?.name || 'you'}</strong></div>
          <div>
            <Link href="/" className="text-sm text-indigo-600 hover:underline">Back to home</Link>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-12 text-slate-600">Loading…</div>
          ) : (!token) ? (
            <div className="rounded-xl bg-white p-6 shadow-sm text-center text-slate-700">Please <a href="/auth" className="text-indigo-600">sign in</a> to view your contracts.</div>
          ) : (contracts && contracts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {contracts.map(c=> {
                const uid = user?._id || user?.id
                const isRenter = uid && String(c.renter?._id || c.renter) === String(uid)
                const renterAccepted = !!c.renterAccepted?.accepted
                const ownerAccepted = !!c.ownerAccepted?.accepted
                const signed = ownerAccepted && renterAccepted
                return (
                  <div key={c._id} className="bg-white rounded-2xl p-5 shadow hover:shadow-lg transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{c.property?.address || c.property?._id || c._id}</div>
                        <div className="text-sm text-slate-500 mt-1">{c.rentAmount ? `${c.rentAmount} ${c.currency||''}` : ''} • {c.leaseTerm || ''}</div>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${signed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {signed ? 'Signed' : (isRenter ? (renterAccepted? 'You signed' : 'Pending your acceptance') : (ownerAccepted? 'Owner signed' : 'Pending'))}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-slate-600 space-y-1">
                      <div><span className="font-medium text-slate-700">Owner:</span> {fmtPerson(c.owner)}</div>
                      <div><span className="font-medium text-slate-700">Renter:</span> {fmtPerson(c.renter)}</div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      {!signed && isRenter && !renterAccepted && (
                        <button onClick={async ()=>{
                          if (!confirm('Accept this agreement?')) return
                          try {
                            const res = await fetch(`${config.API_API}/api/contracts/${c._id}/accept`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include', body: JSON.stringify({ signature: { name: user?.fullName || user?.name || '' } }) })
                            const dd = await res.json()
                            if (!res.ok) throw new Error(dd?.message || 'Failed to accept')
                            await fetchContracts()
                            alert('Agreement accepted')
                          } catch (e:any) { alert(e?.message || String(e)) }
                        }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow">Accept</button>
                      )}

                      <button onClick={()=>setSelected(c)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow">Open Agreement</button>

                      {signed && (
                        <a href={`${config.API_API}/api/contracts/${c._id}/pdf`} className="px-3 py-2 bg-slate-700 text-white rounded-lg" target="_blank" rel="noreferrer">Download PDF</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-8 shadow-sm text-slate-600">No contracts found.</div>
          ))}
        </div>

        {error && <div className="mt-6 text-red-600">{error}</div>}

        {selected && <div className="mt-6"><ContractModal contract={selected} onClose={()=>setSelected(null)} onSaved={()=>fetchContracts()} /></div>}
      </div>
    </main>
  )
}

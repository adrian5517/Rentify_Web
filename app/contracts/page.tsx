"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import config from '@/lib/config'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import ContractModal from '@/components/contract-modal'
import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ContractsPage() {
  const token = useAuthStore((s:any)=>s.token)
  const user = useAuthStore((s:any)=>s.user)
  const [contracts, setContracts] = useState<any[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any|null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

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

  // Auto-open modal when URL contains openModal=1 and either a contractId query or a path segment
  useEffect(() => {
    const openModal = searchParams?.get('openModal') === '1' || searchParams?.get('openModal') === 'true'
    const qid = searchParams?.get('contractId')
    // Path may be /contracts/<id>
    let pathId: string | null = null
    try {
      const parts = (pathname || '').split('/').filter(Boolean)
      if (parts.length >= 2 && parts[0] === 'contracts') pathId = parts[1]
    } catch (e) { pathId = null }

    const cid = qid || pathId
    if (!openModal || !cid) return

    const openById = async () => {
      // If we already have the contract in the list, select it
      if (contracts && contracts.length) {
        const found = contracts.find((c:any) => String(c._id || c.id) === String(cid))
        if (found) { setSelected(found); return }
      }

      // Otherwise fetch the contract directly
      try {
        const res = await fetch(`${config.API_API}/api/contracts/${cid}`, { headers: { ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (data && data.contract) setSelected(data.contract)
      } catch (e) {
        // ignore
      }
    }

    openById()
    // Clean up the URL to remove query params after opening modal for a cleaner UX
    try {
      const cleaned = new URL(window.location.href)
      cleaned.searchParams.delete('openModal')
      cleaned.searchParams.delete('contractId')
      const newUrl = cleaned.pathname + cleaned.search
      // replace so user doesn't get stuck with modal params in history
      router.replace(newUrl)
    } catch (e) {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, contracts, token])

  const fetchContracts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/me`, { headers: { ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        const contractsList = data.contracts || []
        // For contracts missing property photos, fetch property details
        const updated = await Promise.all(contractsList.map(async (c:any) => {
          const prop = c.property || {}
          if (prop && (!prop.photos || prop.photos.length === 0) && (prop._id || typeof prop === 'string')) {
            try {
              const pid = prop._id || prop
              const pres = await fetch(`${config.API_API}/api/properties/${pid}`)
              if (pres.ok) {
                const pd = await pres.json()
                c.property = { ...(c.property || {}), ...(pd.property || pd) }
              }
            } catch (e) {
              // ignore property fetch errors
            }
          }
          return c
        }))
        setContracts(updated)
      }
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

  // Simplified navigation: use a back link instead of the full Navbar on this page

  return (
    <>
      <main className="min-h-screen p-8">
        <div className="container mx-auto">
          <div className="mb-4">
            <Link href="/" className="text-indigo-600 hover:underline">← Back</Link>
          </div>

          <h1 className="text-2xl font-bold">My Contracts</h1>
          <p className="text-sm text-slate-600 mt-2">Contracts where you are owner or renter.</p>

          <div className="mt-6">
            {loading ? <div>Loading…</div> : (
              <div className="space-y-4">
                {(!token) ? (
                  <div className="text-slate-600">Please <a href="/auth" className="text-blue-600">sign in</a> to view your contracts.</div>
                ) : (contracts && contracts.length > 0 ? (
                  contracts.map(c=> {
                    const uid = user?._id || user?.id
                    const isRenter = uid && String(c.renter?._id || c.renter) === String(uid)
                    const renterAccepted = !!c.renterAccepted?.accepted
                    const ownerAccepted = !!c.ownerAccepted?.accepted
                    const signed = ownerAccepted && renterAccepted

                    const ownerObj = c.owner && typeof c.owner === 'object' ? c.owner : null
                    const renterObj = c.renter && typeof c.renter === 'object' ? c.renter : null
                    const prop = c.property || {}

                    return (
                      <article key={c._id} className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 shadow-lg border border-slate-100">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {prop.photos && prop.photos[0] ? (
                              <img src={prop.photos[0]} alt={prop.name || 'property'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-slate-400">🏠</div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-lg font-semibold text-slate-900">{prop.name || prop.address || c.property?._id || c._id}</div>
                                <div className="text-sm text-slate-500 mt-1">{prop.address || c.property?.address || 'No address provided'}</div>
                                <div className="text-sm text-indigo-600 font-medium mt-2">{c.rentAmount ? `${c.rentAmount} ${c.currency||''}` : '—'}</div>
                              </div>

                              <div className="ml-4 flex flex-col items-end gap-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${signed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {signed ? 'Signed' : (isRenter ? (renterAccepted? 'You signed' : 'Pending your acceptance') : (ownerAccepted? 'Owner signed' : 'Pending'))}
                                </span>
                                <div className="text-xs text-slate-400">Contract ID: {c._id}</div>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold">{(ownerObj?.name || fmtPerson(c.owner) || 'O').charAt(0).toUpperCase()}</div>
                                <div>
                                  <div className="text-sm font-medium">{ownerObj?.name || fmtPerson(c.owner) || 'Owner'}</div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    <span>{ownerObj?.email || ''}</span>
                                  </div>
                                  {ownerObj?.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="h-3 w-3 text-slate-400" /> <span>{ownerObj.phone}</span></div>}
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-semibold">{(renterObj?.name || fmtPerson(c.renter) || 'R').charAt(0).toUpperCase()}</div>
                                <div>
                                  <div className="text-sm font-medium">{renterObj?.name || fmtPerson(c.renter) || 'Renter'}</div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    <span>{renterObj?.email || ''}</span>
                                  </div>
                                  {renterObj?.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="h-3 w-3 text-slate-400" /> <span>{renterObj.phone}</span></div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-3">
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
                      </article>
                    )
                  })
                ) : (
                  <div className="text-slate-600">No contracts found.</div>
                ))}
              </div>
            )}
            {error && <div className="mt-4 text-red-600">{error}</div>}
          </div>

          {selected && <div className="mt-6"><ContractModal contract={selected} onClose={()=>setSelected(null)} onSaved={()=>fetchContracts()} /></div>}
        </div>
      </main>
    </>
  )
}

"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import PremiumModal from './premium-modal'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'

const ContractModal = dynamic(() => import('./contract-modal'), { ssr: false })

export default function ContractsOverview({ current }: { current?: any }) {
  const [contracts, setContracts] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  const token = useAuthStore((s:any)=>s.token)
  const user = useAuthStore((s:any)=>s.user)

  useEffect(()=>{
    let mounted = true
    const headers = { ...(token?{ Authorization: `Bearer ${token}` }:{}) }

    const load = async () => {
      try {
        const res = await fetch(`${config.API_API}/api/contracts/me`, { headers, credentials: 'include' })
        if (res.ok) {
          const d = await res.json()
          if (!mounted) return
          setContracts(d.contracts || d || [])
        } else {
          setContracts([])
        }
      } catch (e) {
        setContracts([])
      }

      try {
        const rres = await fetch(`${config.API_API}/api/contracts/requests`, { headers, credentials: 'include' })
        if (rres.ok) {
          const rd = await rres.json()
          if (!mounted) return
          setRequests(rd.requests || rd || [])
        } else {
          setRequests([])
        }
      } catch (e) {
        setRequests([])
      }
    }

    load()
    return ()=>{ mounted = false }
  }, [token])

  const openManage = (c:any) => { setSelected(c); setOpen(true) }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12 }}>
      <div style={{ background:'#fff', padding:12, borderRadius:10, boxShadow:'0 6px 18px rgba(15,23,42,0.04)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h4 style={{ margin:0 }}>My Contracts</h4>
          <div style={{ fontSize:12, color:'#6b7280' }}>{contracts.length} total</div>
        </div>
        <div style={{ marginTop:10 }}>
          {contracts.length === 0 && <div style={{ color:'#6b7280' }}>No contracts found — try creating one from the property page.</div>}
          {contracts.map((c:any)=> {
            const uid = user?._id || user?.id
            const isRenter = uid && (String(c.renter?._id || c.renter) === String(uid))
            const renterAccepted = !!c.renterAccepted?.accepted
            return (
            <div key={c._id||c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight:700 }}>{c.property?.address || c._id}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>{c.rentAmount} {c.currency} • {c.status || (renterAccepted? 'Signed' : 'Pending')}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {isRenter && !renterAccepted && (
                  <button onClick={async ()=>{
                    if (!confirm('Accept this agreement?')) return
                    try {
                      const ares = await fetch(`${config.API_API}/api/contracts/${c._id||c.id}/accept`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include', body: JSON.stringify({ signature: { name: user?.fullName || user?.name || '' } }) })
                      const ad = await ares.json()
                      if (!ares.ok) throw new Error(ad?.message || 'Failed to accept')
                      // update single contract
                      setContracts(prev=> prev.map(p=> (p._id===ad.contract?._id?ad.contract:p)))
                      alert('Agreement accepted')
                    } catch (e:any) { alert(e?.message||String(e)) }
                  }} style={{ padding:'8px 10px', background:'#059669', color:'#fff', borderRadius:8, border:'none' }}>Accept Agreement</button>
                )}

                <button onClick={()=>openManage(c)} style={{ padding:'8px 10px', background:'#111827', color:'#fff', borderRadius:8, border:'none' }}>Manage</button>
              </div>
            </div>
          )})}
        </div>
      </div>

      <div style={{ background:'#fff', padding:12, borderRadius:10, boxShadow:'0 6px 18px rgba(15,23,42,0.04)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h4 style={{ margin:0 }}>Incoming Requests</h4>
          <div style={{ fontSize:12, color:'#6b7280' }}>{requests.length} pending</div>
        </div>
        <div style={{ marginTop:10 }}>
          {requests.length === 0 && <div style={{ color:'#6b7280' }}>No incoming requests right now.</div>}
          {requests.map((r:any)=> (
            <div key={r._id||r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight:700 }}>{r.requesterName || r._id}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>{r.message || 'Wants to create contract'}</div>
              </div>
              <div>
                <button onClick={()=>openManage(r)} style={{ padding:'8px 10px', background:'#0ea5a5', color:'#fff', borderRadius:8, border:'none' }}>Review</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && selected && (
        <PremiumModal title={`Manage ${selected._id||selected.requesterName||'Contract'}`} onClose={()=>{ setOpen(false); setSelected(null) }}>
          <ContractModal contract={selected} contracts={contracts} onClose={()=>{ setOpen(false); setSelected(null) }} onSaved={(c:any)=>{
            // update list
            setContracts(prev=> prev.map(p=> (p._id===c._id?c:p)))
            setOpen(false)
            setSelected(null)
          }} />
        </PremiumModal>
      )}
    </div>
  )
}

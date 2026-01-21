"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import PremiumModal from './premium-modal'

const ContractModal = dynamic(() => import('./contract-modal'), { ssr: false })

export default function ContractsOverview({ current }: { current?: any }) {
  const [contracts, setContracts] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(()=>{
    // best-effort fetch; backend may require auth
    fetch('/api/contracts', { credentials: 'include' }).then(r=>r.ok? r.json(): null).then((d:any)=>{
      if (d && Array.isArray(d.contracts)) setContracts(d.contracts)
      else if (d && Array.isArray(d)) setContracts(d)
    }).catch(()=>{})

    fetch('/api/contracts/requests', { credentials: 'include' }).then(r=>r.ok? r.json(): null).then((d:any)=>{
      if (d && Array.isArray(d.requests)) setRequests(d.requests)
      else if (d && Array.isArray(d)) setRequests(d)
    }).catch(()=>{})
  }, [])

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
          {contracts.map((c:any)=> (
            <div key={c._id||c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight:700 }}>{c.property?.address || c._id}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>{c.rentAmount} {c.currency} • {c.status}</div>
              </div>
              <div>
                <button onClick={()=>openManage(c)} style={{ padding:'8px 10px', background:'#111827', color:'#fff', borderRadius:8, border:'none' }}>Manage</button>
              </div>
            </div>
          ))}
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

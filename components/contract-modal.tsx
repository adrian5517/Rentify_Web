"use client"

import React, { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'
import ContractScheduleEditor from './contract-schedule-editor'

export default function ContractModal({ contract, onClose, onSaved }: { contract: any, onClose?: ()=>void, onSaved?: (c:any)=>void }) {
  const token = useAuthStore((s:any)=>s.token)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAccept = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/${contract._id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: `Bearer ${token}` }: {}) },
        credentials: 'include',
        body: JSON.stringify({ signature: { name } })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to accept')
      setMessage('Accepted successfully')
      if (onSaved) onSaved(data.contract)
    } catch (e:any) {
      setMessage(e?.message || String(e))
    }
    setLoading(false)
  }

  const handleScheduleSaved = (c:any) => {
    setMessage('Schedule saved')
    if (onSaved) onSaved(c)
  }

  return (
    <div style={{ maxWidth:780, margin: '16px auto', padding: 16, borderRadius:8, boxShadow:'0 6px 18px rgba(15,23,42,0.08)', background:'#fff' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0 }}>Contract</h2>
        <div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', fontSize:18 }}>×</button>
        </div>
      </div>

      <div style={{ marginTop:12 }}>
        <div><strong>Property:</strong> {contract?.property?._id || contract?.property}</div>
        <div><strong>Owner:</strong> {contract?.owner?._id || contract?.owner}</div>
        <div><strong>Renter:</strong> {contract?.renter?._id || contract?.renter || '—'}</div>
        <div style={{ marginTop:8 }}><strong>Rent:</strong> {contract?.rentAmount} {contract?.currency}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display:'block', marginBottom:6 }}>Signature name</label>
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your full name as signature" style={{ padding:8, borderRadius:6, border:'1px solid #e5e7eb', width:360 }} />
        <div style={{ marginTop:10 }}>
          <button onClick={handleAccept} disabled={loading} style={{ padding:'8px 12px', background:'#10b981', color:'#fff', borderRadius:6, border:'none' }}>{loading? 'Saving…' : 'Accept Contract'}</button>
        </div>
        {message && <div style={{ marginTop:8, color:'#064e3b' }}>{message}</div>}
      </div>

      <div style={{ marginTop:18 }}>
        <ContractScheduleEditor contractId={contract._id} initialSchedule={contract.paymentSchedule} onSaved={handleScheduleSaved} />
      </div>
    </div>
  )
}

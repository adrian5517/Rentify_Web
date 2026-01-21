"use client"

import React, { useState } from 'react'
import config from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'

interface ScheduleItem { dueDate?: string; amount?: number }

export default function ContractScheduleEditor({ contractId, initialSchedule, onSaved }: { contractId: string; initialSchedule?: any[]; onSaved?: (contract:any)=>void }) {
  const token = useAuthStore((s: any) => s.token)
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule && initialSchedule.length ? initialSchedule.map(s=>({ dueDate: s.dueDate? new Date(s.dueDate).toISOString().slice(0,10): '', amount: s.amount })) : [{ dueDate: '', amount: 0 }])
  const [securityDeposit, setSecurityDeposit] = useState<number | ''>('')
  const [totalAmount, setTotalAmount] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateItem = (idx:number, field:keyof ScheduleItem, value:any) => {
    const copy = [...schedule]
    // @ts-ignore
    copy[idx][field] = field === 'amount' ? Number(value) : value
    setSchedule(copy)
  }

  const addRow = () => setSchedule(prev => prev.concat([{ dueDate: '', amount: 0 }]))
  const removeRow = (i:number) => setSchedule(prev => prev.filter((_,idx)=>idx!==i))

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const payload = { schedule: schedule.map(s=>({ dueDate: s.dueDate, amount: s.amount })), securityDeposit: securityDeposit || undefined, totalAmount: totalAmount || undefined }
      const res = await fetch(`${config.API_API}/api/contracts/${contractId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to save schedule')
      if (onSaved) onSaved(data.contract)
    } catch (e:any) {
      setError(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
      <h4 style={{ margin: '0 0 8px 0' }}>Payment Schedule</h4>
      {schedule.map((row, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input type="date" value={row.dueDate||''} onChange={(e)=>updateItem(idx,'dueDate',e.target.value)} style={{ padding:8, borderRadius:6, border:'1px solid #e5e7eb' }} />
          <input type="number" value={row.amount as any} onChange={(e)=>updateItem(idx,'amount',e.target.value)} placeholder="Amount" style={{ padding:8, borderRadius:6, border:'1px solid #e5e7eb', width:140 }} />
          <button onClick={()=>removeRow(idx)} style={{ background:'#ef4444', color:'#fff', padding:'6px 8px', borderRadius:6, border:'none' }}>Remove</button>
        </div>
      ))}

      <div style={{ marginTop: 6 }}>
        <button onClick={addRow} style={{ padding:'8px 10px', borderRadius:6, border:'1px solid #d1d5db', background:'#fff' }}>Add Row</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display:'block', marginBottom:6 }}>Security deposit</label>
        <input type="number" value={securityDeposit as any} onChange={(e)=>setSecurityDeposit(e.target.value?Number(e.target.value):'')} style={{ padding:8, borderRadius:6, border:'1px solid #e5e7eb', width:200 }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={{ display:'block', marginBottom:6 }}>Total amount</label>
        <input type="number" value={totalAmount as any} onChange={(e)=>setTotalAmount(e.target.value?Number(e.target.value):'')} style={{ padding:8, borderRadius:6, border:'1px solid #e5e7eb', width:200 }} />
      </div>

      {error && <div style={{ color:'crimson', marginTop:8 }}>{error}</div>}

      <div style={{ marginTop:12 }}>
        <button onClick={handleSubmit} disabled={loading} style={{ padding:'8px 12px', background:'#111827', color:'#fff', borderRadius:6, border:'none' }}>{loading ? 'Saving…' : 'Save Schedule'}</button>
      </div>
    </div>
  )
}

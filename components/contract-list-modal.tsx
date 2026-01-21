"use client"

import React, { useEffect, useState } from 'react'
import config from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'
import ContractModal from './contract-modal'

export default function ContractListModal({ propertyId, onClose }: { propertyId: string, onClose?: ()=>void }) {
  const token = useAuthStore((s:any)=>s.token)
  const [contracts, setContracts] = useState<any[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any|null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(()=>{ fetchList() }, [propertyId])

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/property/${propertyId}`, { headers: { ...(token?{ Authorization: `Bearer ${token}` }: {}) }, credentials: 'include' })
      const data = await res.json()
      if (res.ok) setContracts(data.contracts || [])
      else setContracts([])
    } catch (e) {
      setContracts([])
    }
    setLoading(false)
  }

  const createNew = async () => {
    if (!token) return alert('Please login')
    setCreating(true)
    try {
      const res = await fetch(`${config.API_API}/api/contracts`, { method: 'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include', body: JSON.stringify({ propertyId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed')
      // Refresh list and open
      await fetchList()
      setSelected(data.contract)
    } catch (e:any) {
      alert(e?.message || String(e))
    }
    setCreating(false)
  }

  const handleClose = () => {
    if (onClose) onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ width:800, maxHeight:'90vh', overflow:'auto', background:'#fff', borderRadius:8, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0 }}>Contracts for Property</h3>
          <button onClick={handleClose} style={{ background:'transparent', border:'none', fontSize:18 }}>×</button>
        </div>

        <div style={{ marginTop:12 }}>
          {loading ? <div>Loading…</div> : (
            <div>
              {contracts && contracts.length > 0 ? (
                <div style={{ display:'grid', gap:8 }}>
                  {contracts.map((c:any)=> (
                    <div key={c._id} style={{ padding:10, border:'1px solid #e5e7eb', borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:600 }}>{c._id}</div>
                        <div style={{ color:'#6b7280' }}>Status: {c.status}</div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>setSelected(c)} style={{ padding:'6px 10px', borderRadius:6 }}>View</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color:'#374151' }}>No contracts found for this property.</div>
              )}

              <div style={{ marginTop:12 }}>
                <button onClick={createNew} disabled={creating} style={{ padding:'8px 12px', background:'#111827', color:'#fff', borderRadius:6 }}>{creating ? 'Creating…' : 'Create New Contract'}</button>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div style={{ marginTop:16 }}>
            <ContractModal contract={selected} contracts={contracts||undefined} onClose={() => setSelected(null)} onSaved={(c)=>{ setSelected(c); fetchList() }} />
          </div>
        )}
      </div>
    </div>
  )
}

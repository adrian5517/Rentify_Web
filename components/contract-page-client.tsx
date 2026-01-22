"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'
// ContractChat removed from contract page view per request
import ContractAgreement from './contract-agreement'
import ContractsOverview from './contracts-overview'
import ContractModal from './contract-modal'

export default function ContractPageClient({ contract, id }: { contract?: any, id?: string }) {
  const token = useAuthStore((s:any)=>s.token)
  const search = useSearchParams()
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)
  const [localContract, setLocalContract] = useState<any | null>(contract || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // fetch contract client-side if not provided (server-side fetch can miss auth)
  useEffect(() => {
    if (localContract || !id) return
    let mounted = true
    setLoading(true)
    setError(null)
    fetch(`${config.API_API}/api/contracts/${id}`, { headers: { ...(token?{ Authorization: `Bearer ${token}` }: {}) }, credentials: 'include' })
      .then(async res => {
        if (!res.ok) throw new Error('Contract not found')
        const d = await res.json()
        if (mounted) setLocalContract(d.contract || d)
      }).catch(e => { if (mounted) setError(String(e)) }).finally(()=>{ if (mounted) setLoading(false) })
    return ()=>{ mounted = false }
  }, [id, token, localContract])

  useEffect(() => {
    const v = search.get('openModal') || search.get('modal')
    if (v) setOpenModal(true)
  }, [search])

  const closeModal = () => {
    setOpenModal(false)
    // remove query param to keep URL clean
    const cid = (localContract && (localContract._id || localContract.id)) || (contract && (contract._id || contract.id)) || id
    try {
      router.replace(`/contracts/${cid}`)
    } catch (e) {
      window.history.replaceState({}, '', `/contracts/${cid}`)
    }
  }

  const signedByCurrentUser = (() => {
    try {
      const uid = useAuthStore.getState().user?._id || useAuthStore.getState().user?.id
      if (!localContract) return false
      if (!uid) return false
      if (String(localContract.renter?._id || localContract.renter) === String(uid)) return !!localContract.renterAccepted?.accepted
      if (String(localContract.owner?._id || localContract.owner) === String(uid)) return !!localContract.ownerAccepted?.accepted
      return !!(localContract.ownerAccepted?.accepted || localContract.renterAccepted?.accepted)
    } catch (e) { return false }
  })()

  return (
    <div>
      <ContractsOverview current={localContract} />

      <div style={{ marginTop:12 }}>
        <div style={{ background:'#fff', padding:16, borderRadius:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div>
              <h2 style={{ margin:0, fontSize:20 }}>{localContract?._id ? `Contract ${localContract._id}` : (id ? `Contract ${id}` : 'Contract')}</h2>
              <div style={{ marginTop:6, color:'#6b7280', fontSize:13 }}>{localContract?.property ? localContract.property.name || localContract.property.title || '' : ''}</div>
            </div>

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ padding:'6px 10px', borderRadius:999, background: localContract?.status === 'active' ? '#10b981' : '#f59e0b', color:'#fff', fontWeight:700 }}>{localContract?.status || 'Draft'}</div>
              {signedByCurrentUser ? <div style={{ padding:'6px 10px', borderRadius:8, background:'#eefbf5', color:'#065f46', fontWeight:600 }}>You Accepted</div> : <button onClick={() => setOpenModal(true)} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Open Agreement</button>}
            </div>
          </div>

          <div style={{ marginTop:16 }}>
            {localContract ? (
              <ContractAgreement contract={localContract} />
            ) : loading ? (
              <div style={{ padding:24, textAlign:'center', color:'#6b7280' }}>Loading contract…</div>
            ) : (
              <div style={{ padding:24, textAlign:'center', color:'#6b7280' }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>Contract not found</div>
                <div style={{ marginBottom:12 }}>{error || 'We could not load this contract. You may need to be signed in or the contract does not exist.'}</div>
                <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
                  <button onClick={() => router.push('/')} className="px-4 py-2 border rounded">Go home</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop:16 }}>
            <h3 style={{ margin:0, fontSize:16 }}>Audit History</h3>
            <div style={{ marginTop:8, maxHeight:200, overflow:'auto' }}>
              {localContract?.history?.length ? localContract.history.map((h:any, i:number) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontWeight:600 }}>{h.action}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>By: {h.by || 'System'} • At: {new Date(h.at).toLocaleString()}</div>
                  {h.notes && <div style={{ fontSize:12 }}>{h.notes}</div>}
                </div>
              )) : <div style={{ color:'#6b7280' }}>No history yet.</div>}
            </div>
          </div>

          <div style={{ marginTop:16 }}>
            <h3 style={{ margin:0, fontSize:16 }}>Documents</h3>
            <div style={{ marginTop:8 }}>
              {localContract?.documents?.length ? localContract.documents.map((d:any, i:number) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color:'#3b82f6' }}>{d.filename}</a>
                  <div style={{ fontSize:12, color:'#6b7280' }}>Uploaded: {new Date(d.uploaded_at).toLocaleString()}</div>
                </div>
              )) : <div style={{ color:'#6b7280' }}>No documents yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {openModal && localContract && (
        <ContractModal contract={localContract} contracts={undefined} onClose={closeModal} onSaved={() => {}} readOnly={false} hideChat={true} />
      )}
    </div>
  )
}

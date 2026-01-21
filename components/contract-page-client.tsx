"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ContractChat from './contract-chat'
import ContractAgreement from './contract-agreement'
import ContractsOverview from './contracts-overview'
import ContractModal from './contract-modal'

export default function ContractPageClient({ contract }: { contract: any }) {
  const search = useSearchParams()
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)

  useEffect(() => {
    const v = search.get('openModal') || search.get('modal')
    if (v) setOpenModal(true)
  }, [search])

  const closeModal = () => {
    setOpenModal(false)
    // remove query param to keep URL clean
    try {
      router.replace(`/contracts/${contract?._id || contract?.id}`)
    } catch (e) {
      // fallback: reload without params
      window.history.replaceState({}, '', `/contracts/${contract?._id || contract?.id}`)
    }
  }

  return (
    <div>
      <ContractsOverview current={contract} />

      <div style={{ marginTop:12 }}>
        <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
          <h2 style={{ margin:0, fontSize:18 }}>{contract?._id ? `Contract ${contract._id}` : 'Contract'}</h2>
          <div style={{ marginTop:12 }}>
            <ContractAgreement contract={contract} />
          </div>
          <div style={{ marginTop:12 }}>
            <ContractChat userA={contract?.owner?._id || contract?.owner} userB={contract?.renter?._id || contract?.renter} contractId={contract?._id} />
          </div>

          <div style={{ marginTop:12 }}>
            <h3 style={{ margin:0, fontSize:16 }}>Audit History</h3>
            <div style={{ marginTop:8, maxHeight:200, overflow:'auto' }}>
              {contract?.history?.length ? contract.history.map((h:any, i:number) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontWeight:600 }}>{h.action}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>By: {h.by || 'System'} • At: {new Date(h.at).toLocaleString()}</div>
                  {h.notes && <div style={{ fontSize:12 }}>{h.notes}</div>}
                </div>
              )) : <div style={{ color:'#6b7280' }}>No history yet.</div>}
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <h3 style={{ margin:0, fontSize:16 }}>Documents</h3>
            <div style={{ marginTop:8 }}>
              {contract?.documents?.length ? contract.documents.map((d:any, i:number) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color:'#3b82f6' }}>{d.filename}</a>
                  <div style={{ fontSize:12, color:'#6b7280' }}>Uploaded: {new Date(d.uploaded_at).toLocaleString()}</div>
                </div>
              )) : <div style={{ color:'#6b7280' }}>No documents yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {openModal && (
        <ContractModal contract={contract} contracts={undefined} onClose={closeModal} onSaved={() => {}} readOnly={false} hideChat={false} />
      )}
    </div>
  )
}

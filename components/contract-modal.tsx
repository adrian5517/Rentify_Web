"use client"

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import config, { CLIENT_URL } from '@/lib/config'
import ContractChat from './contract-chat'
import ContractAgreement from './contract-agreement'
import PremiumModal from './premium-modal'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

export default function ContractModal({ contract: initialContract, contracts, onClose, onSaved, readOnly, hideChat, modalZIndex }: { contract: any, contracts?: any[], onClose?: ()=>void, onSaved?: (c:any)=>void, readOnly?: boolean, hideChat?: boolean, modalZIndex?: number }) {
  const token = useAuthStore((s:any)=>s.token)
  const [contract, setContract] = useState<any>(initialContract)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(()=>{ setContract(initialContract) }, [initialContract])

  const labelFor = (obj: any) => {
    if (!obj) return '—'
    if (typeof obj === 'string') return obj
    return obj.address || obj.name || obj.fullName || obj._id || obj.id || '—'
  }

  const idFor = (obj: any) => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    return obj._id || obj.id || ''
  }

  const handleAccept = (c:any) => {
    // Called when ContractAgreement reports the contract was accepted/saved
    if (c) {
      setContract(c)
      if (onSaved) onSaved(c)
      setMessage('Accepted successfully')
      if (c?.status === 'active') {
        // show modal and optionally navigate
        Swal.fire({ icon: 'success', title: 'Contract activated', text: 'The contract is now active.' }).then((r)=>{
          if (r.isConfirmed) router.push(`/contracts/${c._id}`)
        })
      }
    }
  }

  const switchContract = (id:string) => {
    const found = (contracts || []).find(c=> (c._id||c.id) === id)
    if (found) setContract(found)
  }


  return (
    <PremiumModal title={`Contract ${contract?._id || ''}`} onClose={onClose} zIndex={modalZIndex}>
      <div style={{ maxWidth:740, margin: '0 auto', padding: 8 }}>
        {contracts && contracts.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display:'block', marginBottom:6 }}>Choose contract</label>
            <select onChange={(e)=>switchContract(e.target.value)} value={contract?._id} style={{ padding:8, borderRadius:6, border:'1px solid #0f172a' }}>
              {contracts.map((c:any)=> <option key={c._id} value={c._id}>{c._id} — {c.status}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <div style={{ color:'rgba(255,255,255,0.9)', fontWeight:700 }}>{labelFor(contract?.property)}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginTop:6 }}>
              Owner: {labelFor(contract?.owner)} • Renter: {labelFor(contract?.renter)}
            </div>
            <div style={{ marginTop:8, fontSize:13, color:'rgba(255,255,255,0.8)' }}>Rent: {contract?.rentAmount} {contract?.currency} — Status: {contract?.status}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <ContractAgreement contract={contract} onAccepted={handleAccept} readOnly={readOnly} />
          {message && <div style={{ marginTop:8, color:'#86efac' }}>{message}</div>}
        </div>

        {!hideChat && (
          <div style={{ marginTop: 16 }}>
            <ContractChat userA={idFor(contract?.owner)} userB={idFor(contract?.renter)} contractId={contract?._id} />
          </div>
        )}
      </div>
    </PremiumModal>
  )
}

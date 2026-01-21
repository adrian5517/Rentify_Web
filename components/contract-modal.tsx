"use client"

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import config, { CLIENT_URL } from '@/lib/config'
import ContractChat from './contract-chat'
import ContractAgreement from './contract-agreement'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

export default function ContractModal({ contract: initialContract, contracts, onClose, onSaved }: { contract: any, contracts?: any[], onClose?: ()=>void, onSaved?: (c:any)=>void }) {
  const token = useAuthStore((s:any)=>s.token)
  const [contract, setContract] = useState<any>(initialContract)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(()=>{ setContract(initialContract) }, [initialContract])

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
    <div style={{ maxWidth:780, margin: '16px auto', padding: 16, borderRadius:8, boxShadow:'0 6px 18px rgba(15,23,42,0.08)', background:'#fff' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0 }}>Contract</h2>
        <div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', fontSize:18 }}>×</button>
        </div>
      </div>

      {contracts && contracts.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <label style={{ display:'block', marginBottom:6 }}>Choose contract</label>
          <select onChange={(e)=>switchContract(e.target.value)} value={contract?._id} style={{ padding:8, borderRadius:6, border:'1px solid #e5e7eb' }}>
            {contracts.map((c:any)=> <option key={c._id} value={c._id}>{c._id} — {c.status}</option>)}
          </select>
        </div>
      )}

      <div style={{ marginTop:12 }}>
        <div><strong>Property:</strong> {contract?.property?._id || contract?.property}</div>
        <div><strong>Owner:</strong> {contract?.owner?._id || contract?.owner}</div>
        <div><strong>Renter:</strong> {contract?.renter?._id || contract?.renter || '—'}</div>
        <div style={{ marginTop:8 }}><strong>Rent:</strong> {contract?.rentAmount} {contract?.currency}</div>
        <div style={{ marginTop:8 }}><strong>Status:</strong> {contract?.status}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <ContractAgreement contract={contract} onAccepted={handleAccept} />
        {message && <div style={{ marginTop:8, color:'#064e3b' }}>{message}</div>}
      </div>

      {/* Payment-related UI removed: agreement-only flow per product decision */}

      {/* Inline chat between renter and owner */}
      <div style={{ marginTop: 18 }}>
        <ContractChat userA={contract?.owner?._id || contract?.owner} userB={contract?.renter?._id || contract?.renter} contractId={contract?._id} />
      </div>
    </div>
  )
}

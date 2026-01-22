"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'

type ContractData = any

const TEMPLATE = `RENTAL AGREEMENT

THIS RENTAL AGREEMENT (the “Agreement”) is made and entered into on {{effective_date}} between the undersigned parties as follows:

PARTIES

1. Landlord (referred to herein as “Owner” or “Landlord”): {{rentee_name}}
  Address: {{rentee_address}}
  Email: {{rentee_email}}
  Phone: {{rentee_phone}}

2. Tenant (referred to herein as “Renter” or “Tenant”): {{tenant_name}}
  Address: {{tenant_address}}
  Email: {{tenant_email}}
  Phone: {{tenant_phone}}

PROPERTY

The Owner hereby rents to the Tenant the real property located at:
  Address: {{property_address}}
  Type: {{property_type}}
  Description: {{property_description}}

TERM

1. Term: The term of this Agreement shall commence on {{rental_start_date}} and end on {{rental_end_date}} unless earlier terminated in accordance with this Agreement.
2. Renewal: {{renewal_terms}}

RENT, DEPOSIT, AND PAYMENTS

3. Rent: Tenant shall pay to Owner the sum of {{monthly_rent}} {{currency}} per month, payable in advance on or before the {{rent_due_day}} day of each month.
4. Security Deposit: Tenant shall deposit {{security_deposit}} {{currency}} as security for performance of Tenant’s obligations under this Agreement. The deposit shall be held in accordance with applicable law.
5. Late Payment: Late payments may incur a late fee as set forth: {{late_fee}}.
6. Payment Methods: Accepted payment methods include bank transfer, credit/debit card, and other methods agreed by the parties.

USE AND OCCUPANCY

7. Use: The Property shall be used solely as a residential dwelling by the Tenant and occupants listed in writing by the Tenant and approved by the Owner.
8. Maintenance: Tenant shall maintain the premises in good condition and promptly notify Owner of any damage or necessary repairs. Owner shall be responsible for major structural repairs unless damage is caused by Tenant’s negligence.

TERMINATION

9. Termination: Either party may terminate this Agreement according to applicable notice provisions and local law. Upon termination Tenant shall vacate the Property and return keys and possession to Owner.

GOVERNING LAW AND DISPUTE RESOLUTION

10. Governing Law: This Agreement shall be governed by the laws of the jurisdiction where the Property is located.
11. Dispute Resolution: The parties agree to attempt mediation prior to pursuing litigation for any dispute arising under this Agreement.

DIGITAL SIGNATURE AND ACCEPTANCE

12. Electronic Acceptance: The parties agree that electronic acceptance via the web application (checkbox and recorded signature name and timestamp) constitutes a valid and binding signature for the purposes of this Agreement.

SIGNATURES

By accepting below, the parties acknowledge they have read, understood, and agree to the terms set forth in this Agreement.

Owner / Landlord: {{rentee_name}}
Signature: ____________________    Date: ________

Tenant / Renter: {{tenant_name}}
Signature: ____________________    Date: ________
`

const TEMP_TEMPLATE = `DRAFT RENTAL AGREEMENT

This is a simplified draft of the Rental Agreement. Some fields may be placeholders. Please review and accept when ready.

PROPERTY
Address: {{property_address}}
Type: {{property_type}}
Description: {{property_description}}

TERM
Start Date: {{rental_start_date}}
End Date: {{rental_end_date}}
Renewal: {{renewal_terms}}

FINANCIALS
Monthly Rent: {{monthly_rent}} {{currency}}
Security Deposit: {{security_deposit}} {{currency}}
Late Fee: {{late_fee}}

DIGITAL ACCEPTANCE
Acceptance: Parties accept by checking the acceptance box and applying an electronic signature in the web app. Acceptance timestamps recorded.

Owner: {{rentee_name}} — Email: {{rentee_email}} — Phone: {{rentee_phone}}
Tenant: {{tenant_name}} — Email: {{tenant_email}} — Phone: {{tenant_phone}}

`

function fillTemplate(tpl: string, data: Record<string, any>) {
  return tpl.replace(/{{\s*([\w_\.]+)\s*}}/g, (_, key) => {
    const val = key.split('.').reduce((s, k) => (s && s[k] !== undefined ? s[k] : undefined), data)
    return val === undefined || val === null ? '' : String(val)
  })
}

// Very small markdown-lite renderer: headings (# / ###) and paragraphs
function renderSimpleMarkdown(text: string) {
  const lines = text.split(/\r?\n/)
  const nodes: any[] = []
  let buffer: string[] = []
  const flush = () => {
    if (buffer.length) {
      nodes.push({ type: 'p', text: buffer.join('\n') })
      buffer = []
    }
  }
  for (const line of lines) {
    if (line.startsWith('### ')) { flush(); nodes.push({ type: 'h3', text: line.replace(/^###\s+/, '') }); continue }
    if (line.startsWith('# ')) { flush(); nodes.push({ type: 'h1', text: line.replace(/^#\s+/, '') }); continue }
    if (line.trim() === '') { flush(); continue }
    buffer.push(line)
  }
  flush()
  return nodes
}

export default function ContractAgreement({ contract, onAccepted, readOnly }: { contract: ContractData, onAccepted?: (c:any)=>void, readOnly?: boolean }) {
  const token = useAuthStore((s:any)=>s.token)
  const user = useAuthStore((s:any)=>s.user)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [debugFocus, setDebugFocus] = useState<string | null>(null)

  const [signed, setSigned] = useState<boolean>(() => {
    try {
      const uid = user?._id || user?.id
      if (!contract) return false
      if (uid && (String(contract.renter?._id || contract.renter) === String(uid))) return !!contract.renterAccepted?.accepted
      if (uid && (String(contract.owner?._id || contract.owner) === String(uid))) return !!contract.ownerAccepted?.accepted
      return !!(contract.ownerAccepted?.accepted || contract.renterAccepted?.accepted)
    } catch (e) {
      return false
    }
  })

  useEffect(() => {
    try {
      const uid = user?._id || user?.id
      if (!contract) { setSigned(false); return }
      if (uid && (String(contract.renter?._id || contract.renter) === String(uid))) {
        setSigned(!!contract.renterAccepted?.accepted)
        return
      }
      if (uid && (String(contract.owner?._id || contract.owner) === String(uid))) {
        setSigned(!!contract.ownerAccepted?.accepted)
        return
      }
      setSigned(!!(contract.ownerAccepted?.accepted || contract.renterAccepted?.accepted))
    } catch (e) {
      // ignore
    }
  }, [contract, user])

  // local copy of contract so we can enrich owner/renter when only IDs are present
  const [localContract, setLocalContract] = useState<any>(contract)
  useEffect(()=> setLocalContract(contract), [contract])

  // Fetch full user profiles for owner/renter if the contract only contains IDs
  useEffect(()=>{
    const fetchUser = async (id:string) => {
      try {
        const res = await fetch(`${config.API_API}/api/users/${id}`, { headers: { ...(token?{ Authorization:`Bearer ${token}` }: {}) }, credentials: 'include' })
        if (!res.ok) return null
        const data = await res.json()
        return data.user || data || null
      } catch (e) { return null }
    }

    if (!localContract) return
    const needsOwner = localContract.owner && (typeof localContract.owner === 'string' || (!localContract.owner.email && !localContract.owner.phone))
    const needsRenter = localContract.renter && (typeof localContract.renter === 'string' || (!localContract.renter.email && !localContract.renter.phone))
    if (!needsOwner && !needsRenter) return

    let cancelled = false
    ;(async ()=>{
      const update: any = {}
      if (needsOwner) {
        const id = typeof localContract.owner === 'string' ? localContract.owner : (localContract.owner._id || localContract.owner.id)
        if (id) {
          const u = await fetchUser(String(id))
          if (u && !cancelled) update.owner = u
        }
      }
      if (needsRenter) {
        const id = typeof localContract.renter === 'string' ? localContract.renter : (localContract.renter._id || localContract.renter.id)
        if (id) {
          const u = await fetchUser(String(id))
          if (u && !cancelled) update.renter = u
        }
      }
      if (!cancelled && Object.keys(update).length) setLocalContract((s:any)=> ({ ...(s||{}), ...update }))
    })()
    return ()=>{ cancelled = true }
  }, [localContract, token])

  const downloadPdf = async () => {
    if (!contract?._id) return
    setLoading(true)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/${contract._id}/pdf`, {
        method: 'GET',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include'
      })
      if (!res.ok) throw new Error('PDF not available')
      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition') || ''
      let filename = `contract-${contract._id}.pdf`
      const m = /filename="?([^";]+)"?/.exec(contentDisposition)
      if (m && m[1]) filename = m[1]
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e:any) {
      setMessage(e?.message || String(e))
    }
    setLoading(false)
  }

  const fields = useMemo(() => ({
    effective_date: localContract?.createdAt || contract?.createdAt || new Date().toISOString(),
    rentee_name: (() => {
      const p = localContract?.owner || contract?.owner
      if (!p) return ''
      if (typeof p === 'string') return p
      return p.name || p.fullName || p.email || p._id || ''
    })(),
    rentee_address: (localContract?.owner && (localContract.owner.address || localContract.owner.location)) || contract?.owner?.address || 'No address provided',
    rentee_email: localContract?.owner?.email || contract?.owner?.email || 'No email provided',
    rentee_phone: localContract?.owner?.phone || contract?.owner?.phone || 'No phone provided',
    tenant_name: (() => {
      const p = localContract?.renter || contract?.renter
      if (!p) return ''
      if (typeof p === 'string') return p
      return p.name || p.fullName || p.email || p._id || ''
    })(),
    tenant_address: (localContract?.renter && (localContract.renter.address || localContract.renter.location)) || contract?.renter?.address || 'No address provided',
    tenant_email: localContract?.renter?.email || contract?.renter?.email || 'No email provided',
    tenant_phone: localContract?.renter?.phone || contract?.renter?.phone || 'No phone provided',
    property_address: (localContract?.property && (localContract.property.address || localContract.property.name)) || contract?.property?.address || contract?.property?.name || contract?.property?._id || 'No address provided',
    property_type: (localContract?.property && (localContract.property.type || localContract.property.propertyType)) || contract?.property?.type || (contract?.property?.propertyType) || '',
    property_description: (localContract?.property && (localContract.property.description || localContract.property.name)) || contract?.property?.description || contract?.property?.name || 'No description provided',
    rental_start_date: localContract?.startDate || contract?.startDate || localContract?.rentalStart || contract?.rentalStart || '',
    rental_end_date: localContract?.endDate || contract?.endDate || localContract?.rentalEnd || contract?.rentalEnd || '',
    renewal_terms: localContract?.renewalTerms || contract?.renewalTerms || 'See agreement',
    monthly_rent: localContract?.rentAmount || contract?.rentAmount || localContract?.monthlyRent || contract?.monthlyRent || 'TBD',
    currency: localContract?.currency || contract?.currency || 'PHP',
    rent_due_day: localContract?.dueDay || contract?.dueDay || 1,
    late_fee: localContract?.lateFee || contract?.lateFee || 'See agreement',
    security_deposit: localContract?.securityDeposit || contract?.securityDeposit || 'TBD',
  }), [localContract, contract])

  const currentUserId = useAuthStore((s:any)=>s.user?._id || s.user?.id)

  const personInfo = (p:any) => {
    if (!p) return { name: '—', email: '', phone: '' }
    if (typeof p === 'string') return { name: p, email: '', phone: '' }
    return { name: p.name || p.fullName || p.displayName || p.email || '—', email: p.email || '', phone: p.phone || '' }
  }

  const ownerInfo = personInfo(localContract?.owner || contract?.owner)
  // If renter object is missing, fall back to recorded signature name/email if present
  const rawRenter = localContract?.renter || contract?.renter
  const renterFromSignature = contract?.renterAccepted?.signature ? { name: contract.renterAccepted.signature.name || undefined, email: contract.renterAccepted.signature.email || undefined, phone: undefined } : undefined
  const renterInfo = personInfo(rawRenter || renterFromSignature)
  const isOwner = !!currentUserId && String(contract?.owner?._id || contract?.owner) === String(currentUserId)
  const isRenter = !!currentUserId && String(contract?.renter?._id || contract?.renter) === String(currentUserId)

  const filled = useMemo(() => fillTemplate(TEMPLATE, fields), [fields])
  // If the filled template still contains placeholders or many key fields are missing,
  // use a temporary readable template with sensible defaults so users can see the agreement.
  const displayText = useMemo(() => {
    const hasPlaceholder = /{{\s*[\w_.]+\s*}}/.test(filled)
    const keyMissing = !fields.property_address || !fields.monthly_rent || !fields.security_deposit
    if (hasPlaceholder || keyMissing) {
      // Fill TEMP_TEMPLATE with available fields and reasonable fallbacks
      const tempDefaults = {
        property_address: fields.property_address || 'Testify',
        property_type: fields.property_type || 'house',
        property_description: fields.property_description || 'For Test Only',
        rental_start_date: fields.rental_start_date || '',
        rental_end_date: fields.rental_end_date || '',
        renewal_terms: fields.renewal_terms || 'See agreement',
        monthly_rent: fields.monthly_rent || '',
        currency: fields.currency || 'PHP',
        rent_due_day: fields.rent_due_day || 1,
        late_fee: fields.late_fee || 'See agreement',
        security_deposit: fields.security_deposit || '2000'
      }
      return fillTemplate(TEMP_TEMPLATE, tempDefaults)
    }
    return filled
  }, [filled, fields])

  const nodes = useMemo(() => renderSimpleMarkdown(displayText), [displayText])

  const handleSign = async () => {
    if (!agree) return alert('You must check the acceptance box before signing')
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${config.API_API}/api/contracts/${contract._id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: `Bearer ${token}` }: {}) },
        credentials: 'include',
        body: JSON.stringify({ signature: { name: user?.fullName || user?.name || '' } })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to sign contract')
      setMessage('Signed successfully')
      setSigned(true)
      // Notify parent of accepted/updated contract if provided
      try { if (onAccepted && data?.contract) onAccepted(data.contract) } catch (e) { /* ignore */ }
      // attempt to download signed PDF if available
      try { await downloadPdf() } catch (e) { /* ignore download errors */ }
    } catch (e:any) {
      setMessage(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <div style={{ background:'#fff', padding:16, borderRadius:8, color:'#0f172a', boxShadow:'0 6px 18px rgba(15,23,42,0.06)' }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:160, height:110, borderRadius:8, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          {(contract?.property?.photos && contract.property.photos[0]) ? (
            // @ts-ignore
            <img src={contract.property.photos[0]} alt={contract.property?.name || 'property'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ textAlign:'center', color:'#94a3b8' }}>🏠</div>
          )}
        </div>

        <div style={{ flex:1, display:'flex', gap:12, alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:24, alignItems:'center' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:22, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#4f46e5' }}>{(ownerInfo.name || 'O').charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight:700 }}>{ownerInfo.name}{isOwner ? ' (You)' : ''}</div>
                <div style={{ fontSize:12, color:'#475569', display:'flex', gap:8, alignItems:'center' }}><Mail style={{ width:12, height:12 }} /> {ownerInfo.email || 'No email'}</div>
                <div style={{ fontSize:12, color:'#475569', display:'flex', gap:8, alignItems:'center', marginTop:4 }}><Phone style={{ width:12, height:12 }} /> {ownerInfo.phone || 'No phone'}</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:22, background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#059669' }}>{(renterInfo.name || 'R').charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight:700 }}>{renterInfo.name}{isRenter ? ' (You)' : ''}</div>
                <div style={{ fontSize:12, color:'#475569', display:'flex', gap:8, alignItems:'center' }}><Mail style={{ width:12, height:12 }} /> {renterInfo.email || 'No email'}</div>
                <div style={{ fontSize:12, color:'#475569', display:'flex', gap:8, alignItems:'center', marginTop:4 }}><Phone style={{ width:12, height:12 }} /> {renterInfo.phone || 'No phone'}</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign:'right', color:'#475569' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end' }}><MapPin style={{ width:12, height:12 }} /> <span style={{ fontSize:12 }}>{fields.property_address || 'No address provided'}</span></div>
            <div style={{ marginTop:6, fontSize:12, color:'#6b7280' }}><strong>Rent:</strong> {fields.monthly_rent || '—'} {fields.currency || ''}</div>
            <div style={{ marginTop:6, fontSize:12, color:'#6b7280' }}><strong>Contract:</strong> {contract?._id || '—'} • <strong>Status:</strong> {contract?.status || '—'}</div>
          </div>
        </div>
      </div>

      {/* If the current user is the owner, surface renter contact more prominently */}
      {isOwner && (
        <div style={{ marginBottom:12, padding:12, borderRadius:8, background:'#fff7ed', border:'1px solid #ffedd5', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:22, background:'#fff5f3', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#c2410c' }}>{(renterInfo.name || 'R').charAt(0).toUpperCase()}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700 }}>{renterInfo.name}</div>
            <div style={{ display:'flex', gap:12, marginTop:6, color:'#475569', alignItems:'center' }}>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}><Mail style={{ width:12, height:12 }} /> {renterInfo.email || 'No email'}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}><Phone style={{ width:12, height:12 }} /> {renterInfo.phone || 'No phone'}</div>
            </div>
          </div>
          <div>
            {renterInfo.email && <a href={`mailto:${renterInfo.email}`} style={{ display:'inline-block', padding:'8px 12px', background:'#4f46e5', color:'#fff', borderRadius:8, textDecoration:'none' }}>Email renter</a>}
            {renterInfo.phone && <a href={`tel:${renterInfo.phone}`} style={{ display:'inline-block', marginLeft:8, padding:'8px 12px', background:'#059669', color:'#fff', borderRadius:8, textDecoration:'none' }}>Call</a>}
          </div>
        </div>
      )}

      <div style={{ maxHeight: 520, overflow: 'auto', paddingRight:8 }}>
        {nodes.map((n, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {n.type === 'h1' && <h2 className="text-xl font-semibold">{n.text}</h2>}
            {n.type === 'h3' && <h3 className="text-md font-medium">{n.text}</h3>}
              {n.type === 'p' && <pre style={{ whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0, color:'inherit', lineHeight:1.5 }}>{n.text}</pre>}
          </div>
        ))}
      </div>

      <div style={{ marginTop:8 }}>
        <label htmlFor="contract-agree" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input id="contract-agree" name="contractAgree" type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
          <span style={{ color:'inherit' }}>{readOnly ? 'I have read the terms of this Rental Agreement.' : 'I have read and agree to the terms of this Rental Agreement.'}</span>
        </label>

        {/* Signature name removed — acceptance via checkbox only */}

        {/* Propose Changes removed: acceptance is via checkbox + Sign & Accept */}

        <div style={{ marginTop:12, display:'flex', gap:8 }}>
          <button onClick={handleSign} disabled={loading || signed || !agree || !!readOnly} style={{ padding:'10px 14px', background:'#10b981', color:'#fff', borderRadius:10, border:'none', fontWeight:700, boxShadow:'0 6px 18px rgba(16,185,129,0.12)', opacity: readOnly ? 0.7 : 1 }}>{loading? 'Signing…' : signed ? 'Accepted' : 'Sign & Accept'}</button>
          <button onClick={downloadPdf} disabled={loading} style={{ padding:'10px 14px', background:'#3b82f6', color:'#fff', borderRadius:10, border:'none', fontWeight:600 }}>Download PDF</button>
        </div>

        {message && <div style={{ marginTop:8, color:'#064e3b' }}>{message}</div>}
        {debugFocus && <div style={{ marginTop:6, fontSize:12, color:'#374151' }}>Debug: {debugFocus}</div>}
      </div>
    </div>
  )
}

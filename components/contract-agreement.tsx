"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'

type ContractData = any

const TEMPLATE = `Residential Rental Agreement

Effective Date: {{effective_date}}

Parties

Landlord (Rentee): {{rentee_name}} — {{rentee_address}} — Email: {{rentee_email}} — Phone: {{rentee_phone}}
Tenant (Renter): {{tenant_name}} — {{tenant_address}} — Email: {{tenant_email}} — Phone: {{tenant_phone}}

Property

Address: {{property_address}}
Type: {{property_type}}
Description: {{property_description}}

1. Rental Term
Start Date: {{rental_start_date}}
End Date: {{rental_end_date}}
Renewal: {{renewal_terms}}

2. Rent & Payment
Monthly Rent: {{monthly_rent}} {{currency}}
Due Date: Day {{rent_due_day}} of each month
Late Fee: {{late_fee}}

3. Security Deposit
Amount: {{security_deposit}} {{currency}}

4. Payment Methods
Accepted Methods: GCash, Maya, Bank Transfer, Credit/Debit Card

10. Digital Agreement Clause
Acceptance: Parties accept by checking the acceptance box and applying an electronic signature in the web app. Acceptance timestamps recorded.
`

const TEMP_TEMPLATE = `Property
Address: {{property_address}}
Type: {{property_type}}
Description: {{property_description}}
1. Rental Term
Start Date: {{rental_start_date}}
End Date: {{rental_end_date}}
Renewal: {{renewal_terms}}
2. Rent & Payment
Monthly Rent: {{monthly_rent}} {{currency}}
Due Date: Day {{rent_due_day}} of each month
Late Fee: {{late_fee}}
3. Security Deposit
Amount: {{security_deposit}} {{currency}}
4. Payment Methods
Accepted Methods: GCash, Maya, Bank Transfer, Credit/Debit Card
10. Digital Agreement Clause
Acceptance: Parties accept by checking the acceptance box and applying an electronic signature in the web app. Acceptance timestamps recorded.

I have read and agree to the t
`

function fillTemplate(tpl: string, data: Record<string, any>) {
  return tpl.replace(/{{\s*([\w_\.]+)\s*}}/g, (_, key) => {
    const val = key.split('.').reduce((s, k) => (s && s[k] !== undefined ? s[k] : undefined), data)
    return val === undefined || val === null ? `{{${key}}}` : String(val)
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
  const [name, setName] = useState(user?.fullName || user?.name || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [proposeText, setProposeText] = useState('')

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
    effective_date: contract?.createdAt || new Date().toISOString(),
    rentee_name: contract?.owner?.name || contract?.owner || '',
    rentee_address: contract?.owner?.address || '',
    rentee_email: contract?.owner?.email || '',
    rentee_phone: contract?.owner?.phone || '',
    tenant_name: contract?.renter?.name || contract?.renter || '',
    tenant_address: contract?.renter?.address || '',
    tenant_email: contract?.renter?.email || '',
    tenant_phone: contract?.renter?.phone || '',
    property_address: contract?.property?.address || contract?.property?.name || contract?.property?._id || '',
    property_type: contract?.property?.type || (contract?.property?.propertyType) || '',
    property_description: contract?.property?.description || contract?.property?.name || '',
    rental_start_date: contract?.startDate || contract?.rentalStart || '',
    rental_end_date: contract?.endDate || contract?.rentalEnd || '',
    renewal_terms: contract?.renewalTerms || 'See agreement',
    monthly_rent: contract?.rentAmount || contract?.monthlyRent || '',
    currency: contract?.currency || 'PHP',
    rent_due_day: contract?.dueDay || 1,
    late_fee: contract?.lateFee || 'See agreement',
    security_deposit: contract?.securityDeposit || '',
  }), [contract])

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
    if (!name.trim()) return alert('Please enter your full name for the electronic signature')
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

  const handleProposeEdit = async () => {
    if (!proposeText.trim()) return alert('Please describe the proposed changes')
    setLoading(true)
    setMessage(null)
    try {
      // Send proposal via chat or log history
      const res = await fetch(`${config.API_API}/api/contracts/${contract._id}/propose-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: `Bearer ${token}` }: {}) },
        credentials: 'include',
        body: JSON.stringify({ proposal: proposeText })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to propose edit')
      setMessage('Proposal sent to landlord')
      setProposeText('')
    } catch (e:any) {
      setMessage(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <div style={{ background:'#fff', padding:16, borderRadius:8, color:'#0f172a', boxShadow:'0 6px 18px rgba(15,23,42,0.06)' }}>
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
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
          <span style={{ color:'inherit' }}>{readOnly ? 'I have read the terms of this Rental Agreement.' : 'I have read and agree to the terms of this Rental Agreement.'}</span>
        </label>

        <div style={{ marginTop:8 }}>
          <label style={{ display:'block', marginBottom:6, color:'#374151', fontSize:13 }}>Signature name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', color:'#0f172a', boxShadow:'inset 0 1px 2px rgba(16,24,40,0.04)' }} />
        </div>

        <div style={{ marginTop:8 }}>
          <label style={{ display:'block', marginBottom:6, color:'#374151', fontSize:13 }}>Propose Changes (optional)</label>
          <textarea value={proposeText} onChange={(e)=>setProposeText(e.target.value)} placeholder="Describe changes..." rows={3} style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #e5e7eb', background:'#fafafa', color:'#0f172a', minHeight:80 }} />
          <button onClick={handleProposeEdit} disabled={loading || !!readOnly} style={{ marginTop:8, padding:'8px 12px', background:'#f59e0b', color:'#072f2f', borderRadius:8, border:'none', fontWeight:600, opacity: readOnly ? 0.7 : 1 }}>Propose Changes</button>
        </div>

        <div style={{ marginTop:12, display:'flex', gap:8 }}>
          <button onClick={handleSign} disabled={loading || signed || !agree || !!readOnly} style={{ padding:'10px 14px', background:'#10b981', color:'#fff', borderRadius:10, border:'none', fontWeight:700, boxShadow:'0 6px 18px rgba(16,185,129,0.12)', opacity: readOnly ? 0.7 : 1 }}>{loading? 'Signing…' : signed ? 'Accepted' : 'Sign & Accept'}</button>
          <button onClick={downloadPdf} disabled={loading} style={{ padding:'10px 14px', background:'#3b82f6', color:'#fff', borderRadius:10, border:'none', fontWeight:600 }}>Download PDF</button>
        </div>

        {message && <div style={{ marginTop:8, color:'#064e3b' }}>{message}</div>}
      </div>
    </div>
  )
}

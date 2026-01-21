"use client"

import React, { useState } from 'react'
import PaymentWidget from '@/components/payment-widget'
import { useAuthStore } from '@/lib/auth-store'
import config, { CLIENT_URL } from '@/lib/config'

export default function TestPaymentPage() {
  const [amount, setAmount] = useState<number>(1000)
  const [contractId, setContractId] = useState<string>('')
  const [message, setMessage] = useState<string | null>(null)
  const token = useAuthStore((s: any) => s.token)

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>Payment Widget — Visual Test</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Use this page to test the fake/Stripe payment flows via the UI.</p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Contract ID (optional)</label>
        <input value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="contract id or leave empty" style={{ width: 420, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Amount</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: 200, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <PaymentWidget contractId={contractId || undefined} amount={amount} onSuccess={(p) => setMessage(`Payment succeeded: ${p?._id || p?.provider_id || JSON.stringify(p)}`)} />
      </div>

      {message && <div style={{ marginTop: 12, padding: 12, background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 6 }}>{message}</div>}

      {!token && <div style={{ marginTop: 16, color: '#b91c1c' }}>Note: You must be logged in to create payments. Use the app login to set a token.</div>}

      <div style={{ marginTop: 18 }}>
        <a href={CLIENT_URL} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '8px 12px', background: '#111827', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
          Open Production Site
        </a>
      </div>

    </div>
  )
}

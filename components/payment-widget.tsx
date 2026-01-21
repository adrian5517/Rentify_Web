"use client"

import React, { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'

interface PaymentWidgetProps {
  contractId?: string
  propertyId?: string
  amount?: number
  currency?: string
  onSuccess?: (payment: any) => void
}

export default function PaymentWidget({ contractId, propertyId, amount = 0, currency = 'PHP', onSuccess }: PaymentWidgetProps) {
  const token = useAuthStore((s: any) => s.token)
  const [status, setStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const handlePay = async () => {
    setError(null)
    setStatus('processing')
    try {
      const endpoint = config.USE_FAKE_PAYMENTS ? '/api/payments/fake-pay' : '/api/payments/create-intent'
      const res = await fetch(`${config.API_API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ contractId, propertyId, amount, currency })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Payment failed')

      // Fake payment returns `payment`; Stripe create-intent returns `clientSecret` and `payment`.
      if (config.USE_FAKE_PAYMENTS) {
        setStatus('succeeded')
        if (onSuccess) onSuccess(data.payment)
      } else {
        setClientSecret(data.clientSecret || null)
        // Keep status idle — client must confirm with Stripe.js. We mark as processing to indicate next step needed.
        setStatus('idle')
      }
    } catch (err: any) {
      setStatus('failed')
      setError(err?.message || String(err))
    }
  }

  return (
    <div className="payment-widget">
      <div style={{ marginBottom: 8 }}>
        <strong>Amount:</strong> {amount} {currency}
      </div>
      <div>
        <button className="btn-primary" onClick={handlePay} disabled={status === 'processing'}>
          {status === 'processing' ? 'Processing…' : (config.USE_FAKE_PAYMENTS ? 'Pay (Fake)' : 'Create Payment Intent')}
        </button>
        {status === 'succeeded' && <span style={{ marginLeft: 8, color: 'green' }}>Payment succeeded (fake)</span>}
        {status === 'failed' && <span style={{ marginLeft: 8, color: 'crimson' }}>Failed: {error}</span>}
        {clientSecret && (
          <div style={{ marginTop: 8 }}>
            <div><strong>Client secret received.</strong> Confirm the payment on the client with Stripe.js.</div>
            <div style={{ wordBreak: 'break-word', marginTop: 6 }}>{clientSecret}</div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import config from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'
import ContractListModal from '@/components/contract-list-modal'
import ContractModal from '@/components/contract-modal'

export default function ContractButton({ propertyId }: { propertyId: string }) {
  const token = useAuthStore((s: any) => s.token)
  const [contract, setContract] = useState<any | null>(null)
  const [contractsList, setContractsList] = useState<any[] | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showList, setShowList] = useState(false)

  const createOrOpen = async () => {
    if (!token) {
      alert('Please log in to create a contract')
      return
    }

    setLoading(true)
    try {
      if (!contract) {
        // Fetch contracts for this property and show choices
        try {
          const propRes = await fetch(`${config.API_API}/api/contracts/property/${propertyId}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include' })
          if (propRes.ok) {
            const propData = await propRes.json()
            const list = propData.contracts || []
            if (list.length > 0) {
              // If there are contracts, if exactly one use it, otherwise show the list modal
              if (list.length === 1) {
                setContract(list[0])
                setContractsList(list)
                setOpen(true)
                setLoading(false)
                return
              }
              // multiple contracts: store the list and open list modal
              setContractsList(list)
              setShowList(true)
              setLoading(false)
              return
            }
          }
        } catch (e) {
          // ignore and fallback to creating
        }

        // No existing contract found — create a new one
        const res = await fetch(`${config.API_API}/api/contracts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
          body: JSON.stringify({ propertyId })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'Failed to create contract')
        setContract(data.contract)
      }
      setOpen(true)
    } catch (e: any) {
      alert(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <>
      <button onClick={createOrOpen} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={loading}>
        {loading ? 'Working…' : 'Rent / Manage Lease'}
      </button>

      {showList && (
        <ContractListModal propertyId={propertyId} onClose={() => setShowList(false)} />
      )}
      {open && contract && (() => {
        if (typeof document === 'undefined') {
          return <ContractModal contract={contract} contracts={contractsList || undefined} onClose={() => setOpen(false)} onSaved={(c) => setContract(c)} readOnly={true} hideChat={true} modalZIndex={99999} />
        }

        let portalRoot = document.getElementById('rentify-modal-root') as HTMLElement | null
        if (!portalRoot) {
          portalRoot = document.createElement('div')
          portalRoot.id = 'rentify-modal-root'
          Object.assign(portalRoot.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            pointerEvents: 'auto'
          })
          // append to documentElement to avoid stacking context issues
          document.documentElement.appendChild(portalRoot)
        }

        return ReactDOM.createPortal(
          <ContractModal contract={contract} contracts={contractsList || undefined} onClose={() => setOpen(false)} onSaved={(c) => setContract(c)} readOnly={true} hideChat={true} modalZIndex={2147483646} />,
          portalRoot
        )
      })()}
    </>
  )
}

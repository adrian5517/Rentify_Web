"use client"

import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import config from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'
import ContractListModal from '@/components/contract-list-modal'
import ContractModal from '@/components/contract-modal'

export default function ContractButton({ propertyId }: { propertyId: string }) {
  const token = useAuthStore((s: any) => s.token)
  const router = useRouter()
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
                // If there are contracts, if exactly one navigate to it, otherwise show the list modal
                if (list.length === 1) {
                  const found = list[0]
                  setContract(found)
                  setContractsList(list)
                  const cid = found._id || found.id
                  try { router.push(`/contracts/${cid}?openModal=1`) } catch(e) { window.location.href = `/contracts/${cid}?openModal=1` }
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
        const created = data.contract
        setContract(created)
        const cid = created._id || created.id
        try { router.push(`/contracts/${cid}?openModal=1`) } catch(e) { window.location.href = `/contracts/${cid}?openModal=1` }
        setLoading(false)
        return
      }
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
          return <ContractModal contract={contract} contracts={contractsList || undefined} onClose={() => setOpen(false)} onSaved={(c) => setContract(c)} readOnly={false} hideChat={true} modalZIndex={99999} />
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
          // append to body (safer for event handling and standard portal usage)
          document.body.appendChild(portalRoot)
        }

        return ReactDOM.createPortal(
          <ContractModal contract={contract} contracts={contractsList || undefined} onClose={() => setOpen(false)} onSaved={(c) => setContract(c)} readOnly={false} hideChat={true} modalZIndex={2147483646} />,
          portalRoot
        )
      })()}
    </>
  )
}

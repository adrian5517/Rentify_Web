"use client"

import React, { useEffect, useState } from 'react'
import { fetchConversations } from '../lib/api'

export interface Participant {
  _id: string
  username?: string
  fullName?: string
  profilePicture?: string
}

export interface ConversationSummary {
  participant: Participant
  lastMessage?: {
    _id?: string
    message?: string
    createdAt?: string
  }
  unreadCount?: number
  totalMessages?: number
  lastMessageAt?: string
}

export default function Conversations({
  limit = 20,
  onSelect,
  search,
}: {
  limit?: number
  onSelect?: (participant: Participant) => void
  search?: string
}) {
  const [convos, setConvos] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchConversations(limit, page * limit)
        if (!mounted) return
        setConvos((prev) => {
          // merge/dedupe by participant._id
          const map = new Map<string, ConversationSummary>()
          prev.concat(data).forEach((c: any) => {
            const id = c.participant?._id || c.participant?.id
            if (!id) return
            if (!map.has(id)) map.set(id, c)
          })
          return Array.from(map.values())
        })
      } catch (err) {
        console.error('Error loading conversations', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [limit, page])

  // Apply search filter client-side if provided
  const visibleConvos = search && search.trim().length > 0
    ? convos.filter(c => {
        const term = search!.toLowerCase()
        const name = (c.participant?.username || c.participant?.fullName || '').toLowerCase()
        const last = (c.lastMessage?.message || '').toLowerCase()
        return name.includes(term) || last.includes(term)
      })
    : convos

  if (loading && visibleConvos.length === 0) return <div>Loading conversations…</div>

  return (
    <div>
      <ul>
        {visibleConvos.map((c) => (
          <li key={c.participant._id}>
            <button
              onClick={() => onSelect && onSelect(c.participant)}
              className={`w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 text-left hover:bg-white/70`}
            >
              <div className="relative">
                {c.participant.profilePicture ? (
                  <img
                    src={c.participant.profilePicture.startsWith('http') ? c.participant.profilePicture : `https://rentify-server-ge0f.onrender.com${c.participant.profilePicture}`}
                    alt={c.participant.username || c.participant.fullName}
                    className="w-12 h-12 rounded-full object-cover shadow-md"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex' }}
                  />
                ) : null}
                <div
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-400 flex items-center justify-center font-bold text-white text-lg shadow-md"
                  style={{ display: c.participant.profilePicture ? 'none' : 'flex' }}
                >
                  {(c.participant.username || c.participant.fullName || 'U').charAt(0).toUpperCase()}
                </div>
                {c.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">{c.unreadCount}</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 truncate text-sm sm:text-base">{c.participant.username || c.participant.fullName || 'Unknown'}</h3>
                  <div className="text-xs text-slate-500 ml-2 whitespace-nowrap">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}</div>
                </div>
                <p className="text-sm text-slate-500 truncate">{c.lastMessage?.message || ''}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1 bg-gray-100 rounded"
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {page + 1}</div>
        <button onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-gray-100 rounded">
          Next
        </button>
      </div>
    </div>
  )
}

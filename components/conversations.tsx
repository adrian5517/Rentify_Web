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
          <li
            key={c.participant._id}
            className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelect && onSelect(c.participant)}
          >
            <img
              src={c.participant.profilePicture || '/placeholder-user.jpg'}
              alt="avatar"
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <strong className="truncate">{c.participant.username || c.participant.fullName || 'Unknown'}</strong>
                <small className="text-xs text-gray-500">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}</small>
              </div>
              <div className="text-sm text-gray-600 truncate">{c.lastMessage?.message || ''}</div>
            </div>
            {c.unreadCount && c.unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{c.unreadCount}</span>
            )}
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

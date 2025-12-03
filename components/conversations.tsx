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
    // Listen for newly sent messages to update conversation list in realtime
    const onMessageSent = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail
        const msg = detail?.message
        if (!msg) return

        // Determine the other participant id and a summary
        const currentUserRaw = localStorage.getItem('auth-storage')
        let currentUserId: string | null = null
        try {
          if (currentUserRaw) {
            const parsed = JSON.parse(currentUserRaw)
            const u = parsed.state?.user
            currentUserId = u?._id || u?.id || null
          }
        } catch (err) {
          // ignore
        }

        const senderRaw = msg.sender || msg.senderId || msg.sender?._id || msg.sender
        const receiverRaw = msg.receiver || msg.receiverId || msg.receiver?._id || msg.receiver

        const makeUserFrom = (raw: any) => {
          if (!raw) return null
          // raw can be string id or object
          if (typeof raw === 'string') return { _id: raw }
          if (raw._id || raw.id) {
            return {
              _id: raw._id || raw.id,
              username: raw.username || raw.name || raw.fullName || raw.full_name || '',
              fullName: raw.fullName || raw.name || raw.full_name || '',
              profilePicture: raw.profilePicture || raw.avatar || raw.profile_picture || raw.photo || '',
            }
          }
          return null
        }

        const senderUser = makeUserFrom(msg.sender) || makeUserFrom(msg.senderUser) || makeUserFrom(senderRaw)
        const receiverUser = makeUserFrom(msg.receiver) || makeUserFrom(msg.receiverUser) || makeUserFrom(receiverRaw)

        const otherUser = String(currentUserId) === String(senderUser?._id || senderRaw)
          ? receiverUser || { _id: String(receiverRaw) }
          : senderUser || { _id: String(senderRaw) }

        const otherId = otherUser?._id || String(otherUser)

        setConvos(prev => {
          const copy = [...prev]
          const idx = copy.findIndex(c => ((c.participant as any)?._id || (c.participant as any)?.id) === otherId)
          const summary: ConversationSummary = {
            participant: {
              _id: otherId,
              username: otherUser?.username || otherUser?.fullName || '',
              fullName: otherUser?.fullName || otherUser?.username || '',
              profilePicture: otherUser?.profilePicture || '',
            },
            lastMessage: { _id: msg._id || msg.id || undefined, message: msg.message || msg.text || '', createdAt: msg.createdAt || new Date().toISOString() },
            lastMessageAt: msg.createdAt || new Date().toISOString(),
            unreadCount: 0,
            totalMessages: (copy[idx]?.totalMessages || 0) + 1,
          }

          if (idx >= 0) {
            copy[idx] = { ...copy[idx], ...summary }
          } else {
            copy.unshift(summary)
          }
          return copy
        })
      } catch (err) {
        console.warn('Error handling rentify:messageSent event', err)
      }
    }

    window.addEventListener('rentify:messageSent', onMessageSent as EventListener)
    return () => {
      mounted = false
      window.removeEventListener('rentify:messageSent', onMessageSent as EventListener)
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
        {visibleConvos.map((c, idx) => {
          const raw = (c.participant as any) || ({} as any)
          const id = raw._id || raw.id || `unknown-${idx}`
          const participant = {
            _id: id,
            username: raw.username,
            fullName: raw.fullName,
            profilePicture: raw.profilePicture,
          }

          return (
            <li key={id}>
              <button
                onClick={() => {
                  console.log('Conversations: contact clicked', participant)
                  onSelect && onSelect(participant as any)
                }}
                className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 text-left hover:bg-white/70"
              >
                <div className="relative">
                  {participant.profilePicture ? (
                    <img
                      src={participant.profilePicture.startsWith('http') ? participant.profilePicture : `https://rentify-server-ge0f.onrender.com${participant.profilePicture}`}
                      alt={participant.username || participant.fullName}
                      className="w-12 h-12 rounded-full object-cover shadow-md"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex' }}
                    />
                  ) : null}
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-400 flex items-center justify-center font-bold text-white text-lg shadow-md"
                    style={{ display: participant.profilePicture ? 'none' : 'flex' }}
                  >
                    {(participant.username || participant.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                  {(c.unreadCount ?? 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">{c.unreadCount}</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 truncate text-sm sm:text-base">{participant.username || participant.fullName || 'Unknown'}</h3>
                    <div className="text-xs text-slate-500 ml-2 whitespace-nowrap">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}</div>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{c.lastMessage?.message || ''}</p>
                </div>
              </button>
            </li>
          )
        })}
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

"use client"

import React, { useEffect, useState, useRef } from 'react'
import { fetchMessages, sendMessageAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import socketClient from '@/lib/socket-client'

export default function ContractChat({ userA, userB, contractId }: { userA: string, userB: string, contractId?: string }) {
  const currentUser = useAuthStore((s:any)=>s.user)
  const token = useAuthStore((s:any)=>s.token)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement|null>(null)
  const idsRef = useRef<Set<string>>(new Set())

  // Initial load via REST
  useEffect(()=>{
    let mounted = true
    const other = userA === currentUser?._id ? userB : userA
    fetchMessages(currentUser?._id, other).then(ms=>{ if (mounted) {
      setMessages(ms || [])
      idsRef.current = new Set((ms||[]).map((m:any)=>m._id || m.id))
    }}).catch(()=>{})
    return ()=>{ mounted = false }
  }, [userA, userB, currentUser?._id])

  // Scroll to bottom when messages change
  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Socket: create, join room, and listen for incoming messages
  useEffect(()=>{
    if (!currentUser) return
    const socket = socketClient.createSocket(token)
    if (!socket) return

    const room = contractId ? `contract:${contractId}` : [userA, userB].sort().join(':')

    // Join a room for this conversation
    try { socket.emit('join_room', { room }) } catch (e) { /* ignore */ }

    const handler = (msg:any) => {
      try {
        const id = msg._id || msg.id || msg._msgId
        if (id && idsRef.current.has(id)) return
        // If contractId exists and message has a contractId, filter
        if (contractId && msg.contractId && String(msg.contractId) !== String(contractId)) return
        // If no contractId, ensure message is between the two users
        if (!contractId) {
          const other = userA === currentUser._id ? userB : userA
          if (!([msg.sender, msg.receiver].includes(currentUser._id) && [msg.sender, msg.receiver].includes(other))) return
        }
        if (id) idsRef.current.add(id)
        setMessages(prev => [...prev, msg])
      } catch (e) {
        // ignore handler errors
      }
    }

    // Listen for common event names used across servers
    socket.on('contract_message', handler)
    socket.on('new_message', handler)
    socket.on('message', handler)

    // Also listen for optimistic local dispatches from sendMessageAPI
    const localHandler = (ev: any) => {
      const msg = ev?.detail?.message
      if (msg) handler(msg)
    }
    window.addEventListener('rentify:messageSent', localHandler as EventListener)

    return () => {
      try {
        socket.emit('leave_room', { room })
      } catch (e) { /* ignore */ }
      socket.off('contract_message', handler)
      socket.off('new_message', handler)
      socket.off('message', handler)
      window.removeEventListener('rentify:messageSent', localHandler as EventListener)
    }
  }, [contractId, userA, userB, currentUser?._id, token])

  const send = async () => {
    if (!text.trim()) return
    if (!currentUser) return alert('Please login to send messages')
    setLoading(true)
    const receiver = userA === currentUser._id ? userB : userA
    if (!receiver) {
      setLoading(false)
      console.warn('ContractChat: receiver is undefined — cannot send message', { userA, userB, currentUser })
      return alert('Cannot determine message recipient (recipient is missing)')
    }
    try {
      // Use REST API to persist message. Server is expected to broadcast via socket to other clients.
      const res = await sendMessageAPI(currentUser._id, receiver, text.trim())
      // Avoid duplicates
      const id = res._id || res.id
      if (id && !idsRef.current.has(id)) {
        idsRef.current.add(id)
        setMessages(prev => [...prev, res])
      }
      setText('')
    } catch (e:any) {
      alert(e?.message || 'Failed to send message')
    }
    setLoading(false)
  }

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 16, paddingTop: 12 }}>
      <h4 className="font-semibold">Conversation</h4>
      <div style={{ maxHeight: 220, overflow: 'auto', padding: '8px 4px', marginTop:8, background:'#fafafa', borderRadius:6 }}>
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">No messages yet. Use the box below to start a conversation.</div>
        ) : (
          messages.map((m:any)=> (
            <div key={m._id || m.id || JSON.stringify(m).slice(0,20)} style={{ display:'flex', justifyContent: m.sender === currentUser?._id ? 'flex-end' : 'flex-start', marginBottom:8 }}>
              <div style={{ maxWidth: '70%', background: m.sender === currentUser?._id ? '#DCFCE7' : '#fff', padding:10, borderRadius:8, boxShadow:'0 1px 0 rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize:13, color:'#111827' }}>{m.message || m.text || ''}</div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:6 }}>{new Date(m.createdAt || m.timestamp || Date.now()).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a message..." style={{ flex:1, padding:8, borderRadius:8, border:'1px solid #e5e7eb' }} />
        <button onClick={send} disabled={loading} style={{ padding:'8px 12px', background:'#4f46e5', color:'#fff', borderRadius:8 }}>{loading? 'Sending…' : 'Send'}</button>
      </div>
    </div>
  )
}

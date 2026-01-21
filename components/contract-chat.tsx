"use client"

import React, { useEffect, useState, useRef } from 'react'
import { fetchMessages, sendMessageAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export default function ContractChat({ userA, userB }: { userA: string, userB: string }) {
  const currentUser = useAuthStore((s:any)=>s.user)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    let mounted = true
    const other = userA === currentUser?._id ? userB : userA
    fetchMessages(currentUser?._id, other).then(ms=>{ if (mounted) setMessages(ms || []) }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [userA, userB, currentUser?._id])

  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim()) return
    if (!currentUser) return alert('Please login to send messages')
    setLoading(true)
    const receiver = userA === currentUser._id ? userB : userA
    try {
      const res = await sendMessageAPI(currentUser._id, receiver, text.trim())
      setMessages(prev => [...prev, res])
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
            <div key={m._id || m.id || Math.random()} style={{ display:'flex', justifyContent: m.sender === currentUser?._id ? 'flex-end' : 'flex-start', marginBottom:8 }}>
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

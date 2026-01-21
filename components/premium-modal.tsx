"use client"

import React from 'react'

export default function PremiumModal({ title, children, onClose, zIndex }: { title?: string, children: React.ReactNode, onClose?: ()=>void, zIndex?: number }) {
  const stack = typeof zIndex === 'number' ? zIndex : 60
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(2,6,23,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:stack }}>
      <div style={{ width:'min(900px,96%)', maxHeight:'90vh', overflow:'auto', background:'#0f172a', borderRadius:12, boxShadow:'0 12px 40px rgba(2,6,23,0.6)', padding:16, color:'#f8fafc' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>RN</div>
            <div>
              <div style={{ fontSize:18, fontWeight:700 }}>{title || 'Manage'}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>Secure contract workspace</div>
            </div>
          </div>
          <div>
            <button onClick={onClose} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.06)', color:'#f8fafc', padding:'6px 10px', borderRadius:8 }}>Close</button>
          </div>
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.03)', paddingTop:12 }}>{children}</div>
      </div>
    </div>
  )
}

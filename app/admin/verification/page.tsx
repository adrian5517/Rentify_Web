"use client";

import React, { useEffect, useState } from 'react';
import { API_API } from '@/lib/config'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'

type Doc = { filename?: string; url?: string };
type UserRef = { username?: string; email?: string };
type Property = {
  _id: string;
  name?: string;
  postedBy?: UserRef;
  verification_documents?: Doc[];
  verification_status?: 'pending' | 'verified' | 'rejected';
  verified?: boolean;
  verification_notes?: string;
  verification_history?: Array<{ action?: string; by?: any; at?: string; notes?: string }>;
};

export default function AdminVerificationPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 6
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'pending'|'verified'|'rejected'|'unverified'>('pending')

  // modal viewer
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerDocs, setViewerDocs] = useState<Doc[] | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotes, setActionNotes] = useState('')

  const router = useRouter()
  const { user, token } = useAuthStore()

  // Helper: map raw action keys to friendly labels and support simple per-language translations
  function formatActionLabel(action?: string) {
    if (!action) return '';

    // Base mapping (English keys)
    const baseMap: Record<string, string> = {
      documents_uploaded: 'Docs uploaded',
      documents_uploaded_by_owner: 'Docs uploaded',
      submitted_for_verification: 'Submitted for verification',
      submitted: 'Submitted',
      verified: 'Verified',
      rejected: 'Rejected',
      manual_flag: 'Manually flagged',
      auto_verified: 'Auto verified',
      owner_updated: 'Owner updated listing',
      verification_notes_updated: 'Notes updated',
      review_requested: 'Review requested',
      review_escalated: 'Review escalated',
    };

    // Simple translations (extend as needed)
    const translations: Record<string, Record<string, string>> = {
      en: baseMap,
      tl: {
        documents_uploaded: 'Mga dokumentong in-upload',
        documents_uploaded_by_owner: 'Mga dokumentong in-upload ng may-ari',
        submitted_for_verification: 'Isinumite para sa beripikasyon',
        submitted: 'Isinumite',
        verified: 'Na-verify',
        rejected: 'Tinanggihan',
        manual_flag: 'Manu-manong tinag',
        auto_verified: 'Awtomatikong naka-verify',
        owner_updated: 'In-update ng may-ari',
        verification_notes_updated: 'Mga tala na-update',
        review_requested: 'Hiningi ang pagsusuri',
        review_escalated: 'Pina-escalate sa pagsusuri',
      }
    };

    // determine language (use navigator if available)
    let lang = 'en';
    try { lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.split('-')[0] : 'en'; } catch (e) { lang = 'en' }
    const localeMap = translations[lang] || translations['en'];

    if (localeMap && localeMap[action]) return localeMap[action];
    if (baseMap[action]) return baseMap[action];

    // Fallback: prettify
    const pretty = action.replace(/_/g, ' ');
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  }

  function formatTimestamp(ts?: string) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return ts;
    }
  }

  // Client-side guard: only allow admins
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    // If there's no user but token exists, the auth store may not be hydrated yet.
    // Wait a tick for store to populate, then check role.
    const t = setTimeout(() => {
      if (!user) {
        // Not logged in -> redirect to auth
        router.replace('/auth')
      } else if (user.role !== 'admin') {
        // Not an admin -> redirect to home
        router.replace('/')
      } else {
        setCheckedAuth(true)
      }
    }, 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchByStatus(p = page, status = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('limit', String(PAGE_SIZE))
      if (query && query.trim()) params.set('q', query.trim())
      const endpoint = `${API_API}/api/properties/admin/${status}?${params.toString()}`
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setItems(json.properties || []);
      setTotal(json.total || 0)
      setTotalPages(Math.max(1, Math.ceil((json.total || 0) / PAGE_SIZE)))
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchByStatus(page, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, token, statusFilter]);

  async function doAction(id: string, action: 'verify' | 'reject', notes = '') {
    setActionLoading(true);
    try {
      const url = `${API_API}/api/properties/admin/${id}/${action === 'verify' ? 'verify' : 'reject'}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Action failed: ${res.status}`);
      }
      // Refresh list and selected property details
      await fetchByStatus();
      if (selectedProperty && selectedProperty._id === id) {
        // reload fresh data for modal if still open
        const refreshed = await fetch(`${API_API}/api/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (refreshed.ok) {
          const json = await refreshed.json().catch(() => null);
          setSelectedProperty(json?.property || null);
        }
      }
      alert(`Property ${action === 'verify' ? 'approved' : 'rejected'} successfully.`);
      setViewerOpen(false)
      setSelectedProperty(null)
    } catch (err: any) {
      alert('Error: ' + (err.message || String(err)));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin — Verification Queue</h1>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          placeholder="Search by property name or owner email"
          className="border rounded px-3 py-2 w-full max-w-md"
        />
        <div className="text-sm text-gray-500">{total} total</div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => { setStatusFilter('pending'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Pending</button>
        <button onClick={() => { setStatusFilter('verified'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Approved</button>
        <button onClick={() => { setStatusFilter('rejected'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-100'}`}>Rejected</button>
        <button onClick={() => { setStatusFilter('unverified'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'unverified' ? 'bg-gray-600 text-white' : 'bg-slate-100'}`}>Unverified</button>
      </div>

      {(!checkedAuth || loading) && <div className="mb-4">Loading…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {items.length === 0 && !loading ? (
        <div className="text-sm text-gray-600">No pending properties.</div>
      ) : null}

      {/* paginated server-driven items */}
      {items.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <div key={p._id} className="bg-white rounded-lg shadow-md overflow-hidden border">
                <div className="h-48 bg-gray-100">
                  {p.verification_documents && p.verification_documents.length > 0 && p.verification_documents[0].url ? (
                    <img src={p.verification_documents[0].url} alt={p.verification_documents[0].filename || p.name || 'property'} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-lg truncate">{p.name || 'Untitled property'}</div>
                      <div className="text-sm text-gray-500">{p.postedBy?.username || p.postedBy?.email || 'owner unknown'}</div>
                      <div className="mt-2 text-xs text-gray-600">{p.verification_notes ? p.verification_notes : (<span className="italic text-gray-400">No notes</span>)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-2 py-1 rounded text-xs ${p.verification_status === 'verified' ? 'bg-emerald-600 text-white' : p.verification_status === 'rejected' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-black'}`}>{p.verification_status || 'unverified'}</div>
                      <button
                        onClick={async () => {
                          setSelectedProperty(p);
                          setActionNotes(p.verification_notes || '');
                          setViewerDocs(p.verification_documents || []);
                          setViewerOpen(true);
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        See details
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={() => { setSelectedProperty(p); setActionNotes(''); setViewerDocs(p.verification_documents || []); setViewerOpen(true); }} className="flex-1 px-3 py-2 text-sm rounded bg-slate-100">View</button>
                    <button onClick={() => { setSelectedProperty(p); setActionNotes('Approved via admin UI'); doAction(p._id, 'verify', 'Approved via admin UI'); }} disabled={actionLoading} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:opacity-90">Approve</button>
                    <button onClick={() => {
                      const reason = prompt('Rejection reason (required):', '')
                      if (reason === null) return
                      const trimmed = reason.trim()
                      if (!trimmed) { alert('Rejection reason required'); return }
                      setSelectedProperty(p); setActionNotes(trimmed); doAction(p._id, 'reject', trimmed)
                    }} disabled={actionLoading} className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* pagination controls */}
          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-slate-100">Prev</button>
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded bg-slate-100">Next</button>
            </div>
          )}
        </>
      )}

      {/* Document viewer modal */}
      <Dialog open={viewerOpen} onOpenChange={(open) => { setViewerOpen(open); if (!open) { setViewerDocs(null); setSelectedProperty(null); setActionNotes('') } }}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-5xl max-h-[92vh] overflow-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">Review documents and verification history, then approve or reject.</DialogDescription>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-2 space-y-3">
              {selectedProperty ? (
                <>
                  <div className="text-lg font-semibold">{selectedProperty.name}</div>
                  <div className="text-sm text-gray-500">Owner: {selectedProperty.postedBy?.username || selectedProperty.postedBy?.email || 'unknown'}</div>
                  <div className="mt-2 text-sm text-gray-700">{selectedProperty.verification_notes || <span className="italic text-gray-400">No notes provided</span>}</div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewerDocs && viewerDocs.length > 0 ? (
                      viewerDocs.map((d, i) => (
                        <div key={i} className="border rounded overflow-hidden bg-white">
                          {d.url ? (
                            <img src={d.url} alt={d.filename || `doc-${i}`} className="w-full h-40 sm:h-48 md:h-56 object-contain cursor-pointer bg-gray-50" onClick={() => window.open(d.url, '_blank')} />
                          ) : (
                            <div className="w-full h-40 sm:h-48 md:h-56 flex items-center justify-center text-gray-400">No preview</div>
                          )}
                          <div className="p-2 text-xs text-gray-700">{d.filename || 'document'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600">No documents uploaded for this property.</div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-600">Recent Verification Activity</div>
                    <div className="mt-2 text-sm text-gray-700">
                      {selectedProperty.verification_history && selectedProperty.verification_history.length > 0 ? (
                        <ul className="space-y-2">
                          {(selectedProperty.verification_history as any).slice().reverse().map((h: any, idx: number) => (
                            <li key={idx} className="p-2 border rounded">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{formatActionLabel(h.action)}</div>
                                  <div className="text-xs text-gray-500">by {(typeof h.by === 'string' ? h.by : (h.by?.username || h.by?.email || 'user'))}</div>
                                </div>
                                <div className="text-xs text-gray-400">{formatTimestamp(h.at)}</div>
                              </div>
                              {h.notes ? <div className="mt-2 text-sm text-gray-700">{h.notes}</div> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-500">No activity yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">Select a property to view details.</div>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <div className="p-3 bg-slate-50 rounded border sticky top-4">
                <div className="text-sm text-gray-600 mb-2">Verification Notes</div>
                <textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} className="w-full p-2 border rounded resize-none text-sm" rows={5} />

                <div className="mt-3 flex gap-2">
                  <button disabled={!selectedProperty || actionLoading} onClick={() => selectedProperty && doAction(selectedProperty._id, 'verify', actionNotes)} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded text-sm sm:text-base">Approve</button>
                  <button disabled={!selectedProperty || actionLoading} onClick={() => {
                    if (!selectedProperty) return;
                    const reason = actionNotes.trim() || prompt('Provide rejection reason (required):', '') || '';
                    if (!reason.trim()) { alert('Rejection reason required'); return }
                    doAction(selectedProperty._id, 'reject', reason.trim())
                  }} className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm sm:text-base">Reject</button>
                </div>

                <div className="mt-3 text-xs text-gray-500">Actions are recorded in verification history. Closing this dialog does not auto-approve.</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose className="px-3 py-2 rounded bg-slate-100">Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

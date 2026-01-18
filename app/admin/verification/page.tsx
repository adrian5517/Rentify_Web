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
    setLoading(true);
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
      await fetchByStatus();
      alert(`Property ${action === 'verify' ? 'approved' : 'rejected'} successfully.`);
    } catch (err: any) {
      alert('Error: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
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
          <div className="space-y-4 mt-4">
            {items.map((p) => (
              <div key={p._id} className="p-4 border rounded shadow-sm bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-lg">{p.name || 'Untitled property'}</div>
                    <div className="text-sm text-gray-500">Owner: {p.postedBy?.email || p.postedBy?.username || 'unknown'}</div>
                    <div className="text-xs text-gray-400 mt-1">Status: {p.verification_status || 'unverified'}</div>
                    {/* Verification notes and recent history for admin context */}
                    {(p.verification_notes || (p.verification_history && p.verification_history.length > 0)) && (
                      <div className="mt-2 text-sm text-slate-600">
                        {p.verification_notes ? (
                          <div className="mb-1"><span className="font-medium">Notes:</span> <span className="ml-1">{p.verification_notes}</span></div>
                        ) : null}

                        {p.verification_history && p.verification_history.length > 0 ? (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Recent activity:</div>
                            <ul className="text-xs space-y-1">
                              {(p.verification_history as any).slice(-3).reverse().map((h: any, i: number) => (
                                <li key={i} className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{formatActionLabel(h.action)}</span>
                                    <span className="text-gray-500">by {(typeof h.by === 'string' ? h.by : (h.by?.username || h.by?.email || 'user'))}</span>
                                    <span className="text-gray-400">{formatTimestamp(h.at)}</span>
                                  </div>
                                  {h.notes ? <div className="text-gray-700 ml-1">{h.notes}</div> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                    <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!p.verification_documents || p.verification_documents.length === 0) {
                          alert('No verification documents uploaded');
                          return;
                        }
                        setViewerDocs(p.verification_documents || [])
                        setViewerOpen(true)
                      }}
                      className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      View Documents
                    </button>
                    <button
                      onClick={() => doAction(p._id, 'verify', 'Approved via admin dashboard')}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:opacity-90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        // Require non-empty rejection reason
                        let reason = prompt('Rejection reason (required):', '');
                        if (reason === null) return; // cancelled
                        reason = reason.trim();
                        while (!reason) {
                          reason = prompt('Rejection reason is required. Please provide details:', '') || '';
                          if (reason === null) return; // cancelled
                          reason = reason.trim();
                        }
                        doAction(p._id, 'reject', reason);
                      }}
                      className="px-3 py-1 rounded bg-red-600 text-white hover:opacity-90"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {p.verification_documents && p.verification_documents.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {p.verification_documents.map((d, i) => (
                      <div key={i} className="border rounded overflow-hidden">
                        {d.url ? (
                          <img src={d.url} alt={d.filename || `doc-${i}`} className="w-full h-28 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : null}
                        <div className="p-2 text-xs">
                          <div className="truncate">{d.filename || 'document'}</div>
                          {d.url && (
                            <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">Open</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
      <Dialog open={viewerOpen} onOpenChange={(open) => { setViewerOpen(open); if (!open) setViewerDocs(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verification Documents</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">Click an image to open in a new tab.</DialogDescription>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 gap-3">
            {viewerDocs && viewerDocs.length > 0 ? (
              viewerDocs.map((d, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {d.url ? (
                    // allow click to open in new tab
                    <img src={d.url} alt={d.filename || `doc-${i}`} className="w-full max-h-[60vh] object-contain cursor-pointer" onClick={() => window.open(d.url, '_blank')} />
                  ) : null}
                  <div className="text-sm text-gray-700">{d.filename}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">No documents to show.</div>
            )}
          </div>

          <DialogFooter>
            <DialogClose>
              <button className="px-3 py-2 rounded bg-slate-100">Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

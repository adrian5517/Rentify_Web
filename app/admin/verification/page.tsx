"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

type Doc = { filename?: string; url?: string };
type UserRef = { username?: string; email?: string };
type Property = {
  _id: string;
  name?: string;
  postedBy?: UserRef;
  verification_documents?: Doc[];
  verification_status?: string;
};

export default function AdminVerificationPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter()
  const { user, token } = useAuthStore()

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

  async function fetchPending() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/properties/admin/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setItems(json.properties || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doAction(id: string, action: 'verify' | 'reject', notes = '') {
    setLoading(true);
    try {
      const url = `/api/properties/admin/${id}/${action === 'verify' ? 'verify' : 'reject'}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Action failed: ${res.status}`);
      }
      await fetchPending();
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

      {(!checkedAuth || loading) && <div className="mb-4">Loading…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {items.length === 0 && !loading ? (
        <div className="text-sm text-gray-600">No pending properties.</div>
      ) : null}

      <div className="space-y-4 mt-4">
        {items.map((p) => (
          <div key={p._id} className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-lg">{p.name || 'Untitled property'}</div>
                <div className="text-sm text-gray-500">Owner: {p.postedBy?.email || p.postedBy?.username || 'unknown'}</div>
                <div className="text-xs text-gray-400 mt-1">Status: {p.verification_status || 'unverified'}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!p.verification_documents || p.verification_documents.length === 0) {
                      alert('No verification documents uploaded');
                      return;
                    }
                    // open first doc in a new tab
                    window.open(p.verification_documents[0].url, '_blank');
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
                    const reason = prompt('Rejection reason (optional):', '');
                    if (reason !== null) doAction(p._id, 'reject', reason);
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
                      // show small image if it's image content; otherwise show a link
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
    </div>
  );
}

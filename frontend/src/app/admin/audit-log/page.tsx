'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AuditLogPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<any>({ logs: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!admin) return;
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    api.get<any>(`/api/admin/audit-log?page=${page}&limit=50${q}`)
      .then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [admin, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Audit log</h1><p className="text-sm text-gray-500">{data.pagination?.total || 0} recorded actions</p></div>
        <div className="flex gap-2">
          <input className="input w-64" placeholder="Search action or entity…" value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&load()} />
          <button className="btn-secondary" onClick={load}><Search size={15} className="mr-1 inline" /> Search</button>
          <button className="btn-secondary" onClick={load}><RefreshCw size={15} className="mr-1 inline" /> Refresh</button>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        {loading ? <p className="p-4 text-sm text-gray-500">Loading…</p> : <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr>
            <th className="px-4 py-3">Time</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Details</th>
          </tr></thead>
          <tbody className="divide-y">
            {(data.logs || []).map((log:any) => <tr key={log._id}>
              <td className="px-4 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('en-GB')}</td>
              <td className="px-4 py-3">{log.adminId ? `${log.adminId.firstName || ''} ${log.adminId.lastName || ''}`.trim() || log.adminId.email : '—'}</td>
              <td className="px-4 py-3 font-medium">{log.action}</td>
              <td className="px-4 py-3">{log.entityType || '—'}</td>
              <td className="max-w-md truncate px-4 py-3 text-gray-500">{JSON.stringify(log.changes || {})}</td>
            </tr>)}
            {!data.logs?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit entries found.</td></tr>}
          </tbody>
        </table>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Page {data.pagination?.page || 1} of {data.pagination?.pages || 1}</span>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={page<=1} onClick={()=>setPage((p)=>p-1)}>Previous</button>
          <button className="btn-secondary" disabled={page >= (data.pagination?.pages || 1)} onClick={()=>setPage((p)=>p+1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

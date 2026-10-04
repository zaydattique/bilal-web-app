'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

const configs: Record<string, { title: string; description: string; exportType: string }> = {
  traffic: { title: 'Website Traffic', description: 'Visits, sessions, pageviews, top pages, CTAs, devices and geography.', exportType: '' },
  collections: { title: 'Collections', description: 'Confirmed payment collections and daily collection trend.', exportType: 'collections' },
  'due-list': { title: 'Late / Due Installments', description: 'Active-account installments that are overdue or due soon.', exportType: 'due-list' },
  customers: { title: 'Customers', description: 'Customer status, top outstanding balances and recent registrations.', exportType: 'customers' },
  products: { title: 'Products', description: 'Catalogue status, pricing and inventory with low-stock visibility.', exportType: 'products' },
  defaults: { title: 'Defaults / Aging', description: 'Outstanding overdue installments grouped by aging period.', exportType: 'defaults' },
};

const currency = (symbol: string, value: number) => `${symbol} ${Number(value || 0).toLocaleString('en-PK')}`;

export default function ReportPage({ params }: { params: { report: string } }) {
  const { admin } = useAuth();
  const { business } = useTheme();
  const config = configs[params.report];
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const symbol = business?.settings?.currencySymbol || 'PKR';

  const path = useMemo(() => {
    if (params.report === 'traffic') return `/api/analytics/summary?days=${days}`;
    if (config.exportType === 'collections') return `/api/admin/reports/collections?days=${days}`;
    return `/api/admin/reports/${params.report}${params.report === 'due-list' ? `?filter=${filter}` : ''}`;
  }, [params.report, days, filter]);

  const load = () => {
    if (!admin || !config) return;
    setLoading(true);
    api.get<any>(path).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [admin, path]);

  if (!config) {
    return <div className="card"><h1 className="text-xl font-semibold">Report not found</h1><Link className="mt-3 inline-block underline" href="/admin/reports">Back to reports</Link></div>;
  }

  const exportHref = config.exportType
    ? `/api/admin/reports/export/${config.exportType}${config.exportType === 'collections' ? `?days=${days}` : config.exportType === 'due-list' ? `?filter=${filter}` : ''}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/reports" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"><ArrowLeft size={15} /> Reports</Link>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(params.report === 'traffic' || params.report === 'collections') && (
            <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          )}
          {params.report === 'due-list' && (
            <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All active dues</option><option value="overdue">Overdue</option><option value="upcoming">Next 30 days</option>
            </select>
          )}
          <button className="btn-secondary" onClick={load}><RefreshCw size={15} className="mr-1 inline" /> Refresh</button>
          {exportHref && <a className="btn-primary" href={`${process.env.NEXT_PUBLIC_API_URL || ''}${exportHref}`}><Download size={15} className="mr-1 inline" /> Export CSV</a>}
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading…</p> : (
        <>
          {params.report === 'traffic' && <Traffic data={data} />}
          {params.report === 'collections' && <Collections data={data} symbol={symbol} />}
          {params.report === 'customers' && <Customers data={data} symbol={symbol} />}
          {params.report === 'products' && <Products data={data} symbol={symbol} />}
          {params.report === 'due-list' && <DueList data={data} symbol={symbol} />}
          {params.report === 'defaults' && <Defaults data={data} symbol={symbol} />}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="card"><p className="text-xs font-medium uppercase text-gray-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function Traffic({ data }: any) {
  const o = data?.overview || {};
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Visits / sessions" value={o.visits || 0} /><Stat label="Pageviews" value={o.pageviews || 0} /><Stat label="Top pages" value={data?.pages?.length || 0} /></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Table title="Top pages" headers={['Path','Pageviews','Sessions']} rows={(data?.pages || []).map((x:any)=>[x.path,x.pageviews,x.sessions])} />
      <Table title="CTA activity" headers={['Action','Label','Clicks']} rows={(data?.ctas || []).map((x:any)=>[x.action,x.label || '—',x.clicks])} />
      <Table title="Devices" headers={['Device','Sessions','Pageviews']} rows={(data?.devices || []).map((x:any)=>[x.device,x.sessions,x.pageviews])} />
      <Table title="Geography" headers={['City','Region','Country','Visits']} rows={(data?.geo || []).map((x:any)=>[x.city || '—',x.region || '—',x.country || '—',x.visits])} />
    </div>
  </div>;
}

function Collections({ data, symbol }: any) {
  return <div className="space-y-6"><Stat label="Total collected" value={currency(symbol, data?.totalCollected)} /><Table title="Daily collections" headers={['Date','Amount','Payments']} rows={(data?.trend || []).map((x:any)=>[x.date,currency(symbol,x.total),x.count])} /></div>;
}

function Customers({ data, symbol }: any) {
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2"><Stat label="Customer statuses" value={(data?.byStatus || []).reduce((s:any,x:any)=>s+x.count,0)} /><Stat label="Top outstanding" value={currency(symbol, (data?.topDueCustomers || []).reduce((s:any,x:any)=>s+(x.totalDue||0),0))} /></div><Table title="Customers with highest dues" headers={['Account','Customer','Phone','Due']} rows={(data?.topDueCustomers || []).map((x:any)=>[x.accountNumber,`${x.firstName} ${x.lastName}`,x.phoneNumber,currency(symbol,x.totalDue)])} /></div>;
}

function Products({ data, symbol }: any) {
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3"><Stat label="Total products" value={data?.totalProducts || 0} /><Stat label="Published" value={data?.publishedProducts || 0} /><Stat label="Low stock" value={data?.lowStock?.length || 0} /></div><Table title="Low stock" headers={['Product','SKU','Price','Inventory','Status']} rows={(data?.lowStock || []).map((x:any)=>[x.name,x.sku,currency(symbol,x.cashPrice),x.inventory,x.status])} /></div>;
}

function DueList({ data, symbol }: any) {
  return <div className="space-y-6"><Stat label="Outstanding due" value={currency(symbol, data?.totalDue)} /><Table title="Due installments" headers={['Customer','Phone','Account','Due date','Remaining','Status']} rows={(data?.dues || []).map((x:any)=>[x.customerName,x.phone,x.accountNumber,new Date(x.dueDate).toLocaleDateString('en-GB'),currency(symbol,x.remaining),x.status])} /></div>;
}

function Defaults({ data, symbol }: any) {
  return <div className="space-y-6"><Table title="Aging buckets" headers={['Bucket','Count','Amount']} rows={(data?.aging || []).map((x:any)=>[x._id === '180+' ? '180+' : `${x._id} days`,x.count,currency(symbol,x.amount)])} /><Table title="Defaulted accounts" headers={['Account','Customer','Phone','Status']} rows={(data?.defaultedAccounts || []).map((x:any)=>[x.accountNumber,x.customerId ? `${x.customerId.firstName} ${x.customerId.lastName}` : '—',x.customerId?.phoneNumber || '—',x.status])} /></div>;
}

function Table({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return <div className="card overflow-x-auto p-0"><div className="border-b px-4 py-3"><h2 className="font-semibold">{title}</h2></div><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{headers.map((h)=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row,i)=><tr key={i} className="hover:bg-gray-50">{row.map((cell,j)=><td key={j} className="px-4 py-3">{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} className="px-4 py-8 text-center text-gray-500">No data for this period.</td></tr>}</tbody></table></div>;
}

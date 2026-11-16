import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ChevronRight, ClipboardList, LayoutDashboard, LogOut, MessageSquare, RefreshCw, Search, ShieldCheck, Users, UserRoundCheck } from 'lucide-react';
import { auth } from '../lib/firebase';

type Tab = 'overview' | 'orders' | 'citizens' | 'professionals' | 'complaints';
type AnyRecord = Record<string, any>;

const money = (value: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const readable = (value: unknown) => String(value || '—').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminCommandCenter({ showNotification }: { showNotification: (message: string) => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<AnyRecord>({});
  const [orders, setOrders] = useState<AnyRecord[]>([]);
  const [citizens, setCitizens] = useState<AnyRecord[]>([]);
  const [professionals, setProfessionals] = useState<AnyRecord[]>([]);
  const [complaints, setComplaints] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState('');
  const notificationRef = useRef(showNotification);
  useEffect(() => { notificationRef.current = showNotification; }, [showNotification]);

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Your admin session has expired. Please sign in again.');
    const token = await user.getIdToken();
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [overview, orderData, userData, workerData, complaintData] = await Promise.all([
        request('/api/admin/overview'),
        request('/api/admin/orders'),
        request('/api/admin/users'),
        request('/api/admin/workers'),
        request('/api/admin/complaints'),
      ]);
      setMetrics(overview.metrics || {});
      setOrders(orderData.orders || []);
      setCitizens((userData.users || []).filter((u: AnyRecord) => u.role !== 'worker' && u.role !== 'admin'));
      setProfessionals(workerData.applications || []);
      setComplaints(complaintData.complaints || []);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      notificationRef.current(error instanceof Error ? error.message : 'Could not load command centre data.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => void refresh(true), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const filteredOrders = useMemo(() => orders.filter((o) => [o.id, o.customerName, o.customerPhone, o.category, o.status].join(' ').toLowerCase().includes(search.toLowerCase())), [orders, search]);
  const filteredCitizens = useMemo(() => citizens.filter((u) => [u.name, u.email, u.phone, u.uid].join(' ').toLowerCase().includes(search.toLowerCase())), [citizens, search]);
  const filteredProfessionals = useMemo(() => professionals.filter((p) => [p.legalName, p.phone, p.skill, p.status].join(' ').toLowerCase().includes(search.toLowerCase())), [professionals, search]);

  const mutate = async (key: string, path: string, method: string, body: AnyRecord, success: string) => {
    setBusy(key);
    try { await request(path, { method, body: JSON.stringify(body) }); showNotification(success); await refresh(true); }
    catch (error) { showNotification(error instanceof Error ? error.message : 'Action failed.'); }
    finally { setBusy(''); }
  };

  const nav: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Order dispatch', icon: ClipboardList },
    { id: 'citizens', label: 'Citizens', icon: Users },
    { id: 'professionals', label: 'Professionals', icon: UserRoundCheck },
    { id: 'complaints', label: 'Complaints', icon: MessageSquare },
  ];
  const pendingOrders = orders.filter((o) => ['PENDING_ADMIN_REVIEW', 'AWAITING_CUSTOMER_CONFIRMATION', 'CUSTOMER_CONFIRMED'].includes(o.status)).length;
  const pendingPros = professionals.filter((p) => p.status === 'PENDING').length;

  return <div className="min-h-screen bg-[#090b0e] text-white">
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d1014] p-5 lg:flex lg:flex-col">
        <div className="mb-9 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-[#c5a059]/40 bg-[#c5a059]/10"><ShieldCheck className="h-5 w-5 text-[#d7b875]"/></div><div><div className="text-lg font-black tracking-wide">PUNCHX</div><div className="text-[10px] uppercase tracking-[.22em] text-[#c5a059]">Admin operations</div></div></div>
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Workspace</div>
        <nav className="space-y-1">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); setSearch(''); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${tab === id ? 'bg-[#c5a059]/15 text-[#e7c982]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4"/>{label}{id === 'orders' && pendingOrders > 0 && <span className="ml-auto rounded-full bg-[#c5a059] px-2 py-0.5 text-[10px] font-black text-black">{pendingOrders}</span>}</button>)}</nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-xs font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Secure admin session</div><p className="mt-2 text-[11px] leading-5 text-white/40">Actions are checked by the PUNCHX backend. Customer accounts cannot access this workspace.</p></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#090b0e]/90 px-4 py-4 backdrop-blur-xl sm:px-7">
          <div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#c5a059]">Operations control</div><h1 className="mt-1 text-xl font-black sm:text-2xl">{nav.find(n => n.id === tab)?.label}</h1></div>
          <div className="flex items-center gap-2"><span className="hidden text-[10px] text-white/35 sm:inline">Updated {lastUpdated || '—'}</span><button onClick={() => void refresh()} className="rounded-xl border border-white/10 p-2.5 text-white/70 hover:bg-white/5" aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button><button onClick={() => void auth.signOut()} className="rounded-xl border border-white/10 p-2.5 text-white/70 hover:bg-white/5" aria-label="Sign out"><LogOut className="h-4 w-4"/></button></div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3 lg:hidden">{nav.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${tab===id?'bg-[#c5a059] text-black':'bg-white/5 text-white/65'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>
        <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-7">
          {loading && <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm text-white/60">Loading live platform records…</div>}
          {tab === 'overview' && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              ['Total citizens', metrics.totalUsers ?? 0, Users],
              ['Professionals', metrics.totalWorkers ?? 0, UserRoundCheck],
              ['Active professionals', metrics.activeWorkers ?? 0, Activity],
              ['Total orders', metrics.totalOrders ?? 0, ClipboardList],
            ].map(([label,value,Icon]: any)=><div key={label} className="rounded-2xl border border-white/10 bg-[#11151a] p-5"><div className="flex items-center justify-between text-xs text-white/50"><span>{label}</span><Icon className="h-4 w-4 text-[#c5a059]"/></div><div className="mt-3 text-3xl font-black tabular-nums">{value}</div></div>)}</div>
            <div className="grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-[#c5a059]/20 bg-[#c5a059]/[.06] p-5 lg:col-span-2"><div className="text-xs font-bold uppercase tracking-wider text-[#d7b875]">Needs attention</div><div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-3xl font-black">{pendingOrders}</div><div className="text-xs text-white/50">Orders in admin workflow</div></div><div><div className="text-3xl font-black">{pendingPros}</div><div className="text-xs text-white/50">Professional applications</div></div></div><button onClick={()=>setTab('orders')} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#e7c982]">Open dispatch queue <ChevronRight className="h-4 w-4"/></button></div><div className="rounded-2xl border border-white/10 bg-[#11151a] p-5"><div className="text-xs text-white/50">Gross order value (recorded)</div><div className="mt-3 text-2xl font-black">{money(metrics.totalGmv)}</div><div className="mt-2 text-[11px] text-white/35">Based on order records returned by the backend</div><div className="mt-5 text-xs text-white/50">Completed orders <b className="float-right text-white">{metrics.completedOrders ?? 0}</b></div></div></div>
            <div className="rounded-2xl border border-white/10 bg-[#11151a] p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Recent orders</h2><button onClick={()=>setTab('orders')} className="text-xs font-bold text-[#d7b875]">View all</button></div><div className="mt-3 divide-y divide-white/5">{orders.slice(0,5).map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><div className="text-sm font-bold">{o.serviceName || o.category || 'Service request'}</div><div className="mt-1 text-[11px] text-white/40">{o.customerName || 'Citizen'} · {o.id}</div></div><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-[#d7b875]">{readable(o.status)}</span></div>)}{orders.length===0&&<p className="py-5 text-sm text-white/40">No order records returned.</p>}</div></div>
          </>}
          {tab !== 'overview' && <div className="flex flex-wrap items-center justify-between gap-3"><div className="relative min-w-[220px] flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records…" className="w-full rounded-xl border border-white/10 bg-[#11151a] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#c5a059]/60"/></div><span className="text-xs text-white/40">{tab==='orders'?filteredOrders.length:tab==='citizens'?filteredCitizens.length:tab==='professionals'?filteredProfessionals.length:complaints.length} records</span></div>}
          {tab === 'orders' && <div className="space-y-3">{filteredOrders.map(o=><article key={o.id} className="rounded-2xl border border-white/10 bg-[#11151a] p-4 sm:p-5"><div className="flex flex-wrap justify-between gap-3"><div><div className="text-[10px] font-bold tracking-wider text-[#c5a059]">{o.id}</div><h3 className="mt-1 font-bold">{o.serviceName || o.category || 'Service request'}</h3><p className="mt-1 text-xs text-white/50">{o.customerName || 'Citizen'} · {o.customerPhone || 'No phone'} · {o.date || ''} {o.time || ''}</p></div><span className="h-fit rounded-full bg-white/5 px-3 py-1 text-[10px] text-[#d7b875]">{readable(o.status)}</span></div><div className="mt-3 grid gap-2 rounded-xl bg-black/20 p-3 text-xs text-white/60 sm:grid-cols-2"><div>Address: {o.customerAddress || o.address || '—'}</div><div>Amount: {money(o.totalAmountToPay || o.price)}</div><div>Assigned professional: {o.workerName || 'Not assigned'}</div><div>Payment: {readable(o.paymentDetails?.status || 'Not confirmed')}</div></div>{o.status==='PENDING_ADMIN_REVIEW'&&<div className="mt-3 flex flex-wrap gap-2"><input value={notes[o.id]||''} onChange={e=>setNotes(v=>({...v,[o.id]:e.target.value}))} placeholder="Review note / rejection reason" className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"/><button disabled={busy===o.id} onClick={()=>void mutate(o.id,`/api/admin/orders/${encodeURIComponent(o.id)}/status`,'PATCH',{status:'AWAITING_CUSTOMER_CONFIRMATION',note:notes[o.id]||'Accepted by admin'},'Order accepted for customer confirmation.')} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold disabled:opacity-50">Accept</button><button disabled={busy===o.id} onClick={()=>void mutate(o.id,`/api/admin/orders/${encodeURIComponent(o.id)}/status`,'PATCH',{status:'REJECTED',note:notes[o.id]||'Not serviceable'},'Order rejected.')} className="rounded-lg bg-red-900/70 px-4 py-2 text-xs font-bold disabled:opacity-50">Reject</button></div>}{o.status==='CUSTOMER_CONFIRMED'&&!o.workerId&&<div className="mt-3 flex flex-wrap gap-2"><select value={selectedWorkers[o.id]||''} onChange={e=>setSelectedWorkers(v=>({...v,[o.id]:e.target.value}))} className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#0b0e12] px-3 py-2 text-xs"><option value="">Choose approved professional</option>{professionals.filter(p=>p.status==='APPROVED').map(p=><option key={p.id} value={p.id}>{p.legalName || p.name || p.phone} · {p.skill || 'General'}</option>)}</select><button disabled={!selectedWorkers[o.id]||busy===o.id} onClick={()=>void mutate(o.id,`/api/admin/orders/${encodeURIComponent(o.id)}/assign`,'PATCH',{professionalApplicationId:selectedWorkers[o.id]},'Professional assigned.')} className="rounded-lg bg-[#c5a059] px-4 py-2 text-xs font-black text-black disabled:opacity-40">Assign professional</button></div>}</article>)}{!loading&&filteredOrders.length===0&&<p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">No matching orders.</p>}</div>}
          {tab === 'citizens' && <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11151a]"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-white/[.03] text-white/40"><tr><th className="p-4">Citizen</th><th className="p-4">Contact</th><th className="p-4">Location</th><th className="p-4">Account</th></tr></thead><tbody className="divide-y divide-white/5">{filteredCitizens.map(u=><tr key={u.uid}><td className="p-4 font-bold">{u.name || 'Unnamed'}<div className="mt-1 text-[10px] text-white/35">{u.uid}</div></td><td className="p-4">{u.phone || u.email || '—'}</td><td className="p-4">{u.area || u.city || u.address || '—'}</td><td className="p-4">{readable(u.status || 'Active')}</td></tr>)}</tbody></table></div>{filteredCitizens.length===0&&<p className="p-8 text-center text-sm text-white/40">No citizen records.</p>}</div>}
          {tab === 'professionals' && <div className="space-y-3">{filteredProfessionals.map(p=><article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#11151a] p-4"><div><div className="font-bold">{p.legalName || p.name || 'Applicant'}</div><div className="mt-1 text-xs text-white/45">{p.skill || 'Skill not set'} · {p.phone || p.email || 'No contact'}</div><div className="mt-1 text-[10px] text-white/35">{p.serviceAreas?.join?.(', ') || p.address || 'Service area not provided'}</div></div><div className="flex items-center gap-2"><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-[#d7b875]">{readable(p.status)}</span>{p.status==='PENDING'&&<><button disabled={busy===p.id} onClick={()=>void mutate(p.id,`/api/admin/workers/${encodeURIComponent(p.id)}`,'PATCH',{status:'APPROVED',notes:'Approved by PUNCHX admin'},'Professional approved.')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Approve</button><button disabled={busy===p.id} onClick={()=>void mutate(p.id,`/api/admin/workers/${encodeURIComponent(p.id)}`,'PATCH',{status:'REJECTED',notes:'Rejected by PUNCHX admin'},'Application rejected.')} className="rounded-lg bg-red-900/70 px-3 py-2 text-xs font-bold disabled:opacity-50">Reject</button></>}</div></article>)}{!loading&&filteredProfessionals.length===0&&<p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">No professional applications.</p>}</div>}
          {tab === 'complaints' && <div className="space-y-3">{complaints.map(c=><article key={c.id} className="rounded-2xl border border-white/10 bg-[#11151a] p-4"><div className="flex flex-wrap justify-between gap-2"><b className="text-sm">{c.customerName || 'Citizen'} · {c.orderId}</b><span className="text-[10px] text-[#d7b875]">{readable(c.status)}</span></div><p className="mt-2 text-xs text-white/55">{c.comment || c.adminActionNotes || 'No complaint details provided.'}</p><div className="mt-3 flex justify-end"><button disabled={busy===c.id||c.status==='RESOLVED'} onClick={()=>void mutate(c.id,`/api/admin/complaints/${encodeURIComponent(c.id)}`,'PATCH',{status:'RESOLVED',notes:'Reviewed and resolved by PUNCHX admin'},'Complaint marked resolved.')} className="rounded-lg bg-[#c5a059] px-3 py-2 text-xs font-black text-black disabled:opacity-40">Mark resolved</button></div></article>)}{!loading&&complaints.length===0&&<p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">No complaint records.</p>}</div>}
          <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-[10px] text-white/35"><ShieldCheck className="h-3.5 w-3.5 text-[#c5a059]"/> Admin actions are server-authorised and recorded through the platform data adapter. No sample or fabricated metrics are displayed.</footer>
        </div>
      </main>
    </div>
  </div>;
}

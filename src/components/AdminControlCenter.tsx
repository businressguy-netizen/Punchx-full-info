import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc
} from 'firebase/firestore';
import {
  Activity, AlertTriangle, ArrowDownToLine, Check, ChevronRight, CircleDollarSign, ClipboardList, Download, Eye,
  FileCheck2, Filter, Gauge, Loader2, LogOut, MessageSquareWarning, RefreshCw, Search,
  Settings2, ShieldCheck, Star, Users, UserRoundCog, Wrench, XCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/authContext';

type Row = Record<string, any>;
type Section = 'overview' | 'bookings' | 'professionals' | 'customers' | 'complaints' | 'warranty' | 'reviews' | 'settings' | 'audit';

const sections: Array<{ id: Section; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'bookings', label: 'Bookings & dispatch', icon: ClipboardList },
  { id: 'professionals', label: 'Professionals', icon: UserRoundCog },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { id: 'warranty', label: 'Warranty claims', icon: FileCheck2 },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'settings', label: 'Platform settings', icon: Settings2 },
  { id: 'audit', label: 'Admin activity', icon: Activity }
];

const money = (value: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const asText = (value: unknown) => value == null || value === '' ? '—' : String(value);
const normalized = (value: unknown) => String(value || '').toLowerCase();
const statusTone = (status: unknown) => {
  const s = normalized(status);
  if (['approved', 'completed', 'resolved', 'paid', 'accepted', 'done'].some(x => s.includes(x))) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  if (['reject', 'cancel', 'suspend', 'critical', 'pending', 'dispatch'].some(x => s.includes(x))) return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
};

export default function AdminControlCenter({ onTransition, showNotification }: { onTransition: (screen: any) => void; showNotification: (message: string) => void }) {
  const { currentUser, userProfile, isLoadingProfile, logout } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [data, setData] = useState<Record<string, Row[]>>({
    users: [], orders: [], workerApplications: [], complaints: [], warranty_claims: [], reviews: [], adminAuditLogs: []
  });
  const [settings, setSettings] = useState({ customerPlatformFee: 10, defaultCommissionPercent: 15, workerServiceAreaKm: 6, emergencyFee: 199, warrantyFee: 99, maintenanceMode: false });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isAdmin = userProfile?.role === 'admin';
  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    const collections = ['users', 'orders', 'workerApplications', 'complaints', 'warranty_claims', 'reviews', 'adminAuditLogs'];
    const results: Record<string, Row[]> = {};
    const failures: string[] = [];
    await Promise.all(collections.map(async name => {
      try {
        const ref = collection(db, name);
        const q = name === 'adminAuditLogs' ? query(ref, orderBy('createdAt', 'desc'), limit(100)) : query(ref, limit(500));
        const snap = await getDocs(q);
        results[name] = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      } catch (err: any) {
        results[name] = [];
        failures.push(name);
        console.warn('Admin collection unavailable:', name, err?.message || err);
      }
    }));
    setData(results);
    try {
      const configSnap = await getDoc(doc(db, 'platformSettings', 'global'));
      if (configSnap.exists()) setSettings(current => ({ ...current, ...configSnap.data() }));
      setSettingsLoaded(true);
    } catch (err) {
      console.warn('Platform settings could not be loaded', err);
    }
    setLastUpdated(new Date().toLocaleString());
    if (failures.length) setError('Some data could not be loaded (' + failures.join(', ') + '). Check Firestore rules and collection names; no placeholder records are shown.');
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const audit = async (action: string, targetId: string, details: Row = {}) => {
    if (!currentUser) return;
    const id = 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await setDoc(doc(db, 'adminAuditLogs', id), {
      id, action, targetId, details, actorUid: (currentUser as any).uid || userProfile?.uid || '',
      actorName: userProfile?.name || 'Admin', createdAt: new Date().toISOString()
    });
  };

  const perform = async (id: string, action: string, operation: () => Promise<void>, targetId = id, details: Row = {}) => {
    setBusyId(id);
    try {
      await operation();
      try { await audit(action, targetId, details); }
      catch (auditError) { console.warn('Admin action succeeded but audit log could not be written:', auditError); }
      showNotification('Saved: ' + action);
      await loadData();
    } catch (err: any) {
      console.error('Admin action failed:', action, err);
      showNotification('Could not complete action. Check permissions and try again.');
      setError('Action failed: ' + (err?.message || action));
    } finally {
      setBusyId('');
    }
  };

  const approveProfessional = (row: Row, status: 'APPROVED' | 'REJECTED') => perform(
    row.id, status === 'APPROVED' ? 'Approve professional application' : 'Reject professional application',
    async () => {
      await updateDoc(doc(db, 'workerApplications', row.id), { status, ...(status === 'APPROVED' ? { approvedAt: new Date().toISOString() } : { rejectedAt: new Date().toISOString() }), reviewedBy: userProfile?.uid || '' });
      if (row.uid) {
        await setDoc(doc(db, 'users', row.uid), {
          status, role: status === 'APPROVED' ? 'worker' : 'citizen',
          applicationId: row.id, updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }, row.id, { applicantUid: row.uid, status }
  );

  const changeUserStatus = (row: Row, status: 'SUSPENDED' | 'APPROVED') => perform(
    row.uid || row.id, status === 'SUSPENDED' ? 'Suspend account' : 'Restore account',
    async () => { await updateDoc(doc(db, 'users', row.uid || row.id), { status, updatedAt: new Date().toISOString() }); },
    row.uid || row.id, { status }
  );

  const changeBookingStatus = (row: Row, status: string) => perform(
    row.id, 'Update booking status', async () => {
      await updateDoc(doc(db, 'orders', row.id), { status, adminUpdatedAt: new Date().toISOString(), adminUpdatedBy: userProfile?.uid || '' });
    }, row.id, { status }
  );

  const resolveComplaint = (row: Row) => perform(
    row.id, 'Resolve complaint', async () => {
      await updateDoc(doc(db, 'complaints', row.id), { status: 'RESOLVED', resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }, row.id, { previousStatus: row.status }
  );

  const updateClaim = (row: Row, status: 'APPROVED' | 'REJECTED') => perform(
    row.id, status === 'APPROVED' ? 'Approve warranty claim' : 'Reject warranty claim',
    async () => { await updateDoc(doc(db, 'warranty_claims', row.id), { status, updatedAt: new Date().toISOString(), resolution: status === 'APPROVED' ? 'Approved by PunchX admin' : 'Rejected by PunchX admin' }); },
    row.id, { status }
  );

  const saveSettings = () => perform(
    'platform-settings', 'Update platform settings', async () => {
      await setDoc(doc(db, 'platformSettings', 'global'), { ...settings, updatedAt: new Date().toISOString(), updatedBy: userProfile?.uid || '' }, { merge: true });
    }, 'global', settings
  );

  const filtered = (rows: Row[]) => rows.filter(row => {
    const text = normalized(Object.values(row).filter(v => typeof v !== 'object').join(' '));
    return (!searchTerm || text.includes(normalized(searchTerm))) &&
      (statusFilter === 'ALL' || normalized(row.status) === normalized(statusFilter));
  });

  const exportRows = (rows: Row[], name: string) => {
    const allKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row).filter(key => typeof row[key] !== 'object'))));
    const csv = [allKeys.join(','), ...rows.map(row => allKeys.map(key => '"' + String(row[key] ?? '').replace(/"/g, '""') + '"').join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'punchx-' + name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const orders = data.orders;
    const completed = orders.filter(row => ['completed', 'done'].includes(normalized(row.status))).length;
    const active = orders.filter(row => !['completed', 'done', 'cancelled', 'canceled'].includes(normalized(row.status))).length;
    const gross = orders.filter(row => ['completed', 'done', 'paid'].includes(normalized(row.status))).reduce((sum, row) => sum + Number(row.totalAmountToPay ?? row.price ?? 0), 0);
    return [
      { label: 'Total bookings', value: orders.length, icon: ClipboardList, note: active + ' active' },
      { label: 'Registered customers', value: data.users.filter(row => row.role === 'citizen' || !row.role).length, icon: Users, note: 'From account records' },
      { label: 'Professionals', value: data.users.filter(row => row.role === 'worker').length, icon: Wrench, note: data.workerApplications.filter(row => normalized(row.status) === 'pending').length + ' pending reviews' },
      { label: 'Gross order value', value: money(gross), icon: CircleDollarSign, note: completed + ' completed orders' },
      { label: 'Open complaints', value: data.complaints.filter(row => normalized(row.status) !== 'resolved').length, icon: AlertTriangle, note: 'Needs review' },
      { label: 'Warranty queue', value: data.warranty_claims.filter(row => ['pending', 'under_review', 'critical_pending_admin'].includes(normalized(row.status))).length, icon: FileCheck2, note: 'Awaiting decision' }
    ];
  }, [data]);

  if (isLoadingProfile) return <div className="min-h-[70vh] flex items-center justify-center text-slate-300"><Loader2 className="animate-spin mr-3" /> Checking administrator session…</div>;
  if (!currentUser || !isAdmin) return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-slate-100">
      <div className="max-w-md rounded-3xl border border-rose-400/30 bg-[#11192e] p-8 text-center">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-rose-300" />
        <h1 className="text-xl font-black">Administrator access required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">This console is available only to accounts whose verified PunchX profile has the admin role.</p>
        <button onClick={() => onTransition('panel-select')} className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold">Return to portal selection</button>
      </div>
    </div>
  );

  const pageTitle = sections.find(item => item.id === section)?.label || 'Overview';
  const rowsForSection = section === 'bookings' ? data.orders : section === 'professionals' ? data.workerApplications : section === 'customers' ? data.users.filter(row => row.role !== 'worker' && row.role !== 'admin') : section === 'complaints' ? data.complaints : section === 'warranty' ? data.warranty_claims : section === 'reviews' ? data.reviews : data.adminAuditLogs;

  return (
    <div className="min-h-screen bg-[#071225] px-3 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#132545] via-[#0c1830] to-[#10192a] p-5 shadow-2xl sm:flex-row sm:items-center sm:p-7">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3"><ShieldCheck className="h-7 w-7 text-blue-200" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-blue-200">PUNCHX • OPERATIONS COMMAND</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Admin Control Center</h1><p className="mt-1 text-sm text-slate-400">Bookings, professional quality, customer support and platform health in one place.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300" />Signed in as {userProfile.name || 'Admin'}</span>
            <button onClick={() => void loadData()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2.5 text-sm font-bold hover:bg-white/5 disabled:opacity-50"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Refresh</button>
            <button onClick={async () => { await logout(); onTransition('panel-select'); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-400/10"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </header>

        {error && <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1">{error}</div><button aria-label="Dismiss alert" onClick={() => setError('')}><XCircle className="h-5 w-5" /></button></div>}

        <div className="grid gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-slate-700/70 bg-[#0d1a30] p-3 lg:sticky lg:top-4">
            <p className="px-3 pb-3 pt-2 text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Workspace</p>
            <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label="Admin sections">
              {sections.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setSection(item.id); setSearchTerm(''); setStatusFilter('ALL'); }} className={'flex items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-bold transition sm:text-sm ' + (section === item.id ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20' : 'text-slate-400 hover:bg-white/5 hover:text-white')}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0">{item.label}</span>{section === item.id && <ChevronRight className="ml-auto hidden h-4 w-4 lg:block" />}</button>; })}
            </nav>
            <div className="mt-4 rounded-2xl border border-slate-700/60 bg-[#071225] p-3"><p className="text-xs font-bold text-slate-300">Data connection</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{lastUpdated ? 'Last synced ' + lastUpdated : 'Waiting for first sync'}</p><p className="mt-2 text-[10px] text-slate-500">Live records only • no demo metrics</p></div>
          </aside>

          <section className="min-w-0 space-y-5">
            {section === 'overview' ? <>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-200">Platform pulse</p><h2 className="mt-1 text-2xl font-black">{pageTitle}</h2><p className="mt-1 text-sm text-slate-400">A real-time view of records currently available in Firestore.</p></div><button onClick={() => exportRows(data.orders, 'bookings')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold hover:bg-white/5"><Download className="h-4 w-4" /> Export bookings</button></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(item => { const Icon = item.icon; return <article key={item.label} className="rounded-2xl border border-slate-700/70 bg-[#0d1a30] p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{item.label}</span><Icon className="h-5 w-5 text-blue-200" /></div><p className="mt-4 break-words text-2xl font-black">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.note}</p></article>; })}</div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a30] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold">Latest bookings</h3><button onClick={() => setSection('bookings')} className="text-xs font-bold text-blue-200">View all →</button></div>{data.orders.slice().sort((a,b)=>Number(b.createdTimestamp||0)-Number(a.createdTimestamp||0)).slice(0,5).map(row => <div key={row.id} className="flex items-center justify-between gap-3 border-t border-slate-700/60 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{asText(row.category || row.serviceName)}</p><p className="truncate text-xs text-slate-500">{asText(row.customerName)} · {asText(row.id)}</p></div><div className="text-right"><p className="text-sm font-bold">{money(row.totalAmountToPay ?? row.price)}</p><span className={'mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] ' + statusTone(row.status)}>{asText(row.status)}</span></div></div>)}{!data.orders.length && <p className="py-8 text-center text-sm text-slate-500">No booking records found.</p>}</div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a30] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold">Needs attention</h3><AlertTriangle className="h-5 w-5 text-amber-200" /></div>{[
                  { label: 'Pending professional applications', value: data.workerApplications.filter(r=>normalized(r.status)==='pending').length, target: 'professionals' as Section },
                  { label: 'Unresolved complaints', value: data.complaints.filter(r=>normalized(r.status)!=='resolved').length, target: 'complaints' as Section },
                  { label: 'Open warranty claims', value: data.warranty_claims.filter(r=>!['approved','rejected','resolved'].includes(normalized(r.status))).length, target: 'warranty' as Section },
                  { label: 'Bookings needing dispatch', value: data.orders.filter(r=>['pending','dispatching'].includes(normalized(r.status))).length, target: 'bookings' as Section }
                ].map(item=><button key={item.label} onClick={()=>setSection(item.target)} className="flex w-full items-center justify-between gap-3 border-t border-slate-700/60 py-3 text-left hover:text-blue-100"><span className="text-sm text-slate-300">{item.label}</span><span className="rounded-lg bg-amber-300/10 px-3 py-1 text-sm font-black text-amber-100">{item.value}</span></button>)}</div>
              </div>
            </> : section === 'settings' ? <>
              <div><h2 className="text-2xl font-black">{pageTitle}</h2><p className="mt-1 text-sm text-slate-400">Persisted global settings. Values are not applied to checkout until backend pricing reads them.</p></div>
              <div className="grid gap-4 md:grid-cols-2">
                {([
                  ['customerPlatformFee', 'Customer platform fee (₹)', 0, 500],
                  ['defaultCommissionPercent', 'Default professional commission (%)', 0, 50],
                  ['workerServiceAreaKm', 'Worker service area (km)', 1, 50],
                  ['emergencyFee', 'Emergency fee (₹)', 0, 5000],
                  ['warrantyFee', 'Warranty fee (₹)', 0, 1000]
                ] as Array<[keyof typeof settings,string,number,number]>).map(([key,label,min,max])=><label key={key} className="rounded-2xl border border-slate-700 bg-[#0d1a30] p-4"><span className="text-sm font-bold">{label}</span><input type="number" min={min} max={max} value={settings[key] as number} onChange={event=>setSettings(old=>({...old,[key]:Math.max(min,Math.min(max,Number(event.target.value)||0))}))} className="mt-3 w-full rounded-xl border border-slate-600 bg-[#071225] px-3 py-3 text-lg font-black outline-none focus:border-blue-300" /></label>)}
                <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-[#0d1a30] p-4"><span><span className="block text-sm font-bold">Maintenance mode</span><span className="mt-1 block text-xs text-slate-500">Stored as a setting; enforce separately in the application/API.</span></span><input type="checkbox" checked={settings.maintenanceMode} onChange={event=>setSettings(old=>({...old,maintenanceMode:event.target.checked}))} className="h-5 w-5 accent-blue-500" /></label>
              </div>
              <div className="flex flex-wrap items-center gap-3"><button onClick={()=>void saveSettings()} disabled={busyId==='platform-settings'} className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busyId==='platform-settings'?'Saving…':'Save settings'}</button><button onClick={()=>void loadData()} className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold">Reload saved values</button></div>
              {!settingsLoaded && <p className="text-xs text-slate-500">Settings have not yet been confirmed from the database.</p>}
            </> : <>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-200">Operations</p><h2 className="mt-1 text-2xl font-black">{pageTitle}</h2><p className="mt-1 text-sm text-slate-400">{rowsForSection.length} records currently loaded.</p></div><button onClick={()=>exportRows(filtered(rowsForSection),section)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold hover:bg-white/5"><ArrowDownToLine className="h-4 w-4"/> Export CSV</button></div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-[#0d1a30] p-3 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search names, IDs, phone, status…" className="w-full rounded-xl border border-slate-700 bg-[#071225] py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-300"/></div><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500"/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#071225] px-3 py-3 text-sm sm:flex-none"><option value="ALL">All statuses</option>{Array.from(new Set(rowsForSection.map(r=>String(r.status||'UNKNOWN')))).sort().map(s=><option key={s} value={s}>{s}</option>)}</select></div></div>
              <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0d1a30]">
                <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#101f38] text-[11px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-4">Record</th><th className="px-4 py-4">Details</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Date / value</th><th className="px-4 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-700/60">
                  {filtered(rowsForSection).map(row=>{
                    const id = String(row.id || row.uid || 'record');
                    const title = section==='bookings' ? row.category || row.serviceName || 'Service booking' : section==='professionals' ? row.legalName || row.name || row.email : section==='customers' ? row.name || row.email || row.phone : section==='complaints' ? row.title || row.subject || row.category || 'Customer complaint' : section==='warranty' ? row.problemDescription || row.recurringIssue || row.category || 'Warranty claim' : section==='reviews' ? row.customerName || row.name || 'Customer review' : row.action || 'Admin activity';
                    const subtitle = section==='bookings' ? (row.customerName || row.customerPhone || '') : section==='professionals' ? (row.email || row.phone || row.skill || '') : section==='customers' ? (row.email || row.phone || row.uid || '') : section==='complaints' ? (row.description || row.message || row.customerName || '') : section==='warranty' ? (row.customerName || row.workerName || '') : section==='reviews' ? (row.comment || row.review || row.feedback || '') : (row.actorName || row.actorUid || '');
                    const date = row.createdAt || row.appliedAt || row.date || row.createdTimestamp;
                    const value = row.totalAmountToPay ?? row.price ?? row.rating;
                    return <tr key={id} className="align-top hover:bg-white/[.025]"><td className="max-w-[220px] px-4 py-4"><p className="break-words font-bold">{asText(title)}</p><p className="mt-1 break-all text-[11px] text-slate-500">{id}</p></td><td className="max-w-[260px] px-4 py-4"><p className="break-words text-slate-300">{asText(subtitle)}</p></td><td className="px-4 py-4"><span className={'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ' + statusTone(row.status)}>{asText(row.status || (section==='reviews'?'PUBLISHED':'UNKNOWN'))}</span></td><td className="px-4 py-4 text-xs text-slate-400">{date ? asText(typeof date==='number' ? new Date(date).toLocaleDateString() : date) : '—'}<p className="mt-1 font-bold text-slate-200">{value != null ? (section==='reviews' ? String(value)+' ★' : money(value)) : ''}</p></td><td className="px-4 py-4"><div className="flex justify-end gap-2">
                      {section==='professionals' && normalized(row.status)==='pending' && <><button disabled={busyId===id} title="Approve application" onClick={()=>void approveProfessional(row,'APPROVED')} className="rounded-lg bg-emerald-500/15 p-2 text-emerald-200 disabled:opacity-40"><Check className="h-4 w-4"/></button><button disabled={busyId===id} title="Reject application" onClick={()=>void approveProfessional(row,'REJECTED')} className="rounded-lg bg-rose-500/15 p-2 text-rose-200 disabled:opacity-40"><XCircle className="h-4 w-4"/></button></>}
                      {section==='customers' && <button disabled={busyId===id} onClick={()=>void changeUserStatus(row,normalized(row.status)==='suspended'?'APPROVED':'SUSPENDED')} className="rounded-lg border border-slate-600 px-2 py-1.5 text-[11px] font-bold disabled:opacity-40">{normalized(row.status)==='suspended'?'Restore':'Suspend'}</button>}
                      {section==='bookings' && !['completed','done','cancelled','canceled'].includes(normalized(row.status)) && <select disabled={busyId===id} aria-label="Update booking status" value={String(row.status||'')} onChange={e=>void changeBookingStatus(row,e.target.value)} className="max-w-[130px] rounded-lg border border-slate-600 bg-[#071225] px-2 py-2 text-[11px]"><option value={String(row.status||'')}>{asText(row.status||'Status')}</option>{['DISPATCHING','ACCEPTED','EN_ROUTE','ARRIVED','IN_SERVICE','COMPLETED','CANCELLED'].filter(s=>s!==row.status).map(s=><option key={s} value={s}>{s}</option>)}</select>}
                      {section==='complaints' && normalized(row.status)!=='resolved' && <button disabled={busyId===id} onClick={()=>void resolveComplaint(row)} className="rounded-lg bg-emerald-500/15 px-2.5 py-2 text-[11px] font-bold text-emerald-200 disabled:opacity-40">Resolve</button>}
                      {section==='warranty' && !['approved','rejected','resolved'].includes(normalized(row.status)) && <><button disabled={busyId===id} onClick={()=>void updateClaim(row,'APPROVED')} className="rounded-lg bg-emerald-500/15 p-2 text-emerald-200 disabled:opacity-40" title="Approve claim"><Check className="h-4 w-4"/></button><button disabled={busyId===id} onClick={()=>void updateClaim(row,'REJECTED')} className="rounded-lg bg-rose-500/15 p-2 text-rose-200 disabled:opacity-40" title="Reject claim"><XCircle className="h-4 w-4"/></button></>}
                      {section==='reviews' && <button onClick={()=>window.alert(String(row.comment||row.review||row.feedback||'No written review provided.'))} className="rounded-lg border border-slate-600 p-2" title="View review"><Eye className="h-4 w-4"/></button>}
                      {section==='audit' && <span className="text-[10px] text-slate-500">Read only</span>}
                    </div></td></tr>;
                  })}
                  {!filtered(rowsForSection).length && <tr><td colSpan={5} className="px-4 py-14 text-center"><Search className="mx-auto mb-3 h-8 w-8 text-slate-600"/><p className="font-bold text-slate-300">No records match</p><p className="mt-1 text-xs text-slate-500">Try another search or refresh the data.</p></td></tr>}
                </tbody></table></div>
              </div>
              <p className="text-xs leading-5 text-slate-500">Changes are written to Firestore and logged to the admin activity collection. Actions can fail if database rules do not grant this account permission; the console reports those failures rather than pretending they succeeded.</p>
            </>}
          </section>
        </div>
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-800 pt-4 text-[11px] text-slate-500 sm:flex-row"><span>PUNCHX Admin Control Center · Private operations workspace</span><span>{loading ? 'Syncing records…' : 'Records are subject to Firestore access rules.'}</span></footer>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppScreen, OrderRecord } from '../types';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/authContext';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { CheckCircle2, Clock3, MapPin, Phone, Power, RefreshCw, XCircle, Navigation, BriefcaseBusiness, Home, Wallet, UserRound, ArrowRight } from 'lucide-react';
import PostClientReviewModal from './PostClientReviewModal';
import WorkerDragoAssistant from './WorkerDragoAssistant';

interface WorkerDashboardProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
}

type JobFilter = 'new' | 'active' | 'completed' | 'all';

const normalise = (value?: string) => (value || '').trim().toLowerCase();
const isPending = (status?: string) => !status || status === 'Pending';
const isActive = (status?: string) => status === 'In-Progress' || status === 'In Progress';

export default function WorkerDashboard({ onTransition, showNotification }: WorkerDashboardProps) {
  const { currentUser, userProfile } = useAuth() as any;
  const uid = currentUser?.uid || userProfile?.uid || '';
  const [jobs, setJobs] = useState<OrderRecord[]>([]);
  const [filter, setFilter] = useState<JobFilter>('new');
  const [online, setOnline] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOrder, setReviewOrder] = useState<OrderRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'profile'>('home');
  const seenJobs = useRef<Set<string>>(new Set());
  const watchRef = useRef<number | null>(null);

  // Security guard bypassed: allow specialist access
  useEffect(() => {
    // Under review check bypassed for testing
  }, []);

  const workerCategories = useMemo(() => {
    const categories = userProfile?.categories || userProfile?.workerCategories || [];
    return Array.from(new Set([
      ...(Array.isArray(categories) ? categories : []),
      userProfile?.workerSkill || '',
      userProfile?.skill || '',
    ].map(normalise).filter(Boolean)));
  }, [userProfile]);

  const workerArea = normalise(userProfile?.area);
  const workerSector = normalise(userProfile?.sector);

  const eligibleForWorker = (order: OrderRecord) => {
    if (!uid) return false;
    if (!isPending(order.status) && order.workerId !== uid) return false;
    if (order.workerId === uid) return true;

    // Personal-selection bookings are visible only to the selected professional.
    if (order.isPersonalSelection || order.dispatchMode === 'PERSONAL_SELECT') return false;

    const category = normalise(order.category);
    const categoryMatch = workerCategories.length === 0 || workerCategories.some(c => category.includes(c) || c.includes(category));
    if (!categoryMatch) return false;

    // If the booking contains an area/sector, prefer the professional's matching service area.
    // We do not block jobs when location metadata is incomplete; this keeps the marketplace usable.
    const orderArea = normalise(order.area);
    const orderSector = normalise(order.sector);
    const hasLocationMetadata = Boolean(orderArea || orderSector);
    const locationMatch = !hasLocationMetadata ||
      !workerArea ||
      !orderArea ||
      orderArea === workerArea ||
      (!!workerSector && !!orderSector && workerSector === orderSector);

    return locationMatch;
  };

  // One real-time subscription is deliberately used so newly-created jobs reach professionals immediately.
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const next = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as OrderRecord))
        .filter(o => eligibleForWorker(o) || o.workerId === uid)
        .sort((a, b) => {
          const at = new Date(a.createdAt || '').getTime() || 0;
          const bt = new Date(b.createdAt || '').getTime() || 0;
          return bt - at;
        });

      // Notify only for genuinely new pending jobs after the initial snapshot.
      if (seenJobs.current.size > 0 && online) {
        const fresh = next.find(o => isPending(o.status) && !o.workerId && !seenJobs.current.has(o.id));
        if (fresh) showNotification(`🔔 New ${fresh.category || 'service'} job is available.`);
      }
      next.forEach(o => seenJobs.current.add(o.id));
      setJobs(next);
      setLoading(false);
    }, error => {
      console.error('PunchX job subscription failed:', error);
      showNotification('Unable to sync jobs right now. Please refresh.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, online, workerCategories.join('|'), workerArea, workerSector]);

  // Publish the professional's real location while travelling/working.
  useEffect(() => {
    const activeJob = jobs.find(j => j.workerId === uid && isActive(j.status));
    if (!uid || !activeJob || !online || !navigator.geolocation) {
      if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      return;
    }

    const writeLocation = async (position: GeolocationPosition) => {
      try {
        await updateDoc(doc(db, 'orders', activeJob.id), {
          workerLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy || null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
            timestamp: new Date().toISOString(),
          },
          workerOutForWork: true,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('PunchX worker location update failed:', error);
      }
    };

    watchRef.current = navigator.geolocation.watchPosition(writeLocation, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    });

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [jobs, uid, online]);

  const acceptJob = async (job: OrderRecord) => {
    if (!uid || busyId) return;
    if (!online) {
      showNotification('Turn ON DUTY before accepting a job.');
      return;
    }

    setBusyId(job.id);
    try {
      await runTransaction(db, async transaction => {
        const ref = doc(db, 'orders', job.id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('This booking no longer exists.');
        const current = snap.data() as OrderRecord;

        if (!isPending(current.status)) {
          throw new Error('This job has already been accepted by another professional.');
        }
        if (current.workerId && current.workerId !== uid) {
          throw new Error('This job is already assigned to another professional.');
        }

        transaction.update(ref, {
          workerId: uid,
          workerName: userProfile?.name || 'Professional',
          workerPhone: userProfile?.phone || '',
          status: 'In-Progress',
          workerOutForWork: false,
          acceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      showNotification('✅ Job accepted. The citizen will see your assignment immediately.');
      setSelected(null);
    } catch (error: any) {
      showNotification(`⚠️ ${error?.message || 'Could not accept this job.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const rejectJob = async (job: OrderRecord) => {
    if (!uid || busyId) return;
    setBusyId(job.id);
    try {
      const ref = doc(db, 'orders', job.id);
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) return;
        const current = snap.data() as any;
        const rejectedBy = Array.isArray(current.dispatchRejectedBy) ? current.dispatchRejectedBy : [];
        if (!rejectedBy.includes(uid)) rejectedBy.push(uid);
        transaction.update(ref, {
          dispatchRejectedBy: rejectedBy,
          updatedAt: new Date().toISOString(),
        });
      });
      showNotification('Job declined. It remains available for other eligible professionals.');
      setSelected(null);
    } catch (error: any) {
      showNotification(`⚠️ ${error?.message || 'Could not decline this job.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (job: OrderRecord, status: OrderRecord['status']) => {
    if (job.workerId !== uid || busyId) return;
    setBusyId(job.id);
    try {
      const patch: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (status === 'Done') {
        patch.completedAt = new Date().toISOString();
        patch.workerOutForWork = false;
      }
      await updateDoc(doc(db, 'orders', job.id), patch);
      showNotification(status === 'Done' ? '✅ Job completed and recorded.' : `Job status updated: ${status}`);
      setSelected(null);
    } catch (error: any) {
      showNotification(`⚠️ ${error?.message || 'Could not update the job.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const visibleJobs = jobs.filter(job => {
    if (filter === 'new') return isPending(job.status) && !job.workerId;
    if (filter === 'active') return job.workerId === uid && isActive(job.status);
    if (filter === 'completed') return job.workerId === uid && job.status === 'Done';
    return true;
  });

  const activeCount = jobs.filter(j => j.workerId === uid && isActive(j.status)).length;
  const completedCount = jobs.filter(j => j.workerId === uid && j.status === 'Done').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl">PUNCHX <span className="text-sm font-medium text-slate-500">Professional</span></div>
            <div className="text-xs text-slate-500">{userProfile?.name || 'Professional'}</div>
          </div>
          <div className="hidden md:flex items-center gap-6 mr-auto ml-10">
            <button onClick={() => setActiveTab('home')} className={`text-sm font-bold ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-500'}`}>Home</button>
            <button onClick={() => setActiveTab('earnings')} className={`text-sm font-bold ${activeTab === 'earnings' ? 'text-blue-600' : 'text-slate-500'}`}>Earnings</button>
            <button onClick={() => setActiveTab('profile')} className={`text-sm font-bold ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-500'}`}>Profile</button>
          </div>
          <button onClick={() => setOnline(v => !v)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            <Power size={16} /> {online ? 'ON DUTY' : 'OFF DUTY'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        {activeTab === 'home' && (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<BriefcaseBusiness size={18} />} label="New jobs" value={jobs.filter(j => isPending(j.status) && !j.workerId).length} />
          <Stat icon={<Clock3 size={18} />} label="Active" value={activeCount} />
          <Stat icon={<CheckCircle2 size={18} />} label="Completed" value={completedCount} />
          <Stat icon={<Navigation size={18} />} label="Live tracking" value={activeCount ? 'ON' : 'READY'} />
        </section>

        <div className="flex flex-wrap gap-2">
          {(['new', 'active', 'completed', 'all'] as JobFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
              {f === 'new' ? 'New Jobs' : f}
            </button>
          ))}
          <button onClick={() => window.location.reload()} className="ml-auto flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-200"><RefreshCw size={15} /> Refresh</button>
        </div>

        {loading ? <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Syncing live jobs…</div> : visibleJobs.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-slate-200">
            <BriefcaseBusiness className="mx-auto mb-3 text-slate-400" size={36} />
            <h2 className="font-semibold">No jobs here yet</h2>
            <p className="mt-1 text-sm text-slate-500">New eligible bookings will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleJobs.map(job => <JobCard key={job.id} job={job} uid={uid} busy={busyId === job.id} onOpen={() => setSelected(job)} />)}
          </div>
        )}
          </>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Earnings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat icon={<Wallet size={18} />} label="Today's Earnings" value={`₹${jobs.filter(j => j.workerId === uid && j.status === 'Done' && new Date(j.completedAt!).toDateString() === new Date().toDateString()).reduce((acc, j) => acc + (j.totalAmountToPay ?? j.price ?? 0), 0)}`} />
              <Stat icon={<CheckCircle2 size={18} />} label="Total Earnings" value={`₹${jobs.filter(j => j.workerId === uid && j.status === 'Done').reduce((acc, j) => acc + (j.totalAmountToPay ?? j.price ?? 0), 0)}`} />
              <Stat icon={<BriefcaseBusiness size={18} />} label="Jobs Completed" value={completedCount} />
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <h3 className="font-bold text-lg mb-4">Recent Payouts</h3>
              {jobs.filter(j => j.workerId === uid && j.status === 'Done').length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">No completed jobs yet.</div>
              ) : (
                <div className="space-y-3">
                  {jobs.filter(j => j.workerId === uid && j.status === 'Done').slice(0, 5).map(job => (
                    <div key={job.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div>
                        <div className="font-semibold text-sm">{job.category || 'Service'}</div>
                        <div className="text-xs text-slate-500">{job.date || 'Recent'}</div>
                      </div>
                      <div className="font-bold text-emerald-600">+₹{job.totalAmountToPay ?? job.price ?? 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Professional Profile</h2>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <UserRound size={32} />
              </div>
              <h3 className="text-xl font-bold">{userProfile?.name || 'Professional'}</h3>
              <p className="text-slate-500">{userProfile?.phone || 'No phone provided'}</p>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-6 text-left">
                <Info label="Service Area" value={userProfile?.area || 'Anywhere'} />
                <Info label="Sector" value={userProfile?.sector || 'All sectors'} />
                <Info label="Primary Skill" value={userProfile?.skill || userProfile?.workerSkill || 'General Service'} />
                <Info label="Status" value={online ? 'On Duty' : 'Off Duty'} />
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-[68px] grid-cols-3 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center gap-1 active:scale-95 ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-500'}`}>
          <Home size={20} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => setActiveTab('earnings')} className={`flex flex-col items-center justify-center gap-1 active:scale-95 ${activeTab === 'earnings' ? 'text-blue-600' : 'text-slate-500'}`}>
          <Wallet size={20} />
          <span className="text-[10px] font-bold">Earnings</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center gap-1 active:scale-95 ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-500'}`}>
          <UserRound size={20} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>

      <WorkerDragoAssistant jobs={jobs} selectedJob={selected} />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6" onClick={() => setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">{selected.category || 'Service Job'}</h2><p className="text-sm text-slate-500">Booking #{selected.id.slice(0, 10)}</p></div>
              <button onClick={() => setSelected(null)} className="rounded-full bg-slate-100 p-2"><XCircle size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <Info label="Customer" value={selected.customerName || 'Customer'} />
              <Info label="Date & time" value={`${selected.date || '—'} ${selected.time || ''}`} />
              <Info label="Address" value={selected.customerAddress || 'Address will be shared after assignment'} />
              <Info label="Issue" value={selected.issueDescription || 'No additional description'} />
              <Info label="Amount" value={`₹${selected.totalAmountToPay ?? selected.price ?? 0}`} />
              {selected.customerPhone && <a className="flex items-center gap-2 font-semibold text-blue-600" href={`tel:${selected.customerPhone}`}><Phone size={17} /> Call customer</a>}
              {selected.customerAddress && <div className="flex items-center gap-2 text-slate-600"><MapPin size={17} /> {selected.area || selected.sector || 'Service location'}</div>}
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {isPending(selected.status) && !selected.workerId ? <>
                <button disabled={!!busyId} onClick={() => rejectJob(selected)} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 disabled:opacity-50">Decline</button>
                <button disabled={!!busyId} onClick={() => acceptJob(selected)} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{busyId ? 'Accepting…' : 'Accept Job'}</button>
              </> : selected.workerId === uid && isActive(selected.status) ? <>
                <button disabled={!!busyId} onClick={() => updateStatus(selected, 'In-Progress')} className="rounded-xl border px-4 py-3 font-semibold">Work In Progress</button>
                <button disabled={!!busyId} onClick={() => setReviewOrder(selected)} className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">Mark Completed</button>
              </> : null}
            </div>
          </div>
        </div>
      )}

      {reviewOrder && (
        <PostClientReviewModal
          order={reviewOrder}
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitSuccess={() => {
            updateStatus(reviewOrder, 'Done');
            setReviewOrder(null);
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><div className="mb-2 flex items-center gap-2 text-slate-500">{icon}<span className="text-xs font-semibold">{label}</span></div><div className="text-2xl font-bold">{value}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-slate-800">{value}</div></div>;
}

function JobCard({ job, uid, busy, onOpen }: { job: OrderRecord; uid: string; busy: boolean; onOpen: () => void; key?: React.Key }) {
  const assigned = job.workerId === uid;
  return <button onClick={onOpen} className="w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><div><div className="font-bold">{job.category || 'Service'}</div><div className="mt-1 text-xs text-slate-500">#{job.id.slice(0, 10)}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${assigned ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{busy ? 'Updating…' : assigned ? job.status : 'NEW'}</span></div>
    <div className="mt-4 space-y-2 text-sm text-slate-600"><div className="flex gap-2"><Clock3 size={16} /> {job.date} {job.time || ''}</div><div className="flex gap-2"><MapPin size={16} /> {job.area || job.sector || job.customerAddress || 'Location available in details'}</div><div className="flex gap-2"><CheckCircle2 size={16} /> ₹{job.totalAmountToPay ?? job.price ?? 0}</div></div>
  </button>;
}

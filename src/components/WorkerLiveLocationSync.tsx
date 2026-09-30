import { useEffect } from 'react';
import { collection, onSnapshot, query, where, limit, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const LIVE_STATUSES = ['In Progress', 'In-Progress', 'Out for Service', 'Arrived'];

export default function WorkerLiveLocationSync() {
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const q = query(collection(db, 'orders'), where('workerId', '==', uid), limit(20));
    let activeOrderIds: string[] = [];
    let watchId: number | null = null;
    let lastPublished = 0;

    const stop = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const start = () => {
      if (watchId !== null || activeOrderIds.length === 0) return;
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          if (!activeOrderIds.length) return;
          const now = Date.now();
          if (now - lastPublished < 4000) return;
          lastPublished = now;

          const payload = {
            workerLocation: { lat: position.coords.latitude, lng: position.coords.longitude },
            workerLocationUpdatedAt: new Date().toISOString(),
            workerLocationAccuracyM: position.coords.accuracy ?? null,
            workerLocationHeading: position.coords.heading ?? null,
            workerLocationSpeed: position.coords.speed ?? null
          };

          await Promise.all(activeOrderIds.map(async (orderId) => {
            try {
              await updateDoc(doc(db, 'orders', orderId), payload);
            } catch (error) {
              console.warn('PunchX worker live GPS update:', error);
            }
          }));
        },
        (error) => console.warn('PunchX worker GPS watch:', error),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      activeOrderIds = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as any)
        .filter((order) => LIVE_STATUSES.includes(order.status))
        .map((order) => order.id);

      if (activeOrderIds.length) start();
      else stop();
    }, (error) => {
      console.warn('PunchX worker live order listener:', error);
      stop();
    });

    return () => {
      stop();
      unsubscribe();
    };
  }, []);

  return null;
}

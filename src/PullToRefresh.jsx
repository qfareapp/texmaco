import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const TRIGGER_DISTANCE = 74;

function canStartPull(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('input,textarea,select,button,a,video,iframe,.modal-backdrop,.video-modal,.whatsapp-card,.admin-modal')) return false;

  const scrollHost = target.closest('.news-page,.admin-shell');
  if (scrollHost) return scrollHost.scrollTop <= 0;

  const brochure = target.closest('.brochure');
  if (brochure) return brochure.dataset.slide === '0';

  return Boolean(target.closest('.welcome'));
}

export default function PullToRefresh() {
  const gesture = useRef(null);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!('ontouchstart' in window) && navigator.maxTouchPoints < 1) return undefined;

    const start = (event) => {
      if (refreshing || event.touches.length !== 1 || !canStartPull(event.target)) return;
      const touch = event.touches[0];
      gesture.current = { x: touch.clientX, y: touch.clientY, active: true };
    };
    const move = (event) => {
      if (!gesture.current?.active || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dy = touch.clientY - gesture.current.y;
      const dx = touch.clientX - gesture.current.x;
      if (dy <= 0 || Math.abs(dx) > dy) {
        gesture.current.active = false;
        distanceRef.current = 0;
        setDistance(0);
        return;
      }
      if (dy > 7) event.preventDefault();
      distanceRef.current = Math.min(105, dy * .55);
      setDistance(distanceRef.current);
    };
    const end = () => {
      if (!gesture.current?.active) return;
      gesture.current = null;
      if (distanceRef.current >= TRIGGER_DISTANCE) {
        setRefreshing(true);
        distanceRef.current = TRIGGER_DISTANCE;
        setDistance(TRIGGER_DISTANCE);
        window.setTimeout(() => window.location.reload(), 420);
      } else {
        distanceRef.current = 0;
        setDistance(0);
      }
    };

    document.addEventListener('touchstart', start, { passive: true, capture: true });
    document.addEventListener('touchmove', move, { passive: false, capture: true });
    document.addEventListener('touchend', end, { passive: true, capture: true });
    document.addEventListener('touchcancel', end, { passive: true, capture: true });
    return () => {
      document.removeEventListener('touchstart', start, true);
      document.removeEventListener('touchmove', move, true);
      document.removeEventListener('touchend', end, true);
      document.removeEventListener('touchcancel', end, true);
    };
  }, [refreshing]);

  const progress = Math.min(1, distance / TRIGGER_DISTANCE);
  return <div
    className={`pull-refresh ${distance > 0 ? 'pull-refresh--visible' : ''} ${refreshing ? 'pull-refresh--loading' : ''}`}
    style={{ '--pull-distance': `${distance}px`, '--pull-rotation': `${progress * 240}deg` }}
    aria-hidden="true"
  >
    <span><RefreshCw /></span>
    <small>{refreshing ? 'Refreshing…' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}</small>
  </div>;
}

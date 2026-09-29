import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (!('wakeLock' in navigator)) {
          console.log('Wake Lock is not supported');
          return;
        }

        if (document.visibilityState !== 'visible') {
          return;
        }

        wakeLockRef.current = await navigator.wakeLock.request('screen');

        console.log('Screen Wake Lock enabled');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('Screen Wake Lock released');
        });
      } catch (error) {
        console.error('Wake Lock error:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    requestWakeLock();

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
}
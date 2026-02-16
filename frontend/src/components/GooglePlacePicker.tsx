import { useEffect, useRef, useState } from 'react';

type Props = {
  value: { placeId: string; address: string };
  onChange: (v: { placeId: string; address: string }) => void;
  placeholder?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(s);
  });
}

export default function GooglePlacePicker({ value, onChange, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_FRONTEND_KEY as string | undefined;
    if (!key) return;

    loadGoogleMaps(key)
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!inputRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['place_id', 'formatted_address', 'name'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const placeId = place?.place_id as string | undefined;
      const address = (place?.formatted_address || place?.name) as string | undefined;
      if (!placeId) return;
      onChange({ placeId, address: address ?? '' });
    });

    return () => {
      window.google?.maps?.event?.clearInstanceListeners?.(ac);
    };
  }, [ready, onChange]);

  return (
    <div className="form-group">
      <label>Location (Google Maps)</label>
      <input
        ref={inputRef}
        value={value.address}
        onChange={(e) => onChange({ placeId: value.placeId, address: e.target.value })}
        placeholder={placeholder ?? 'Search location and select from suggestions'}
        disabled={!import.meta.env.VITE_GOOGLE_MAPS_FRONTEND_KEY}
      />
      {!import.meta.env.VITE_GOOGLE_MAPS_FRONTEND_KEY ? (
        <small>Google Maps key missing (VITE_GOOGLE_MAPS_FRONTEND_KEY)</small>
      ) : null}
      {value.placeId ? (
        <small>Selected placeId: {value.placeId}</small>
      ) : null}
    </div>
  );
}

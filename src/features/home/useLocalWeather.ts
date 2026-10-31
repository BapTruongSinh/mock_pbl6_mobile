import { useCallback, useEffect, useState } from 'react';
import { loadLocalWeather, type LocalWeather } from './weatherService';
export function useLocalWeather(): { weather: LocalWeather | null; refresh: () => void } {
  const [weather, setWeather] = useState<LocalWeather | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setWeather(null);
    const timer = setTimeout(() => {
      controller.abort();
      if (active) setWeather(null);
    }, 20000);
    void loadLocalWeather(controller.signal)
      .then((value) => {
        if (active && !controller.signal.aborted) setWeather(value);
      })
      .catch(() => {
        if (active) setWeather(null);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { weather, refresh };
}

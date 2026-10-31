import * as Location from 'expo-location';
export type LocalWeather = { temperature: number; description: string };
export function weatherDescription(code: number): string {
  if (code === 0 || code === 1) return 'Trời đẹp';
  if (code === 2 || code === 3) return 'Nhiều mây';
  if (code === 45 || code === 48) return 'Sương mù';
  if (code >= 95 && code <= 99) return 'Giông';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'Có mưa';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Có tuyết';
  return '---';
}
export async function loadLocalWeather(signal: AbortSignal): Promise<LocalWeather | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted || signal.aborted) return null;
  if (!(await Location.hasServicesEnabledAsync())) return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  if (signal.aborted) return null;
  const latitude = position.coords.latitude.toFixed(2);
  const longitude = position.coords.longitude.toFixed(2);
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
    { signal },
  );
  if (!response.ok) return null;
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('current' in data) ||
    !data.current ||
    typeof data.current !== 'object'
  )
    return null;
  const current = data.current as Record<string, unknown>;
  if (
    typeof current.temperature_2m !== 'number' ||
    !Number.isFinite(current.temperature_2m) ||
    typeof current.weather_code !== 'number'
  )
    return null;
  return {
    temperature: Math.round(current.temperature_2m),
    description: weatherDescription(current.weather_code),
  };
}

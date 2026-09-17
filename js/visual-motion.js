// Fixed display scale: never change it with velocity or playback rate.
// Scene length is illustrative; timing comes directly from simulated displacement.
export const METERS_PER_SCENE_UNIT = 10;
export function visualMotion(distanceMeters, frameSeconds) {
  const distance = distanceMeters / METERS_PER_SCENE_UNIT;
  const speed = frameSeconds > 0 ? Math.abs(distance) / frameSeconds : 0;
  const t = Math.max(0, Math.min(1, (speed - 120) / 480));
  return { distance, speed, blur: t * t * (3 - 2 * t) };
}
export function wrapDistance(distance, period) {
  return ((distance % period) + period) % period;
}

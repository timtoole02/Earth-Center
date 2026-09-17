// SI units throughout. Concentric, constant-density shells; not a full PREM model.
export const R = 6_371_000;
export const G = 6.6743e-11;
export const G0 = 9.81;
export const SHELLS = [
  { radius: 1_221_000, density: 13000, name: "Inner core", color: "#ffe5a5" },
  { radius: 3_480_000, density: 11000, name: "Outer core", color: "#ffad54" },
  { radius: 5_711_000, density: 5000, name: "Lower mantle", color: "#db623e" },
  { radius: 6_336_000, density: 3600, name: "Upper mantle", color: "#774c45" },
  { radius: R, density: 2900, name: "Crust", color: "#637779" },
];
const rawMass = SHELLS.reduce(
  (sum, s, i) =>
    sum +
    ((4 * Math.PI) / 3) *
      s.density *
      (s.radius ** 3 - (SHELLS[i - 1]?.radius ?? 0) ** 3),
  0,
);
const normalization = (G0 * R * R) / G / rawMass;
export function enclosedMass(radius, model = "layered") {
  const r = Math.min(R, Math.abs(radius));
  if (model === "uniform") return ((G0 * R * R) / G) * (r / R) ** 3;
  let mass = 0,
    inner = 0;
  for (const s of SHELLS) {
    const outer = Math.min(r, s.radius);
    if (outer > inner)
      mass +=
        ((4 * Math.PI) / 3) *
        s.density *
        normalization *
        (outer ** 3 - inner ** 3);
    inner = s.radius;
    if (r <= inner) break;
  }
  return mass;
}
export function gravity(x, model = "layered") {
  if (Math.abs(x) < 1e-8) return 0;
  return (-Math.sign(x) * G * enclosedMass(x, model)) / (x * x);
}
export function potential(x, model = "layered") {
  const r = Math.abs(x),
    mu = G0 * R * R;
  if (r >= R) return -mu / r;
  if (model === "uniform") return ((-0.5 * G0) / R) * (3 * R * R - r * r);
  let outerContribution = 0,
    inner = 0;
  for (const s of SHELLS) {
    const low = Math.max(r, inner);
    if (s.radius > low)
      outerContribution +=
        2 *
        Math.PI *
        s.density *
        normalization *
        (s.radius * s.radius - low * low);
    inner = s.radius;
  }
  return -G * ((r > 0 ? enclosedMass(r, model) / r : 0) + outerContribution);
}
export function layerAt(x) {
  return (
    SHELLS.find((s) => Math.abs(x) <= s.radius) ?? {
      name: "Surface",
      color: "#86ddd5",
    }
  );
}
export function createState() {
  return {
    x: R,
    v: 0,
    time: 0,
    dissipated: 0,
    maxSpeed: 0,
    crossings: 0,
    turns: 0,
  };
}
export function energy(s, model = "layered") {
  return 0.5 * s.v * s.v + potential(s.x, model);
}
const dragK = (0.5 * 1.225 * 0.7) / 90; // Controlled sea-level air, 90 kg capsule, Cd*A=0.7 m².
export function step(
  s,
  duration,
  { model = "layered", air = false, stopAtAntipode = false } = {},
) {
  let remaining = duration;
  while (remaining > 1e-9) {
    const dt = Math.min(0.2, remaining);
    remaining -= dt;
    const oldX = s.x,
      oldV = s.v;
    // Strang-split exact quadratic drag around a velocity-Verlet gravity step.
    const drag = () => {
      if (!air) return;
      const before = 0.5 * s.v * s.v;
      s.v /= 1 + dragK * Math.abs(s.v) * dt * 0.5;
      s.dissipated += before - 0.5 * s.v * s.v;
    };
    drag();
    s.v += gravity(s.x, model) * dt * 0.5;
    s.x += s.v * dt;
    s.v += gravity(s.x, model) * dt * 0.5;
    drag();
    s.time += dt;
    s.maxSpeed = Math.max(s.maxSpeed, Math.abs(s.v));
    if (oldX * s.x < 0) s.crossings++;
    if (oldV * s.v < 0) {
      s.turns++;
      if (stopAtAntipode && !air && s.x < 0) {
        // The fictional surface catch arrests the capsule at its turning point.
        // Interpolate the event time instead of advancing to the end of a video frame.
        s.time -= dt * (1 - Math.abs(oldV) / (Math.abs(oldV) + Math.abs(s.v)));
        s.x = -R;
        s.v = 0;
        return s;
      }
    }
  }
  return s;
}
export function forecast(model = "layered") {
  const s = createState();
  let centerTime = 0;
  while (s.turns === 0 && s.time < 4000) {
    step(s, 0.2, { model });
    if (!centerTime && s.x <= 0) centerTime = s.time;
  }
  return { centerTime, transitTime: s.time, maxSpeed: s.maxSpeed };
}

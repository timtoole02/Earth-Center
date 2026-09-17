import test from "node:test";
import assert from "node:assert/strict";
import {
  R,
  G0,
  gravity,
  createState,
  step,
  energy,
  potential,
  forecast,
  SHELLS,
} from "../js/physics.js";
test("gravity is finite at the center, symmetric, and matches surface gravity", () => {
  for (const model of ["uniform", "layered"]) {
    assert.equal(gravity(0, model), 0);
    assert.ok(Math.abs(gravity(R, model) + G0) < 1e-10);
    for (const r of [1, 1000, R / 2, R])
      assert.equal(gravity(r, model), -gravity(-r, model));
    assert.ok(Math.abs(gravity(2 * R, model) + G0 / 4) < 1e-10);
  }
});
test("uniform density follows the analytic harmonic trajectory", () => {
  const s = createState();
  const omega = Math.sqrt(G0 / R);
  step(s, 900, { model: "uniform" });
  assert.ok(Math.abs(s.x - R * Math.cos(omega * 900)) < 0.1);
  assert.ok(Math.abs(s.v + R * omega * Math.sin(omega * 900)) < 0.001);
  const f = forecast("uniform");
  assert.ok(Math.abs(f.transitTime - Math.PI / omega) < 0.3);
});
test("layered model completes a transit and conserves energy over oscillations", () => {
  const s = createState(),
    initial = energy(s);
  step(s, 10000);
  assert.ok(s.crossings >= 4);
  assert.ok(Math.abs((energy(s) - initial) / initial) < 1e-6);
  assert.ok(Math.abs(s.x) <= R + 1);
  const f = forecast();
  assert.ok(f.transitTime > 2100 && f.transitTime < 2500);
  assert.ok(f.maxSpeed > 9000 && f.maxSpeed < 11000);
});
test("potential derivative matches gravity and is continuous at shell boundaries", () => {
  for (const shell of SHELLS) {
    const x = shell.radius;
    assert.ok(
      Math.abs((potential(x + 1) - potential(x - 1)) / 2 + gravity(x)) < 0.0001,
    );
    assert.ok(Math.abs(gravity(x + 1) - gravity(x - 1)) < 0.0001);
  }
  assert.ok(Number.isFinite(potential(0)));
});
test("air drag removes energy and approaches a surface terminal speed", () => {
  const s = createState(),
    initial = energy(s);
  step(s, 100, { air: true });
  assert.ok(Math.abs(s.v) > 40 && Math.abs(s.v) < 50);
  assert.ok(energy(s) < initial);
  assert.ok(s.dissipated > 0);
  assert.ok(Number.isFinite(s.x));
});
test("gravity reverses across the center while motion carries through", () => {
  const s = { ...createState(), x: 100, v: -10000 };
  step(s, 0.2);
  assert.ok(s.x < 0);
  assert.ok(s.v < 0);
  assert.ok(gravity(s.x) > 0);
  assert.equal(s.crossings, 1);
});
test("playback batching does not change physical trajectory", () => {
  const a = createState(),
    b = createState();
  step(a, 120);
  for (let i = 0; i < 600; i++) step(b, 0.2);
  assert.ok(Math.abs(a.x - b.x) < 1e-6);
  assert.ok(Math.abs(a.v - b.v) < 1e-6);
});
test("surface catch resolves the turning event even during fast playback", () => {
  const s = createState();
  while (!s.turns) step(s, 12, { stopAtAntipode: true });
  assert.equal(s.x, -R);
  assert.equal(s.v, 0);
  assert.ok(Math.abs(s.time - forecast().transitTime) < 0.21);
  step(s, 1);
  assert.ok(s.v > 0);
  assert.ok(s.x > -R);
});

import test from "node:test";
import assert from "node:assert/strict";
import { visualMotion, wrapDistance } from "../js/visual-motion.js";
import { createState, step } from "../js/physics.js";
test("visual distance is proportional to simulated travel, including playback speed", () => {
  for (const rate of [1, 10, 60, 240]) {
    const motion = visualMotion(100 * rate, 0.1);
    assert.equal(motion.distance, 10 * rate);
    assert.equal(motion.speed, 100 * rate);
  }
});
test("pause and turnaround do not drift, and returning reverses the scenery", () => {
  assert.deepEqual(visualMotion(0, 1 / 60), { distance: 0, speed: 0, blur: 0 });
  assert.equal(visualMotion(-100, 0.1).distance, -10);
  assert.equal(wrapDistance(-3, 24), 21);
});
test("frame subdivision preserves distance while blur stays bounded", () => {
  const large = visualMotion(1000, 1);
  let total = 0;
  for (let i = 0; i < 100; i++) total += visualMotion(10, 0.01).distance;
  assert.equal(total, large.distance);
  for (const speed of [0, 50, 600, 10000, 2400000]) {
    const motion = visualMotion(speed / 60, 1 / 60);
    assert.ok(motion.blur >= 0 && motion.blur <= 1);
  }
});
test("visual motion follows physics acceleration rather than a capped animation clock", () => {
  const state = createState();
  let travel = 0,
    previous = state.x;
  for (let i = 0; i < 120; i++) {
    step(state, 1);
    travel += visualMotion(previous - state.x, 1).distance;
    previous = state.x;
  }
  const expected = (createState().x - state.x) / 10;
  assert.ok(Math.abs(travel - expected) < 1e-7);
});

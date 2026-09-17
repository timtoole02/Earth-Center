import { Arrival } from "./arrival.js";
import { World } from "./world.js";
import { interiorDescription } from "./interior.js";
import { AudioEngine } from "./audio.js";
import {
  R,
  SHELLS,
  createState,
  step,
  gravity,
  layerAt,
  forecast,
} from "./physics.js";
const $ = (id) => document.getElementById(id);
const fmt = (n, d = 0) =>
  n.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
const clock = (t) => {
  const sec = Math.floor(t);
  return sec >= 3600
    ? `${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`
    : `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};
let world;
try {
  world = new World($("scene"));
} catch (e) {
  $("view-title").textContent = "WebGL could not start";
  $("view-note").textContent =
    "Enable graphics acceleration in your browser and refresh.";
  $("launch").disabled = true;
  throw e;
}
const audio = new AudioEngine();
let state = createState(),
  running = false,
  started = false,
  completed = false,
  model = "layered",
  air = false,
  rate = 60;
let deepest = 0,
  toastUntil = 0,
  oldMilestones = 0;
const forecasts = {
  layered: forecast("layered"),
  uniform: forecast("uniform"),
};
const items = [...document.querySelectorAll("#milestone-list li")];
const arrival = new Arrival(world);
let shipDiscovered = false,
  shipAnnounced = false;
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  toastUntil = performance.now() + 3300;
}
function setRunning(value) {
  running = value;
  $("pause").textContent = value ? "Ⅱ Pause" : "▶ Resume";
  $("mission-status").textContent = !started
    ? "EXPEDITION READY"
    : value
      ? "EXPEDITION IN PROGRESS"
      : "EXPEDITION PAUSED";
  audio.update(Math.abs(state.v), running);
  updateHUD();
}
function view(name) {
  world.setView(name);
  document.body.classList.toggle("in-shaft", name === "shaft");
  $("view-shaft").classList.toggle("active", name === "shaft");
  $("view-earth").classList.toggle("active", name === "earth");
  $("view-kicker").textContent =
    name === "shaft" ? "CAPSULE VIEW / GLASS OBSERVATORY" : "PLANET VIEW";
  $("view-title").textContent =
    name === "shaft" ? "Into the unknown." : "12,742 km. Straight through.";
  $("view-note").textContent =
    name === "shaft"
      ? "Transparent tube · illuminated geological illustration"
      : "True-scale layers · capsule position shown along the diameter";
}
function reset() {
  state = createState();
  shipDiscovered = false;
  shipAnnounced = false;
  deepest = 0;
  started = false;
  completed = false;
  oldMilestones = 0;
  setRunning(false);
  $("pause").disabled = true;
  $("launch-card").hidden = false;
  $("result").hidden = true;
  $("toast").classList.remove("show");
  world.offset = 0;
  world.interior.travel = 0;
  world.interior.clock = 0;
  view("earth");
  arrival.ready();
  enterTerminal();
  updateHUD();
}
function beginFall(play = true) {
  started = true;
  $("launch-card").hidden = true;
  $("pause").disabled = false;
  arrival.phase = "done";
  document.body.classList.remove("cinematic", "at-terminal");
  $("cinematic-fade").style.opacity = 0;
  setRunning(play);
  view("shaft");
  toast(
    play
      ? "Release confirmed · let gravity do the work"
      : "Boarding skipped · paused. Resume when ready.",
  );
}
function enterTerminal() {
  document.body.classList.remove("cinematic", "in-shaft");
  document.body.classList.add("at-terminal");
  $("launch-card").hidden = false;
  $("cinematic-fade").style.opacity = 0;
  $("mission-status").textContent = "WELCOME TO EARTH CENTER";
}
function launch() {
  if (arrival.phase === "boarding") return;
  setRunning(false);
  arrival.board();
  document.body.classList.remove("at-terminal", "in-shaft");
  document.body.classList.add("cinematic");
  $("launch-card").hidden = true;
  $("intro-pause").textContent = "Pause film";
}
function skipFilm(escape = false) {
  const before = arrival.phase;
  arrival.skip();
  if (before === "arrival") enterTerminal();
  if (before === "boarding") beginFall(!escape);
}
function pauseFilm() {
  arrival.paused = !arrival.paused;
  $("intro-pause").textContent = arrival.paused ? "Resume film" : "Pause film";
}
$("skip-intro").onclick = () => skipFilm();
$("intro-pause").onclick = pauseFilm;
$("replay-intro").onclick = () => {
  reset();
  arrival.start();
  $("intro-pause").textContent = "Pause film";
  document.body.classList.remove("at-terminal");
  document.body.classList.add("cinematic");
  $("launch-card").hidden = true;
};
function predict() {
  const f = forecasts[model];
  document.querySelector("#launch-card small").textContent = air
    ? `${rate}× time · drag slows the journey`
    : `${rate}× falling time · brief discovery slow-motion`;
  $("prediction").innerHTML = air
    ? "CONTROLLED AIR<br>Drag dissipates energy.<br><b>The far surface is out of reach.</b>"
    : `VACUUM FORECAST<br>Center <b>${clock(f.centerTime)}</b> · other side <b>${clock(f.transitTime)}</b><br>Peak <b>${fmt(f.maxSpeed / 1000, 2)} km/s</b>`;
}
function updateHUD() {
  const depth = Math.max(0, R - Math.abs(state.x));
  if (world.view === "shaft") {
    const region = interiorDescription(depth);
    $("view-title").textContent = `Inside the ${region.name.toLowerCase()}.`;
    $("view-note").textContent = region.detail;
    if (depth > 8000 && depth < 30000) {
      $("view-title").textContent = "That wasn't on the map.";
      $("view-note").textContent =
        "Buried vessel · estimated length 160 km / 100 miles · look up";
    }
  }
  $("depth").innerHTML = `${fmt(depth / 1000, 1)} <small>km</small>`;
  const speed = Math.abs(state.v);
  $("speed").innerHTML =
    speed < 1000
      ? `${fmt(speed)} <small>m/s</small>`
      : `${fmt(speed / 1000, 2)} <small>km/s</small>`;
  $("gravity").innerHTML =
    `${fmt(Math.abs(gravity(state.x, model)) / 9.81, 2)} <small>g</small>`;
  $("gravity-note").textContent = air
    ? "Drag produces felt acceleration"
    : "Free fall: zero felt weight";
  $("depth-meter").style.width = `${(depth / R) * 100}%`;
  $("direction").textContent = !started
    ? "Waiting for release"
    : !running
      ? "Paused"
      : state.x * state.v < 0
        ? "Falling toward the center"
        : "Rising toward the surface";
  $("elapsed").textContent = clock(state.time);
  $("peak").textContent =
    state.maxSpeed >= 1000
      ? `${fmt(state.maxSpeed / 1000, 2)} km/s`
      : `${fmt(state.maxSpeed)} m/s`;
  $("layer-name").textContent = layerAt(state.x).name.toUpperCase();
  $("side-label").textContent = state.x >= 0 ? "ENTRY SIDE" : "FAR SIDE";
  $("progress-label").textContent =
    `${fmt(Math.min(100, Math.max(0, ((R - state.x) / (2 * R)) * 100)), 1)}% OF DIAMETER`;
  deepest = Math.max(deepest, R - state.x);
  let count = 0;
  for (const item of items) {
    const done = deepest >= Number(item.dataset.depth);
    item.classList.toggle("done", done);
    if (done) count++;
  }
  $("milestone-count").textContent = `${count} / 5`;
  if (count > oldMilestones) {
    toast(
      count === 4
        ? "Center crossed · zero gravity, maximum speed"
        : count === 5
          ? "Opposite surface reached"
          : `${items[count - 1].querySelector("span").textContent} · milestone reached`,
    );
    oldMilestones = count;
  }
  drawMap();
}
function drawMap() {
  const c = $("map").getContext("2d"),
    mid = 220,
    r = 158;
  c.clearRect(0, 0, 440, 440);
  for (const shell of [...SHELLS].reverse()) {
    c.fillStyle = shell.color;
    c.globalAlpha = 0.78;
    c.beginPath();
    c.arc(mid, mid, (r * shell.radius) / R, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.strokeStyle = "#102027";
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(mid, mid - r - 15);
  c.lineTo(mid, mid + r + 15);
  c.stroke();
  c.setLineDash([3, 7]);
  c.strokeStyle = "#b9efdf88";
  c.lineWidth = 1;
  c.stroke();
  c.setLineDash([]);
  const y = mid - (state.x / R) * r;
  c.strokeStyle = "#a2f6df";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(mid, mid - r);
  c.lineTo(mid, y);
  c.stroke();
  c.fillStyle = "#edfff8";
  c.shadowColor = "#8ce1d3";
  c.shadowBlur = 15;
  c.beginPath();
  c.arc(mid, y, 5, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = "#8ce1d366";
  c.beginPath();
  c.arc(mid, y, 11, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "#a1b4b7";
  c.font = "14px monospace";
  c.textAlign = "center";
  c.fillText("ENTRY", mid, 24);
  c.fillText("ANTIPODE", mid, 429);
}
$("launch").onclick = launch;
$("pause").onclick = () => {
  if (started) {
    if (!running) $("result").hidden = true;
    setRunning(!running);
  }
};
$("reset").onclick = reset;
$("again").onclick = reset;
$("continue").onclick = () => {
  $("result").hidden = true;
  setRunning(true);
  toast("No energy lost · the journey continues");
};
function toggleInstruments() {
  const hidden = document.body.classList.toggle("hide-instruments");
  $("hide-hud").textContent = hidden
    ? "H · Show instruments"
    : "H · Hide instruments";
}
$("hide-hud").onclick = toggleInstruments;
$("view-shaft").onclick = () => view("shaft");
$("view-earth").onclick = () => view("earth");
$("rate").onchange = (e) => {
  rate = Number(e.target.value);
  predict();
  toast(`${rate}× simulation time`);
};
$("model").onchange = (e) => {
  model = e.target.value;
  reset();
  predict();
  toast("Earth model changed · new expedition ready");
};
$("medium").onchange = (e) => {
  air = e.target.value === "air";
  reset();
  predict();
  toast(
    air ? "Controlled air · drag is now active" : "Vacuum · no air resistance",
  );
};
$("sound").onclick = async () => {
  try {
    $("sound").textContent = (await audio.toggle()) ? "Sound on" : "Sound off";
    audio.update(Math.abs(state.v), running);
  } catch {
    toast("Audio unavailable in this browser");
  }
};
$("help").onclick = () => {
  if (arrival.phase !== "done") {
    arrival.paused = true;
    $("intro-pause").textContent = "Resume film";
  }
  if (running) setRunning(false);
  $("help-dialog").showModal();
};
$("close-help").onclick = () => $("help-dialog").close();
window.addEventListener("keydown", (e) => {
  if ($("help-dialog").open) return;
  if (arrival.phase === "arrival" || arrival.phase === "boarding") {
    if (e.code === "Escape") {
      skipFilm(true);
      e.preventDefault();
    }
    if (e.code === "KeyP") {
      pauseFilm();
      e.preventDefault();
    }
    if (e.code === "Space" && e.target.tagName !== "BUTTON") {
      skipFilm();
      e.preventDefault();
    }
    return;
  }
  if (e.code === "Escape") {
    if (running) setRunning(false);
    return;
  }
  if ($("help-dialog").open) return;
  if (e.code === "KeyP") {
    e.preventDefault();
    if (started) setRunning(false);
    return;
  }
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.code === "Space" && e.target.tagName !== "BUTTON") {
    e.preventDefault();
    if (!started) launch();
    else if ($("result").hidden) setRunning(!running);
  }
  if (e.code === "KeyH") toggleInstruments();
  if (e.code === "Digit1") view("shaft");
  if (e.code === "Digit2") view("earth");
});
window.addEventListener("blur", () => {
  if (running) setRunning(false);
  if (arrival.phase !== "done") {
    arrival.paused = true;
    $("intro-pause").textContent = "Resume film";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) setRunning(false);
});
let prev = performance.now(),
  hudTime = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000));
  prev = now;
  if (arrival.phase !== "done") {
    const before = arrival.phase;
    const film = arrival.update(
      document.hidden || $("help-dialog").open ? 0 : dt,
    );
    $("cinematic-fade").style.opacity = film.fade;
    $("intro-caption").textContent = film.caption;
    if (before !== "ready" && arrival.phase === "ready") enterTerminal();
    if (before !== "done" && arrival.phase === "done") {
      beginFall();
      world.render(state, 0, false);
    }
    requestAnimationFrame(frame);
    return;
  }
  let distanceTraveled = 0,
    simulationSeconds = 0;
  if (running) {
    const previousPosition = state.x,
      previousTime = state.time;
    const previousTurns = state.turns;
    const depth = R - Math.abs(state.x);
    const shipFlyby =
      !shipDiscovered && state.x > 0 && depth >= 8000 && depth < 30000;
    if (!shipDiscovered && state.x > 0 && depth >= 30000) {
      shipDiscovered = true;
      toast("Survey anomaly logged. Absolutely nothing to see here.");
    }
    if (shipFlyby && !shipAnnounced) {
      shipAnnounced = true;
      toast("Look up. That's a 100-mile spaceship. Probably fine.");
    }
    const playback = shipFlyby ? Math.min(rate, 10) : rate;
    if (shipFlyby) {
      $("mission-status").textContent =
        `UNSCHEDULED ARCHAEOLOGY · ${playback}×`;
    } else $("mission-status").textContent = "EXPEDITION IN PROGRESS";
    step(state, dt * playback, { model, air, stopAtAntipode: !completed });
    distanceTraveled = previousPosition - state.x;
    simulationSeconds = state.time - previousTime;
    if (
      !air &&
      !completed &&
      state.turns > previousTurns &&
      state.x < -0.999 * R
    ) {
      completed = true;
      deepest = 2 * R;
      setRunning(false);
      $("result").hidden = false;
      $("result-text").textContent =
        `You crossed Earth in ${clock(state.time)} of simulated time and reached ${fmt(state.maxSpeed / 1000, 2)} km/s. Gravity brought you to rest on the other side. Without a catch, you'll fall back again.`;
      view("earth");
    }
  }
  if (now - hudTime > 80) {
    updateHUD();
    hudTime = now;
    audio.update(Math.abs(state.v), running);
  }
  if (now > toastUntil) $("toast").classList.remove("show");
  world.render(state, dt, running, distanceTraveled, simulationSeconds);
  requestAnimationFrame(frame);
}
document.body.classList.add("cinematic");
$("launch-card").hidden = true;
predict();
updateHUD();
requestAnimationFrame(frame);

import { BOOT_STAGES, createBootPipeline, retryTask, selectQualityProfile } from "./boot-runtime.js";

const BUILD_TOKEN = "809cc9d2cb01";
const status = document.getElementById("bootStatus");
const retry = document.getElementById("bootRetry");
const dataBadge = document.getElementById("realDataBadge");
let engineState = "booting";
let fallbackTimer = 0;
const memory = navigator.deviceMemory || 4;
const cores = navigator.hardwareConcurrency || 4;
const coarse = matchMedia("(pointer: coarse)").matches;
const compact = Math.min(screen.width, screen.height) <= 820;
const saveData = navigator.connection?.saveData === true;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const profile = selectQualityProfile({ memory, cores, coarse, compact, saveData, pixelRatio: devicePixelRatio || 1 });
const low = profile === "low";
const profiles = {
  low: { roadFile: "vegas-roads-low.js", renderScale: .72, frameInterval: 33, npcCount: 8 },
  medium: { roadFile: "vegas-roads-medium.js", renderScale: 1, frameInterval: 33, npcCount: 14 },
  high: { roadFile: "vegas-roads.js", renderScale: 1.25, frameInterval: 33, npcCount: 20 },
  ultra: { roadFile: "vegas-roads.js", renderScale: 1.5, frameInterval: 16, npcCount: 28 },
};
const selected = profiles[profile];

const boot = createBootPipeline({ onStage(stage) {
  window.JC_BOOT_STAGE = stage;
  document.body.dataset.bootStage = stage;
  if (stage !== "ready") status.textContent = stage.replaceAll("-", " ").toUpperCase();
}});
window.JC_BOOT = boot;

status.textContent = `${profile.toUpperCase()} GRAPHICS · ${cores} CPU CORES · ${memory} GB MEMORY`;

window.JC_DEVICE_PROFILE = profile;
window.JC_RENDER_SCALE = selected.renderScale;
window.JC_FRAME_INTERVAL = selected.frameInterval;
window.JC_NPC_COUNT = selected.npcCount;
window.JC_MEMORY_PRESSURE = false;
window.JC_PERFORMANCE = {
  profile,
  memoryGB: memory,
  cores,
  saveData,
  reducedMotion,
  roadLod: selected.roadFile,
  renderScale: selected.renderScale,
  targetFrameInterval: selected.frameInterval,
};

function applyRendererScale() {
  const renderer = window.JC_RENDERER;
  if (renderer?.setPixelRatio) renderer.setPixelRatio(Math.min(devicePixelRatio || 1, window.JC_RENDER_SCALE));
}

function degrade(reason) {
  if (performance.now() - lastDegrade < 15000) return;
  lastDegrade = performance.now();
  window.JC_MEMORY_PRESSURE = true;
  window.JC_RENDER_SCALE = Math.max(.65, window.JC_RENDER_SCALE - .12);
  window.JC_FRAME_INTERVAL = Math.max(window.JC_FRAME_INTERVAL, 33);
  window.JC_PERFORMANCE.lastDegradeReason = reason;
  window.JC_PERFORMANCE.renderScale = window.JC_RENDER_SCALE;
  window.JC_PERFORMANCE.targetFrameInterval = window.JC_FRAME_INTERVAL;
  applyRendererScale();
}

let longTaskPressure = 0, pressureWindow = performance.now(), lastDegrade = 0;
if ("PerformanceObserver" in window) {
  try {
    new PerformanceObserver((list) => {
      if (engineState !== "3d-active" || performance.now() - pressureWindow < 10000) return;
      longTaskPressure += list.getEntries().reduce((sum, entry) => sum + entry.duration, 0);
      if (longTaskPressure > 1600) {
        degrade("sustained-main-thread-load");
        longTaskPressure = 0;
      }
    }).observe({ type: "longtask", buffered: false });
  } catch {}
}

setInterval(() => {
  const heap = performance.memory;
  if (!heap?.jsHeapSizeLimit) return;
  const ratio = heap.usedJSHeapSize / heap.jsHeapSizeLimit;
  window.JC_PERFORMANCE.heapUsageRatio = Math.round(ratio * 1000) / 1000;
  if (ratio > .78) degrade("javascript-heap-pressure");
}, 8000);

document.addEventListener("visibilitychange", () => {
  window.JC_FRAME_INTERVAL = document.hidden ? 1000 : window.JC_MEMORY_PRESSURE ? 33 : selected.frameInterval;
});

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    const available = !!context;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return available;
  } catch { return false; }
}

function fail(message) {
  status.textContent = message;
  retry.style.display = "block";
  retry.textContent = "RETRY 3D GAME";
  retry.onclick = () => location.reload();
}

function loadRequiredScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadRealWorldData() {
  const started = performance.now();
  status.textContent = `LOADING REAL LAS VEGAS · ${profile.toUpperCase()} PROFILE`;
  const response=await retryTask(() => fetch(`./jc-the-holy-og-assets/generated/world/index.json?v=${BUILD_TOKEN}`,{cache:'no-store'}).then((value) => {
    if (!value.ok) throw new Error(`World index HTTP ${value.status}`);
    return value;
  }), { attempts: 3 });
  if(!response.ok)throw new Error('World index unavailable');
  const index=await response.json();
  if(index.contract?.id!=='las-vegas-utm11-meters-v1')throw new Error('World frame mismatch');
  window.JC_WORLD_INDEX=index;
  const roadProfile=profile==='high'?'full':profile;
  try{await loadRequiredScript(index.roadProfiles[roadProfile]);}
  catch(error){if(roadProfile==='low')throw error;await loadRequiredScript(index.roadProfiles.low);window.JC_DEVICE_PROFILE='low';degrade('road-pack-fallback');}
  await loadRequiredScript('./jc-the-holy-og-assets/vegas-sections.js?v=17');
  const roads = window.JC_VEGAS_OSM;
  if (!roads?.roads?.length || !/openstreetmap/i.test(roads.source || "")) {
    throw new Error("Real Las Vegas road registry unavailable");
  }
  roads.coordinateOrientation ||= { x: "east", z: "south" };
  roads.profile ||= profile === "high" ? "full" : profile;
  roads.sourceRoadCount ||= 13729;
  roads.sourcePointCount ||= 63182;
  if(roads.coordinateFrame!==index.contract.id)throw new Error("Road frame mismatch");
  window.JC_PERFORMANCE.realWorldLoadMs = Math.round(performance.now() - started);
  window.JC_PERFORMANCE.loadedRoads = roads.roads.length;
  if (dataBadge) dataBadge.textContent = `${roads.roads.length.toLocaleString()} REAL ROADS · SOURCE BUILDING FOOTPRINTS`;
}

async function startCompatibility(reason) {
  if (engineState === "3d-active" || engineState === "compat-active") return;
  engineState = "compat-active";
  window.JC_BOOT_ABORTED = true;
  clearTimeout(fallbackTimer);
  console.warn("Full 3D startup stopped", reason);
  fail(`FULL 3D COULD NOT START · ${reason}. Retry here; the game will not switch editions automatically.`);
}

async function boot3D() {
  status.textContent = `PREPARING LOCAL LAS VEGAS · ${cores} CPU · ${memory} GB RAM`;
  const engine = new URL("./game-current.js", location.href);
  engine.searchParams.set("build", BUILD_TOKEN);
  await import(`./real-life-runtime.bundle.js?v=${BUILD_TOKEN}`);
  boot.complete("boot", { profile });
  await import(engine.href);
  if (engineState === "compat-active") return;
  engineState = "3d-active";
  clearTimeout(fallbackTimer);
  pressureWindow = performance.now();
  applyRendererScale();
  boot.complete("engine");
  await verifyGameplayReady();
}

async function verifyGameplayReady() {
  const checks = [
    ["player", () => window.JC_GAMEPLAY?.position?.()],
    ["terrain", () => window.JC_WORLD_INDEX?.contract],
    ["collision", () => window.JC_GAMEPLAY && window.JC_WORLD_INDEX],
    ["nearby-world", () => window.JC_VEGAS_OSM?.roads?.length],
    ["input", () => window.JC_GAMEPLAY?.pollInput],
    ["camera", () => window.JC_RENDERER?.domElement],
  ];
  const deadline = performance.now() + 12000;
  for (const [stage, check] of checks) {
    while (!check()) {
      if (performance.now() > deadline) throw new Error(`${stage.toUpperCase()} readiness timeout`);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    boot.complete(stage);
  }
  boot.complete("gameplay-ready");
  window.dispatchEvent(new CustomEvent("jc:gameplay-ready", { detail: boot.snapshot() }));
  if (window.requestIdleCallback) window.requestIdleCallback(() => boot.complete("background-streaming"), { timeout: 2000 });
  else setTimeout(() => boot.complete("background-streaming"), 0);
}

async function start() {
  if (!webglAvailable()) return startCompatibility("WEBGL2 UNAVAILABLE");
  await loadRealWorldData();
  try {
    await boot3D();
  } catch (error) {
    boot.fail(error);
    console.error("JC 3D boot failure", error);
    await startCompatibility(error?.message || "3D ENGINE ERROR");
  }
}

start().catch((error) => {
  boot.fail(error);
  console.error("JC startup failure", error);
  startCompatibility(error?.message || "REAL WORLD DATA ERROR").catch(() => fail("STARTUP FAILED — TAP RETRY"));
});

fallbackTimer = setTimeout(() => {
  const loading = document.getElementById("loading");
  if (!window.JC_COMPAT_ACTIVE && getComputedStyle(loading).display !== "none") {
    startCompatibility("3D STARTUP TIMEOUT").catch(() => fail("STILL LOADING — TAP RETRY"));
  }
}, low ? 45000 : 35000);

addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  degrade("webgl-context-loss");
  document.getElementById("loading").style.display = "flex";
  window.JC_GAMEPLAY?.pause(true);
  fail("GRAPHICS RESET — TAP RETRY");
}, true);

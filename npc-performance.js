// Adaptive scheduling for NPC simulation on mobile and desktop.
// Integrate with the existing NPC update loop; does not change rendering or controls.
export function createNpcPerformanceScheduler({
  mobile = false,
  now = () => performance.now(),
  nearDistance = 55,
  midDistance = 180,
  farDistance = 420,
} = {}) {
  const lastUpdates = new Map();
  const config = {
    nearDistance, midDistance, farDistance,
    intervals: mobile ? [50, 180, 800, 3000] : [33, 120, 500, 2000],
  };
  function getTier(distance) {
    const d = Number.isFinite(distance) ? Math.max(0, distance) : Infinity;
    return d <= config.nearDistance ? 0 : d <= config.midDistance ? 1 : d <= config.farDistance ? 2 : 3;
  }
  return {
    getTier,
    shouldUpdate(id, distance, time = now()) {
      if (id == null || !Number.isFinite(time)) return false;
      const tier = getTier(distance);
      const last = lastUpdates.get(id);
      if (!last || time < last.time || tier < last.tier || time - last.time >= config.intervals[tier]) {
        lastUpdates.set(id, {time, tier});
        return true;
      }
      return false;
    },
    remove(id) { lastUpdates.delete(id); },
    clear() { lastUpdates.clear(); },
    get activeCount() { return lastUpdates.size; },
  };
}

// NPC intelligence is advisory. Never block movement, controls, or rendering on a network request.
export function createNpcDecisionQueue({
  endpoint = '/api/npc-chat',
  fetcher = fetch,
  concurrency = 2,
  timeoutMs = 9000,
  cooldownMs = 30000,
  maxQueued = 256,
  maxHistory = 2048,
  now = () => Date.now(),
} = {}) {
  const pending = new Map();
  const lastSent = new Map();
  const queue = [];
  let active = 0;
  const maxConcurrent = Number.isFinite(concurrency) ? Math.max(1, Math.min(4, Math.floor(concurrency))) : 2;
  const requestTimeout = Number.isFinite(timeoutMs) ? Math.max(1, timeoutMs) : 9000;
  const safeCooldown = Number.isFinite(cooldownMs) ? Math.max(0, cooldownMs) : 30000;
  const queueLimit = Number.isFinite(maxQueued) ? Math.max(0, Math.floor(maxQueued)) : 256;
  const historyLimit = Number.isFinite(maxHistory) ? Math.max(0, Math.floor(maxHistory)) : 2048;
  function pump() {
    while (active < maxConcurrent && queue.length) {
      const job = queue.shift();
      if (job.cancelled) { pending.delete(job.id); job.resolve(null); continue; }
      active++;
      const controller = new AbortController();
      let timer;
      const deadline = new Promise(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve(null); }, requestTimeout);
      });
      const response = Promise.resolve().then(() => fetcher(endpoint, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        credentials: 'same-origin',
        signal: controller.signal,
        body: JSON.stringify(job.payload),
      })).then(async result => {
        if (!result?.ok) return null;
        const data = await result.json();
        return typeof data?.reply === 'string' ? data : null;
      }).catch(() => null);
      Promise.race([response, deadline]).then(result => {
        clearTimeout(timer);
        active--;
        if (pending.get(job.id) === job) pending.delete(job.id);
        job.resolve(result);
        pump();
      });
    }
  }
  return {
    request(id, payload) {
      if (id == null || !payload || typeof payload !== 'object') return Promise.resolve(null);
      if (pending.has(id)) return pending.get(id).promise;
      const time = now();
      if (!Number.isFinite(time)) return Promise.resolve(null);
      const previous = lastSent.get(id);
      if (previous !== undefined && time >= previous && time - previous < safeCooldown) return Promise.resolve(null);
      if (active >= maxConcurrent && queue.length >= queueLimit) return Promise.resolve(null);
      if (lastSent.has(id)) lastSent.delete(id);
      if (historyLimit > 0) {
        lastSent.set(id, time);
        while (lastSent.size > historyLimit) lastSent.delete(lastSent.keys().next().value);
      }
      let resolve;
      const promise = new Promise(r => { resolve = r; });
      const job = {id, payload, promise, resolve, cancelled:false};
      pending.set(id, job);
      queue.push(job);
      pump();
      return promise;
    },
    clearQueued() {
      for (const job of queue.splice(0)) { job.cancelled = true; pending.delete(job.id); job.resolve(null); }
    },
    get activeCount() { return active; },
    get queuedCount() { return queue.length; },
  };
}

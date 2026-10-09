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
      if (id == null) return false;
      const tier = getTier(distance);
      const last = lastUpdates.get(id);
      if (!last || time < last.time || time - last.time >= config.intervals[tier]) {
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
  now = () => Date.now(),
} = {}) {
  const pending = new Map();
  const lastSent = new Map();
  const queue = [];
  let active = 0;
  const maxConcurrent = Math.max(1, Math.min(4, Math.floor(concurrency)));
  function pump() {
    while (active < maxConcurrent && queue.length) {
      const job = queue.shift();
      if (job.cancelled) { pending.delete(job.id); job.resolve(null); continue; }
      active++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      fetcher(endpoint, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        credentials: 'same-origin',
        signal: controller.signal,
        body: JSON.stringify(job.payload),
      }).then(async response => {
        if (!response.ok) return null;
        const result = await response.json();
        return typeof result?.reply === 'string' ? result : null;
      }).catch(() => null).then(result => job.resolve(result)).finally(() => {
        clearTimeout(timer);
        active--;
        pending.delete(job.id);
        pump();
      });
    }
  }
  return {
    request(id, payload) {
      if (id == null || !payload || typeof payload !== 'object') return Promise.resolve(null);
      if (pending.has(id)) return pending.get(id).promise;
      const time = now();
      if (time - (lastSent.get(id) ?? -Infinity) < cooldownMs) return Promise.resolve(null);
      lastSent.set(id, time);
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

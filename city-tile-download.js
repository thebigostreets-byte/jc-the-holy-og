// Resumable, bounded offline city tile caching. Never instantiate the whole city in GPU memory.
export function isTileStorageQuotaError(error) {
  return /QuotaExceededError|QUOTA_EXCEEDED_ERR|NS_ERROR_DOM_QUOTA_REACHED/i.test(String(error?.name || ''));
}

export async function cachePackagedCityTiles(tiles, {
  cache,
  baseUrl,
  fetchResponse = fetch,
  signal,
  timeoutMs = 30000,
  maxConsecutiveFailures = 8,
  yieldControl = () => Promise.resolve(),
  onProgress = () => {},
} = {}) {
  if (!cache || typeof cache.match !== 'function' || typeof cache.put !== 'function') {
    throw new TypeError('A Cache Storage cache is required');
  }
  if (!baseUrl) throw new TypeError('baseUrl is required');
  const total = tiles.length;
  let done = 0, cached = 0, alreadyCached = 0, downloaded = 0, failed = 0;
  let consecutiveFailures = 0, stopped = null;
  const report = () => ({done, total, cached, alreadyCached, downloaded, failed, stopped});
  for (const tile of tiles) {
    if (signal?.aborted) { stopped = 'cancelled'; break; }
    // Only cache the known, packaged city 3D file paths, not arbitrary user URLs.
    if (!/^tiles\/C\d{2}_R\d{2}\.glb$/.test(tile?.uri || '')) {
      failed++;
      consecutiveFailures++;
    } else {
      const url = new URL('./' + tile.uri + '.gz', baseUrl).href;
      try {
        if (await cache.match(url)) {
          cached++;
          alreadyCached++;
          consecutiveFailures = 0;
        } else {
          if (signal?.aborted) { stopped = 'cancelled'; break; }
          const request = new AbortController();
          const abort = () => request.abort();
          signal?.addEventListener('abort', abort, {once: true});
          if (signal?.aborted) abort();
          const timer = setTimeout(abort, timeoutMs);
          try {
            const response = await fetchResponse(url, {signal: request.signal, cache: 'no-store'});
            if (!response?.ok) throw new Error('HTTP ' + (response?.status ?? 'unknown'));
            if (signal?.aborted) { stopped = 'cancelled'; break; }
            await cache.put(url, response);
          } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
          }
          cached++;
          downloaded++;
          consecutiveFailures = 0;
        }
      } catch (error) {
        if (signal?.aborted) { stopped = 'cancelled'; break; }
        failed++;
        consecutiveFailures++;
        if (isTileStorageQuotaError(error)) stopped = 'storage';
      }
    }
    done++;
    if (!stopped && consecutiveFailures >= maxConsecutiveFailures) stopped = 'network';
    if (done % 4 === 0 || stopped || done === total) {
      onProgress(report());
      if (!stopped) await yieldControl();
    }
    if (stopped) break;
  }
  if (signal?.aborted && !stopped) stopped = 'cancelled';
  onProgress(report());
  return report();
}

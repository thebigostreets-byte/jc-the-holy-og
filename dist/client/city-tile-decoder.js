let decoder;

// Validate the GLB container before sending bytes to the geometry parser.
export function isGlb(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 20) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declaredLength = view.getUint32(8, true);
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(0, true) !== 0x46546c67
      || view.getUint32(4, true) !== 2
      || declaredLength !== bytes.byteLength
      || jsonLength === 0
      || jsonLength % 4 !== 0
      || view.getUint32(16, true) !== 0x4e4f534a
      || jsonLength > declaredLength - 20) return false;
  // Walk optional BIN/extension chunks to reject truncated or overflowing tiles.
  for (let offset = 20 + jsonLength; offset < declaredLength;) {
    if (declaredLength - offset < 8) return false;
    const chunkLength = view.getUint32(offset, true);
    if (chunkLength % 4 !== 0 || chunkLength > declaredLength - offset - 8) return false;
    offset += 8 + chunkLength;
  }
  return true;
}

export async function decodeCityTile(bytes) {
  if (isGlb(bytes)) return bytes;
  if (!(bytes instanceof Uint8Array) || !bytes.byteLength) {
    throw new Error('City tile response is empty or invalid.');
  }
  decoder ??= import('./vendor/brotli/brotli_dec_wasm.js')
    .then(async module => { await module.default(); return module; })
    .catch(error => {
      // A transient import/WASM initialization failure must not poison all future tiles.
      decoder = undefined;
      throw error;
    });
  let decoded;
  try {
    decoded = (await decoder).decompress(bytes);
  } catch (error) {
    throw new Error('City tile decoding failed: ' + (error?.message || String(error)));
  }
  if (!isGlb(decoded)) throw new Error('City tile response is not valid 3D data.');
  return decoded;
}

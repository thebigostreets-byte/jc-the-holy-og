import * as THREE from './three.module.js';
import { photoCutoutAsset, isPhotoCutoutView } from './photo-cutout-rules.js';
export { photoCutoutAsset, isPhotoCutoutView } from './photo-cutout-rules.js';

// Photo cutouts are a distant visual LOD. The source GLB remains authoritative
// for the building footprint, close views, selection, and collision.

export function createPhotoCutoutLod(game, { mobile = false, enabled = true } = {}) {
  const { scene, camera, buildings, chunks, edits } = game;
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const records = new Map();
  const direction = new THREE.Vector3();
  const front = new THREE.Vector3(0, 0, 1);
  let nextScan = 0;
  let nextUpdate = 0;
  let disposed = false;

  function textureFor(asset) {
    if (!textures.has(asset)) {
      textures.set(asset, loader.loadAsync(asset).then(texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
      }).catch(error => {
        textures.delete(asset);
        console.warn('Building cutout unavailable; original geometry retained', error);
        return null;
      }));
    }
    return textures.get(asset);
  }

  function release(record) {
    if (record.hidden) record.ob.visible = true;
    scene.remove(record.card);
    record.card.geometry.dispose();
    record.card.material.dispose();
    records.delete(record.asset);
  }

  async function prepare(asset, ob) {
    if (records.has(asset) || disposed) return;
    const texture = await textureFor(asset);
    if (!texture || disposed || !enabled || records.has(asset) || buildings.get(ob.userData.buildingId) !== ob) return;
    const bounds = new THREE.Box3().setFromObject(ob);
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const height = Math.max(1, size.y);
    const aspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1.5;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.025,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    card.name = `Photo cutout · ${asset}`;
    card.scale.set(height * aspect, height, 1);
    card.position.set(center.x, bounds.min.y + height / 2, center.z);
    card.renderOrder = 2;
    card.visible = false;
    scene.add(card);
    records.set(asset, { asset, ob, card, height, hidden: false });
  }

  function selectTargets() {
    const best = new Map();
    for (const [id, ob] of buildings) {
      if (!ob || chunks.has(id) || !ob.userData.identity) continue;
      const asset = photoCutoutAsset(ob.userData.identity);
      if (!asset) continue;
      const existing = records.get(asset);
      if (!ob.visible && existing?.ob !== ob) continue;
      const edit = edits.get(id);
      if (edit && (edit.wallColor || edit.roofColor || edit.state || edit.surface === 'plain')) continue;
      const old = best.get(asset);
      if (!old || (ob.userData.heightMetres || 0) > (old.ob.userData.heightMetres || 0)) best.set(asset, { id, ob });
    }
    for (const [asset, record] of records) {
      if (best.get(asset)?.ob !== record.ob) release(record);
    }
    const limit = mobile ? 1 : 2;
    const ordered = [...best.entries()].sort(([a], [b]) => Number(b.includes('blood-bay')) - Number(a.includes('blood-bay')));
    for (const [asset, target] of ordered.slice(0, limit)) {
      const existing = records.get(asset);
      if (!existing || existing.ob !== target.ob) prepare(asset, target.ob);
    }
  }

  function update(now, _dt, playing = true) {
    if (disposed) return;
    if (!enabled) {
      for (const record of records.values()) {
        if (record.hidden) record.ob.visible = true;
        record.hidden = false;
        record.card.visible = false;
      }
      return;
    }
    if (now >= nextScan) {
      nextScan = now + 1100;
      selectTargets();
    }
    if (now < nextUpdate) return;
    nextUpdate = now + 120;
    const rendererCutouts = !!game.buildingViews?.stats?.().enabled;
    for (const record of records.values()) {
      const { ob, card, height } = record;
      if (!playing || rendererCutouts || buildings.get(ob.userData.buildingId) !== ob || chunks.has(ob.userData.buildingId) || (!ob.visible && !record.hidden)) {
        if (record.hidden) ob.visible = true;
        record.hidden = false;
        card.visible = false;
        continue;
      }
      const center = new THREE.Box3().setFromObject(ob).getCenter(new THREE.Vector3());
      direction.subVectors(camera.position, center);
      const distance = direction.length();
      if (!isPhotoCutoutView(direction.x, direction.z, distance, height)) {
        if (record.hidden) ob.visible = true;
        record.hidden = false;
        card.visible = false;
        continue;
      }
      const edit = edits.get(ob.userData.buildingId);
      if (edit && (edit.wallColor || edit.roofColor || edit.state || edit.surface === 'plain')) {
        if (record.hidden) ob.visible = true;
        record.hidden = false;
        card.visible = false;
        continue;
      }
      direction.y = 0;
      if (direction.lengthSq() < 0.001) direction.set(1, 0, 1);
      direction.normalize();
      card.quaternion.setFromUnitVectors(front, direction);
      card.visible = true;
      ob.visible = false;
      record.hidden = true;
    }
  }

  return {
    update,
    stats: () => ({ enabled, cutouts: records.size, visible: [...records.values()].filter(record => record.hidden).length, assets: [...records.keys()] }),
    setEnabled(value) {
      enabled = !!value;
      if (!enabled) for (const record of records.values()) { if (record.hidden) record.ob.visible = true; record.hidden = false; record.card.visible = false; }
    },
    dispose() {
      disposed = true;
      for (const record of [...records.values()]) release(record);
      for (const promise of textures.values()) promise.then(texture => texture?.dispose());
      textures.clear();
    }
  };
}

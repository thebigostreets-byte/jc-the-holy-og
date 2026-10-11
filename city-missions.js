import * as THREE from './three.module.js';

const templates = [
  { title: 'Street-side triage', instruction: 'Heal the injured resident', powers: ['heal', 'restore'], reward: 25 },
  { title: 'A safe place', instruction: 'Protect the frightened resident with Shield or Sanctuary', powers: ['shield', 'sanctuary'], reward: 30 },
  { title: 'Hope on the Strip', instruction: 'Bless the doubtful resident', powers: ['bless', 'redemption-wave'], reward: 35 }
];
const MAX_SAVED_RESCUES = 1000000000;
const safeTime = () => {
  try { const value = performance.now(); return Number.isFinite(value) ? value : 0; }
  catch { return 0; }
};
const safeDistance = (a, b) => {
  if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z)
      || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.z)) return Infinity;
  const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  return Number.isFinite(distance) ? distance : Infinity;
};

export function createCityMissions({ scene, player, npcs, population, onReward = () => {} }) {
  const panel = document.createElement('div');
  panel.id = 'jcMissionPanel';
  panel.className = 'jc-mission-panel';
  panel.style.cssText = 'position:fixed;left:176px;top:150px;z-index:45;max-width:245px;background:#101728d9;color:#fff;border:1px solid #dfbc70;border-radius:12px;padding:10px;font:13px system-ui;pointer-events:auto';
  const text = document.createElement('div'), button = document.createElement('button');
  button.textContent = 'START RESCUE';
  button.style.cssText = 'margin-top:8px;padding:8px;border-radius:8px;background:#e7c579;color:#201c14;border:0';
  panel.append(text, button);
  document.body.append(panel);
  const marker = new THREE.Mesh(new THREE.TorusGeometry(1.4, .055, 5, 32), new THREE.MeshBasicMaterial({ color: 0xffd376, toneMapped: false }));
  marker.rotation.x = Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  let active = null, completed = 0, next = 0, last = 0, disposed = false;
  try {
    const stored = Number(localStorage.getItem('jc-rescues'));
    if (Number.isSafeInteger(stored) && stored >= 0) completed = Math.min(stored, MAX_SAVED_RESCUES);
  } catch {}

  function cancelActive() {
    if (active?.target) active.target.missionHeld = false;
    active = null;
    marker.visible = false;
    button.hidden = false;
  }

  function start() {
    if (disposed || active) return false;
    const candidates = (Array.isArray(npcs) ? npcs : []).filter(n =>
      n && n.faction === 'civilian' && !n.collapse && !n.missionHeld
      && n.position && n.target && typeof n.target.copy === 'function'
      && safeDistance(n.position, player?.position) < 180
    );
    if (!candidates.length) {
      text.textContent = 'Move closer to residents to find a rescue.';
      return false;
    }
    const target = candidates[(completed * 13) % candidates.length];
    const mission = templates[completed % templates.length];
    // Establish the NPC's hold only after all required state is validated.
    try { target.target.copy(target.position); }
    catch { text.textContent = 'Move closer to residents to find a rescue.'; return false; }
    active = { ...mission, target };
    target.missionHeld = true;
    target.state = completed % 3 === 0 ? 'injured' : 'fear';
    if (completed % 3 === 0) target.health = 25;
    text.textContent = `${mission.title}: ${mission.instruction}`;
    button.hidden = true;
    marker.visible = true;
    return true;
  }
  button.onclick = start;

  function usePower(id) {
    if (disposed || !active || !active.powers.includes(id)) return false;
    const { target, reward } = active;
    if (safeDistance(target?.position, player?.position) > 80) return false;
    target.health = 100;
    target.protected = true;
    target.state = 'awe';
    target.emotionUntil = safeTime() + 7000;
    cancelActive();
    completed = Math.min(MAX_SAVED_RESCUES, completed + 1);
    try { localStorage.setItem('jc-rescues', String(completed)); } catch {}
    // Optional NPC services and reward callbacks must not prevent mission completion.
    try { population?.remember?.(target, 'rescued'); } catch {}
    try { population?.influence?.(target, 'jesus', true); } catch {}
    try { onReward(reward); } catch {}
    text.textContent = `RESIDENT SAVED · +${reward} grace · ${completed} rescues`;
    button.hidden = true;
    next = safeTime() + 6500;
    return true;
  }

  function update(now, visible) {
    if (disposed) return;
    panel.hidden = !visible;
    marker.visible = !!active && !!visible;
    if (!visible) return;
    const timestamp = Number.isFinite(now) ? now : safeTime();
    if (active) {
      const distance = safeDistance(player?.position, active.target?.position);
      if (!Number.isFinite(distance)) {
        cancelActive();
        text.textContent = 'Rescue target unavailable. Select another resident.';
        return;
      }
      marker.position.copy(active.target.position);
      marker.position.y -= 1.45;
      if (timestamp < last || timestamp - last > 250) {
        last = timestamp;
        text.textContent = `${active.title} · ${Math.round(distance)}m\n${active.instruction}`;
      }
    } else if (timestamp > next) {
      button.hidden = false;
      text.textContent = `CITY RESCUES · ${completed} saved`;
    }
  }

  function dispose() {
    if (disposed) return;
    cancelActive();
    disposed = true;
    button.onclick = null;
    panel.remove();
    scene.remove(marker);
    marker.geometry.dispose();
    marker.material.dispose();
  }

  return { usePower, update, start, dispose };
}

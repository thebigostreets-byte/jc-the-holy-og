(() => {
  let messageTimer;
  function message(value) {
    let node = document.getElementById('displayMessage');
    if (!node) { node = document.createElement('div'); node.id = 'displayMessage'; node.setAttribute('role', 'status'); document.body.appendChild(node); }
    node.textContent = value; node.hidden = false; clearTimeout(messageTimer); messageTimer = setTimeout(() => { node.hidden = true; }, 5000);
  }
  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else { message('This browser already uses the full page. Rotate your phone for a wider view.'); return; }
    } catch { message('Fullscreen is unavailable in this window. Open the game directly for the largest view.'); }
  }
  document.querySelectorAll('[data-fullscreen]').forEach(button => button.addEventListener('click', toggle));
  document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('[data-fullscreen]').forEach(button => { button.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
    window.dispatchEvent(new Event('resize'));
  });
  window.visualViewport?.addEventListener('resize', () => window.dispatchEvent(new Event('resize')));
  window.JC_DISPLAY = { toggleFullscreen: toggle, message };
})();

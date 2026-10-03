// Select a working graphics API before booting the shared JC scene.
// A canvas cannot switch API after a context has been created, so if Three.js
// cannot initialize an acquired WebGL 2 context, retry WebGL 1 on a new canvas.
export function createCompatibleRenderer(THREE, initialCanvas, attributes) {
  const failures = [];
  let canvas = initialCanvas;

  function attempt(type) {
    let context;
    try {
      context = canvas.getContext(type, attributes);
    } catch (error) {
      failures.push(`${type}: ${error?.message || 'context request failed'}`);
      return { contextAcquired: true, renderer: null };
    }
    if (!context) {
      failures.push(`${type}: unavailable`);
      return { contextAcquired: false, renderer: null };
    }
    try {
      return {
        contextAcquired: true,
        renderer: new THREE.WebGLRenderer({ canvas, context, ...attributes }),
      };
    } catch (error) {
      failures.push(`${type}: ${error?.message || 'renderer initialization failed'}`);
      return { contextAcquired: true, renderer: null };
    }
  }

  function freshCanvas() {
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
  }

  let result = attempt('webgl2');
  if (result.renderer) return { canvas, renderer: result.renderer };
  if (result.contextAcquired) freshCanvas();

  result = attempt('webgl');
  if (result.renderer) return { canvas, renderer: result.renderer };
  if (result.contextAcquired) freshCanvas();

  result = attempt('experimental-webgl');
  if (result.renderer) return { canvas, renderer: result.renderer };

  throw new Error(`Could not start WebGL 2 or WebGL 1. ${failures.join(' | ')}`);
}

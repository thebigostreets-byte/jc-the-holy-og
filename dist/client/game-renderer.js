function attributesOf(canvas, attributes, context) {
  return { canvas, ...attributes, context };
}

function replacementCanvas(canvas) {
  const doc = canvas.ownerDocument || globalThis.document;
  if (!doc?.createElement) return canvas.cloneNode(false);
  const replacement = doc.createElement('canvas');
  for (const attribute of [...(canvas.attributes || [])]) {
    replacement.setAttribute(attribute.name, attribute.value);
  }
  replacement.width = canvas.width;
  replacement.height = canvas.height;
  replacement.className = canvas.className;
  replacement.style.cssText = canvas.style?.cssText || '';
  canvas.parentNode?.replaceChild(replacement, canvas);
  return replacement;
}

/**
 * Start the Three.js renderer with WebGL 2 and retry WebGL 1 on a fresh canvas
 * if the browser or Three.js cannot initialize the preferred context.
 */
export function createCompatibleRenderer(THREE, canvas, contextAttributes = {}) {
  if (!THREE?.WebGLRenderer || !canvas?.getContext) {
    throw new TypeError('Three.js WebGLRenderer and a canvas are required.');
  }

  let webgl2Error;
  let webgl2 = null;
  try {
    webgl2 = canvas.getContext('webgl2', contextAttributes);
    if (webgl2) {
      const renderer = new THREE.WebGLRenderer(attributesOf(canvas, contextAttributes, webgl2));
      return { renderer, canvas, context: webgl2, api: 'WebGL 2' };
    }
  } catch (error) {
    webgl2Error = error;
  }

  // A canvas is locked to the first context type it successfully creates.
  // Replacing it is required if WebGL 2 existed but Three.js rejected it.
  const target = webgl2 ? replacementCanvas(canvas) : canvas;
  let webgl1 = null;
  try {
    webgl1 = target.getContext('webgl', contextAttributes)
      || target.getContext('experimental-webgl', contextAttributes);
    if (!webgl1) throw new Error('WebGL 1 context creation returned null.');
    const renderer = new THREE.WebGLRenderer(attributesOf(target, contextAttributes, webgl1));
    return { renderer, canvas: target, context: webgl1, api: 'WebGL 1' };
  } catch (webgl1Error) {
    const details = [webgl2Error, webgl1Error].filter(Boolean).map(error => error.message || String(error));
    throw new Error('WebGL 2 and WebGL 1 could not initialize. ' + details.join(' | '), { cause: webgl1Error });
  }
}

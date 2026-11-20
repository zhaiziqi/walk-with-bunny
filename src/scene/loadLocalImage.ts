/** Optional artwork must never keep a scene waiting or commit after cancellation. */
export function loadLocalImage(url: string, timeoutMs = 15000) {
  let finish: (image: HTMLImageElement | null) => void = () => {};
  const image = new Image();
  let settled = false;
  const promise = new Promise<HTMLImageElement | null>(resolve => {
    const timeout = window.setTimeout(() => finish(null), timeoutMs);
    finish = value => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (!value) image.removeAttribute('src');
      resolve(value);
    };
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null);
    image.onerror = () => finish(null);
    try { image.src = url; }
    catch { finish(null); }
  });
  return { promise, cancel: () => finish(null) };
}

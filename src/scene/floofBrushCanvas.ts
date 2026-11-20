/** A reusable brush substrate, not a landscape image: all colour and landforms live in world space. */
export function createFloofBrushCanvas() {
  const side = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, side, side);

  let seed = 810731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Broken edges and trailing bristles leave the small, irregular gaps of dry gouache.
  // Every mark is wrapped at the tile edges; the shader samples two incommensurate scales.
  for (let i = 0; i < 2700; i++) {
    const x = random() * side, y = random() * side;
    const length = 20 + random() ** 2 * 120, width = 4 + random() * 24;
    const angle = -.42 + (random() - .5) * .72;
    const light = random() > .46;
    const level = light ? 155 + Math.floor(random() * 55) : 40 + Math.floor(random() * 50);
    const alpha = .12 + random() * .32;
    const edge = Array.from({ length: 16 }, () => .54 + random() * .46);
    const xs = x < length ? [x, x + side] : x > side - length ? [x, x - side] : [x];
    const ys = y < length ? [y, y + side] : y > side - length ? [y, y - side] : [y];
    for (const px of xs) for (const py of ys) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(${level},${level},${level},${alpha})`;
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const xx = (j / 7 - .5) * length;
        const yy = -width * .5 * edge[j];
        if (!j) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      for (let j = 7; j >= 0; j--) ctx.lineTo((j / 7 - .5) * length, width * .5 * edge[8 + j]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(${level},${level},${level},${alpha * .7})`;
      ctx.lineWidth = .7;
      for (let j = 0; j < 4; j++) {
        const yy = (j / 3 - .5) * width * .75;
        ctx.beginPath();
        ctx.moveTo(-length * .65 * edge[j], yy);
        ctx.lineTo(length * .67 * edge[j + 4], yy + edge[j] * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Short opaque scumbles give the broad wash a broken, painted edge instead of a blurred fabric grain.
  for (let i = 0; i < 1850; i++) {
    const x = random() * side, y = random() * side;
    const length = 5 + random() * 29, width = 2 + random() * 9;
    const level = random() > .55 ? 178 + random() * 53 : 47 + random() * 58;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.5 + random() * .48);
    ctx.fillStyle = `rgba(${level},${level},${level},${.17 + random() * .34})`;
    ctx.beginPath(); ctx.moveTo(-length / 2, -width / 3);
    for (let j = 0; j < 6; j++) ctx.lineTo(-length / 2 + j * length / 5, -width * (.2 + random() * .5));
    for (let j = 5; j >= 0; j--) ctx.lineTo(-length / 2 + j * length / 5, width * (.1 + random() * .5));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // Small pigment pockets are low contrast, so the surface stays calm at desktop scale.
  const pixels = ctx.getImageData(0, 0, side, side);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (random() - .5) * 13;
    const value = Math.max(0, Math.min(255, pixels.data[i] + grain));
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export type FloofArt = Record<'leaf' | 'flower' | 'lantern' | 'door', HTMLCanvasElement>;
let cache: FloofArt | undefined;

function surface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function pigment(ctx: CanvasRenderingContext2D, seed: number, strokes = 850) {
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const { width, height } = ctx.canvas;
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < strokes; i++) {
    const x = random() * width, y = random() * height, light = random() > .46;
    ctx.strokeStyle = light ? `rgba(255,251,224,${.035 + random() * .10})` : `rgba(45,62,68,${.025 + random() * .09})`;
    ctx.lineWidth = .7 + random() * 3.1;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + 3 + random() * 21, y - 2 - random() * 11); ctx.stroke();
  }
  ctx.restore();
  const image = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    if (!image.data[i + 3]) continue;
    const grain = (random() - .5) * 14;
    image.data[i] += grain; image.data[i + 1] += grain; image.data[i + 2] += grain;
    image.data[i + 3] *= .93 + random() * .07;
  }
  ctx.putImageData(image, 0, 0);
}

function leafArt() {
  const { canvas, ctx } = surface(768, 640);
  // Individual rounded leaves grow from different feet. The cluster has a loose
  // overlapping contour, rather than one radial, spiky succulent silhouette.
  const leaves = [
    [56, 623, -14, 375, 138], [156, 620, 118, 182, 162],
    [275, 613, 309, 270, 145], [413, 627, 462, 163, 151],
    [514, 615, 666, 284, 153], [670, 626, 770, 418, 120],
    [144, 627, 257, 451, 147], [356, 631, 222, 406, 126],
    [503, 628, 565, 409, 146], [653, 633, 544, 487, 113],
  ];
  leaves.forEach(([x, y, tx, ty, spread], i) => {
    const layer = surface(canvas.width, canvas.height), leaf = layer.ctx;
    const length = Math.hypot(tx - x, ty - y);
    let seed = 1871 + i * 2903;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    leaf.translate(x, y); leaf.rotate(Math.atan2(ty - y, tx - x) + Math.PI / 2);
    const trace = () => {
      leaf.beginPath(); leaf.moveTo(0, 0);
      leaf.bezierCurveTo(-spread * .30, -length * .17, -spread * .58, -length * .68, -spread * .34, -length * .88);
      leaf.bezierCurveTo(-spread * .18, -length * 1.02, spread * .16, -length * 1.01, spread * .34, -length * .84);
      leaf.bezierCurveTo(spread * .59, -length * .59, spread * .36, -length * .18, 0, 0);
      leaf.closePath();
    };
    trace(); leaf.fillStyle = ['#bdc9ce', '#a4b5c0', '#c3cbd2', '#b2bccb', '#c6c7d4'][i % 5]; leaf.fill();
    leaf.save(); leaf.clip();
    // Broken blue-grey and lavender daubs, without a central vein or smooth highlight.
    for (let j = 0; j < 65; j++) {
      const px = (random() - .5) * spread * 1.1, py = -(random() * .9 + .05) * length;
      leaf.strokeStyle = j % 3 ? `rgba(225,215,241,${.10 + random() * .22})` : `rgba(111,144,165,${.09 + random() * .23})`;
      leaf.lineWidth = 1.5 + random() * 7;
      leaf.beginPath(); leaf.moveTo(px, py); leaf.lineTo(px + 3 + random() * 9, py - 6 - random() * 27); leaf.stroke();
    }
    leaf.restore();
    // Erode only this leaf's rim with short dry-brush breaks, preserving the leaves below it.
    const edge = [[0, 0], [-spread * .30, -length * .17], [-spread * .58, -length * .68], [-spread * .34, -length * .88],
      [-spread * .18, -length * 1.02], [spread * .16, -length * 1.01], [spread * .34, -length * .84],
      [spread * .59, -length * .59], [spread * .36, -length * .18], [0, 0]];
    leaf.globalCompositeOperation = 'destination-out'; leaf.strokeStyle = 'rgba(0,0,0,.68)';
    for (let segment = 0; segment < 3; segment++) for (let j = 0; j < 28; j++) {
      const t = j / 27, u = 1 - t, k = segment * 3;
      const px = edge[k][0] * u ** 3 + edge[k + 1][0] * 3 * u * u * t + edge[k + 2][0] * 3 * u * t * t + edge[k + 3][0] * t ** 3;
      const py = edge[k][1] * u ** 3 + edge[k + 1][1] * 3 * u * u * t + edge[k + 2][1] * 3 * u * t * t + edge[k + 3][1] * t ** 3;
      leaf.lineWidth = 1.2 + random() * 3.3;
      leaf.beginPath(); leaf.moveTo(px - 2, py + random() * 3); leaf.lineTo(px + 3, py - 4 - random() * 7); leaf.stroke();
    }
    ctx.drawImage(layer.canvas, 0, 0);
  });
  pigment(ctx, 8181, 1750);
  return canvas;
}

function flowerArt() {
  const { canvas, ctx } = surface(320, 480);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#7f9876'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(165, 461); ctx.bezierCurveTo(177, 358, 140, 279, 143, 164); ctx.stroke();
  ctx.fillStyle = '#9ba77c';
  ctx.beginPath(); ctx.moveTo(159, 339); ctx.bezierCurveTo(190, 298, 217, 310, 230, 290); ctx.bezierCurveTo(215, 346, 183, 345, 159, 339); ctx.fill();
  ctx.fillStyle = '#7d9b81';
  ctx.beginPath(); ctx.moveTo(164, 378); ctx.bezierCurveTo(135, 350, 107, 368, 94, 336); ctx.bezierCurveTo(108, 381, 144, 389, 164, 378); ctx.fill();
  ctx.fillStyle = '#e3adae';
  ctx.beginPath(); ctx.moveTo(146, 178); ctx.bezierCurveTo(110, 169, 71, 148, 77, 115); ctx.bezierCurveTo(86, 91, 128, 116, 148, 151); ctx.fill();
  ctx.fillStyle = '#efc0b6';
  ctx.beginPath(); ctx.moveTo(149, 174); ctx.bezierCurveTo(116, 143, 112, 93, 134, 68); ctx.bezierCurveTo(160, 48, 173, 125, 153, 170); ctx.fill();
  ctx.fillStyle = '#e8b9b0';
  ctx.beginPath(); ctx.moveTo(149, 174); ctx.bezierCurveTo(143, 135, 174, 96, 194, 97); ctx.bezierCurveTo(228, 111, 190, 165, 149, 174); ctx.fill();
  ctx.fillStyle = '#e7d0a1'; ctx.beginPath(); ctx.ellipse(148, 170, 8, 5, -.4, 0, Math.PI * 2); ctx.fill();
  pigment(ctx, 7071, 700);
  return canvas;
}

function lanternArt() {
  const { canvas, ctx } = surface(384, 512);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#6c817a'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(162, 489); ctx.bezierCurveTo(163, 371, 155, 187, 164, 87);
  ctx.bezierCurveTo(169, 31, 242, 35, 242, 105); ctx.stroke();
  ctx.strokeStyle = '#8e977c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(158, 481); ctx.bezierCurveTo(161, 322, 151, 209, 164, 90); ctx.stroke();
  ctx.strokeStyle = '#7c8674'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(241, 101); ctx.lineTo(240, 133); ctx.stroke();
  ctx.fillStyle = '#ac9974'; ctx.beginPath(); ctx.moveTo(201, 151); ctx.quadraticCurveTo(215, 135, 239, 128); ctx.quadraticCurveTo(260, 137, 276, 153); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e9cb8f'; ctx.beginPath(); ctx.moveTo(206, 153); ctx.lineTo(273, 154); ctx.lineTo(263, 242); ctx.quadraticCurveTo(239, 254, 216, 241); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f6e5b3'; ctx.beginPath(); ctx.moveTo(219, 165); ctx.lineTo(259, 165); ctx.lineTo(252, 232); ctx.quadraticCurveTo(239, 240, 226, 230); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff1ca'; ctx.beginPath(); ctx.ellipse(239, 206, 9, 24, .08, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a59875'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(208, 157); ctx.lineTo(217, 240); ctx.quadraticCurveTo(240, 255, 264, 241); ctx.lineTo(273, 158); ctx.stroke();
  ctx.fillStyle = '#819082'; ctx.beginPath(); ctx.ellipse(162, 486, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
  pigment(ctx, 5171, 1100);
  return canvas;
}

function doorArt() {
  const { canvas, ctx } = surface(480, 640);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const arch = () => {
    ctx.beginPath(); ctx.moveTo(102, 612); ctx.lineTo(102, 254);
    ctx.bezierCurveTo(105, 71, 366, 64, 370, 254); ctx.lineTo(370, 612); ctx.closePath();
  };
  arch(); ctx.fillStyle = '#526e75'; ctx.fill();
  ctx.strokeStyle = '#9aa9a3'; ctx.lineWidth = 25; ctx.stroke();
  ctx.save(); arch(); ctx.clip();
  ctx.fillStyle = '#a7b4ac'; ctx.fillRect(123, 112, 220, 505);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = i % 2 ? '#849a93' : '#c0c6b2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(142 + i * 42, 132); ctx.bezierCurveTo(139 + i * 42, 280, 145 + i * 42, 425, 142 + i * 42, 611); ctx.stroke();
  }
  ctx.fillStyle = '#f1dab0'; ctx.fillRect(335, 223, 8, 387);
  ctx.restore();
  ctx.fillStyle = '#657f7d'; ctx.beginPath(); ctx.ellipse(284, 418, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c5c3a8'; ctx.beginPath(); ctx.moveTo(86, 611); ctx.lineTo(382, 611); ctx.lineTo(405, 626); ctx.lineTo(70, 626); ctx.closePath(); ctx.fill();
  pigment(ctx, 1971, 1800);
  return canvas;
}

/** Original painted silhouettes shared by WebGL and the accessible static fallback. */
export function createFloofArt(): FloofArt {
  return cache ??= { leaf: leafArt(), flower: flowerArt(), lantern: lanternArt(), door: doorArt() };
}

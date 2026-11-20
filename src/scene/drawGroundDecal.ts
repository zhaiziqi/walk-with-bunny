type Point = { x: number; y: number; depth: number };
type ImageSource = HTMLImageElement | HTMLCanvasElement;
type Decal = { x: number; y: number; width: number; height: number; rotation?: number; z: (x: number, y: number) => number };

/** Paint an actual ground plane, rather than standing the texture up like a plant sprite. */
export function drawGroundDecal(ctx: CanvasRenderingContext2D, image: ImageSource, decal: Decal,
  project: (x: number, y: number, z: number) => Point, width: number, height: number, columns = 12, rows = 10) {
  const imageWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const imageHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  if (!imageWidth || !imageHeight) return;
  const angle = decal.rotation ?? 0, cos = Math.cos(angle), sin = Math.sin(angle);
  const vertices = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, col) => {
    const px = (col / columns - .5) * decal.width, py = (.5 - row / rows) * decal.height;
    const x = decal.x + px * cos - py * sin, y = decal.y + px * sin + py * cos;
    return { ...project(x, y, decal.z(x, y)), u: col / columns * imageWidth, v: row / rows * imageHeight };
  }));
  type Vertex = typeof vertices[number][number];
  const triangle = (a: Vertex, b: Vertex, c: Vertex) => {
    if (Math.min(a.depth, b.depth, c.depth) < 1 || Math.max(a.x,b.x,c.x) < 0 || Math.min(a.x,b.x,c.x) > width
      || Math.max(a.y,b.y,c.y) < 0 || Math.min(a.y,b.y,c.y) > height) return;
    const du1 = b.u-a.u, dv1 = b.v-a.v, du2 = c.u-a.u, dv2 = c.v-a.v, det = du1*dv2-du2*dv1;
    if (Math.abs(det) < 1e-6) return;
    const ax = ((b.x-a.x)*dv2-(c.x-a.x)*dv1)/det, bx = ((c.x-a.x)*du1-(b.x-a.x)*du2)/det;
    const ay = ((b.y-a.y)*dv2-(c.y-a.y)*dv1)/det, by = ((c.y-a.y)*du1-(b.y-a.y)*du2)/det;
    ctx.save(); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.closePath(); ctx.clip();
    ctx.transform(ax,ay,bx,by,a.x-ax*a.u-bx*a.v,a.y-ay*a.u-by*a.v);
    ctx.drawImage(image,0,0); ctx.restore();
  };
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const a=vertices[row][col],b=vertices[row][col+1],c=vertices[row+1][col+1],d=vertices[row+1][col];
    triangle(a,b,c); triangle(a,c,d);
  }
}

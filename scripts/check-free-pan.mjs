import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { HOME_POSE, dragJourney, wheelJourney, wheelPixels, keyJourney } from '../src/scene/journey.ts';
import { backdropFrame, cameraFrame, constrainPose, panBounds, project, objects } from '../src/scene/world.ts';

let failures = 0;
function check(name, run) {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.message}`); }
}
const near = (a, b, label = '') => assert.ok(Math.abs(a - b) < 1e-7, `${label}: ${a} != ${b}`);
const same = (a, b) => { near(a.x, b.x, 'x'); near(a.y, b.y, 'y'); near(a.zoom, b.zoom, 'zoom'); };
const viewports = [[1440, 900], [390, 844], [320, 568], [844, 480]];

check('horizontal, vertical and diagonal drags are independent and follow the hand', () => {
  const origin = { x: 20, y: -30, zoom: 1.2 };
  same(dragJourney(origin, 100, 0, .5), { x: -180, y: -30, zoom: 1.2 });
  same(dragJourney(origin, 0, 100, .5), { x: 20, y: 170, zoom: 1.2 });
  same(dragJourney(origin, 100, -60, .5), { x: -180, y: -150, zoom: 1.2 });
  same(origin, { x: 20, y: -30, zoom: 1.2 });
});

check('a four-direction loop and an immediate reverse restore the full position', () => {
  const origin = { x: 40, y: 70, zoom: 1.15 };
  let current = origin;
  for (const [dx, dy] of [[70, 110], [-70, 0], [0, -110]]) current = dragJourney(current, dx, dy, .8);
  same(current, origin);
  same(dragJourney(dragJourney(origin, 123, -91, .8), -123, 91, .8), origin);
});

check('clamped boundary overshoot creates no dead zone when the next movement reverses', () => {
  for (const [width, height] of viewports) {
    const bounds = panBounds(width, height);
    const edge = { x: bounds.x, y: bounds.y, zoom: 1 };
    const scale = cameraFrame(edge, width, height).scale;
    const outside = constrainPose(dragJourney(edge, -1200, 1200, scale), width, height);
    same(outside, edge);
    const reversed = constrainPose(dragJourney(outside, 8, -8, scale), width, height);
    assert.ok(reversed.x < edge.x && reversed.y < edge.y, 'reversing by 8px must immediately leave both bounds');
  }
});

check('the visible ground follows a diagonal pointer by the exact CSS displacement', () => {
  for (const [width, height] of viewports) {
    const start = { ...HOME_POSE };
    const scale = cameraFrame(start, width, height).scale;
    const next = constrainPose(dragJourney(start, 90, 70, scale), width, height);
    const before = project(20, 30, start, width, height);
    const after = project(20, 30, next, width, height);
    near(after.x - before.x, 90, 'horizontal hand tracking');
    near(after.y - before.y, 70, 'vertical hand tracking');
  }
});

check('projected backdrop corners cover the viewport at center, edges and extreme diagonal poses', () => {
  const backgroundViewports = [...viewports, [768, 1024], [1920, 1080], [2560, 1080]];
  for (const [width, height] of backgroundViewports) for (const zoom of [.85, 1, 1.22, 1.45]) {
    for (const x of [-1e6, 0, 1e6]) for (const y of [-1e6, 0, 1e6]) {
      const pose = constrainPose({ x, y, zoom }, width, height);
      const backdrop = backdropFrame(pose, width, height);
      const label = `${width}×${height}, zoom ${zoom}, camera (${pose.x}, ${pose.y})`;
      for (const horizontal of [-1, 1]) for (const vertical of [-1, 1]) {
        const corner = project(
          backdrop.x + horizontal * backdrop.width / 2,
          backdrop.y + vertical * backdrop.height / 2,
          pose, width, height, 0,
        );
        assert.ok(Number.isFinite(corner.x) && Number.isFinite(corner.y) && corner.depth > 0, `${label}: invalid backdrop corner`);
        assert.ok(horizontal < 0 ? corner.x <= 1e-7 : corner.x >= width - 1e-7, `${label}: horizontal backdrop edge exposed blank space`);
        assert.ok(vertical > 0 ? corner.y <= 1e-7 : corner.y >= height - 1e-7, `${label}: vertical backdrop edge exposed blank space`);
      }
    }
  }
});

check('wheel pixel, line and page units produce equivalent independent 2D movement', () => {
  const pixel = wheelJourney(HOME_POSE, 32, 48, .8);
  const line = wheelJourney(HOME_POSE, wheelPixels(2, 1, 1440), wheelPixels(3, 1, 900), .8);
  const page = wheelJourney(HOME_POSE, wheelPixels(32 / 1440, 2, 1440), wheelPixels(48 / 900, 2, 900), .8);
  same(pixel, line); same(pixel, page);
  assert.ok(pixel.x > 0 && pixel.y < 0);
});

check('keyboard pans independently; Home restores center and no End destination exists', () => {
  const pose = { x: 33, y: -27, zoom: 1.1 };
  const right = keyJourney(pose, 'ArrowRight', .8), up = keyJourney(pose, 'ArrowUp', .8);
  assert.ok(right.x > pose.x && right.y === pose.y);
  assert.ok(up.y > pose.y && up.x === pose.x);
  same(keyJourney(keyJourney(pose, 'ArrowLeft', .8), 'ArrowRight', .8), pose);
  same(keyJourney(keyJourney(pose, 'PageDown', .8, 900), 'PageUp', .8, 900), pose);
  same(keyJourney(pose, 'Home'), HOME_POSE);
  assert.equal(keyJourney(pose, 'End'), null);
});

check('shared DOM projection agrees with the real Three perspective camera for all objects', () => {
  for (const [width, height] of viewports) for (const pose of [HOME_POSE, { x: 220, y: -170, zoom: 1.22 }]) {
    const frame = cameraFrame(pose, width, height);
    const camera = new PerspectiveCamera(frame.fov, width / height, .1, 5000);
    camera.position.set(frame.x, frame.y, frame.z);
    camera.updateMatrixWorld();
    for (const object of objects) {
      const three = new Vector3(object.x, object.y, object.z).project(camera);
      const expected = project(object.x, object.y, pose, width, height, object.z);
      near(expected.x, (three.x + 1) * width / 2, object.id + ' x');
      near(expected.y, (1 - three.y) * height / 2, object.id + ' y');
    }
  }
});

check('full pose snapshots preserve both coordinates and zoom for exact panel return', () => {
  const before = { x: -287.125, y: 198.5, zoom: 1.22 };
  const saved = { ...before };
  const elsewhere = dragJourney(before, 90, -20, .9);
  assert.notDeepEqual(elsewhere, saved);
  same(constrainPose(saved, 1440, 900), before);
});

if (failures) process.exitCode = 1;

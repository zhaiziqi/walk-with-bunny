import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { dragJourney } from '../src/scene/journey.ts';
import { cameraFrame, objects, project } from '../src/scene/world.ts';

const viewports = [[1440, 900], [844, 390], [390, 844], [320, 568]];
const signal = objects.find(object => object.id === 'puzzle');
const foreground = objects.find(object => object.id === 'music');
const close = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 1e-8,
  `${message}: expected ${expected}, received ${actual}`,
);
const screenPoint = (object, pose, width, height) =>
  project(object.x, object.y, pose, width, height, object.z);

// Three is the independent projection oracle, including its real camera matrix.
function threeCamera(pose, width, height) {
  const frame = cameraFrame(pose, width, height);
  const camera = new PerspectiveCamera(frame.fov, width / height, 1, 5000);
  camera.position.set(frame.x, frame.y, frame.z);
  camera.rotation.x = -frame.pitch;
  camera.updateMatrixWorld();
  return camera;
}

function threeScreen(point, camera, width, height) {
  const projected = point.clone().project(camera);
  return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
}

function billboardBounds(object, pose, width, height) {
  const camera = threeCamera(pose, width, height);
  const foot = new Vector3(object.x, object.y, object.z);
  const corners = [-object.width / 2, object.width / 2].flatMap(x =>
    [-object.footInset, object.height - object.footInset].map(y =>
      threeScreen(new Vector3(x, y, 0).applyQuaternion(camera.quaternion).add(foot), camera, width, height),
    ),
  );
  return {
    left: Math.min(...corners.map(point => point.x)),
    right: Math.max(...corners.map(point => point.x)),
    top: Math.min(...corners.map(point => point.y)),
    bottom: Math.max(...corners.map(point => point.y)),
  };
}

let failures = 0;
function check(name, run) {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.message}`); }
}

check('forward travel moves into depth with only a small lateral path bend', () => {
  for (const [width, height] of viewports) {
    const frames = Array.from({ length: 11 }, (_, index) => cameraFrame({ progress: index / 10, pan: 0 }, width, height));
    const depthTravel = frames[0].z - frames.at(-1).z;
    const lateralTravel = Math.max(...frames.map(frame => frame.x)) - Math.min(...frames.map(frame => frame.x));
    assert.ok(depthTravel > 800 && depthTravel > lateralTravel * 6, `${width}×${height}: travel must predominantly be toward the garden`);
    assert.ok(frames.every((frame, index) => !index || frame.z < frames[index - 1].z), 'forward progress must never reverse the camera');
  }
});

check('the signal flowerbed becomes visibly larger at entry, halfway, and arrival', () => {
  for (const [width, height] of viewports) {
    const sizes = [0, .5, 1].map(progress => {
      const bounds = billboardBounds(signal, { progress, pan: 0 }, width, height);
      return bounds.right - bounds.left;
    });
    assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2], 'approaching the signal must grow its silhouette continuously');
    assert.ok(sizes[2] > sizes[0] * 2.5, 'arrival must have clear depth change, not a slight zoom on a horizontal scroll');
  }
});

check('the entrance flower passes behind the camera before arrival', () => {
  const visible = screenPoint(foreground, { progress: 0, pan: 0 }, 1440, 900);
  const passed = screenPoint(foreground, { progress: 1, pan: 0 }, 1440, 900);
  assert.ok(visible.depth > 100, 'the foreground must initially be in front of the camera');
  assert.ok(passed.depth < 0, 'passed objects must be identifiable as behind the camera and hidden by renderers');
  assert.ok(screenPoint(signal, { progress: 1, pan: 0 }, 1440, 900).depth > 100, 'the destination must stay in front of the camera');
});

check('a forward/back drag restores the exact viewpoint and object projections', () => {
  const original = Object.freeze({ progress: .35, pan: .2 });
  const advanced = dragJourney(original, 0, -440);
  const returned = dragJourney(advanced, 0, 440);
  close(returned.progress, original.progress, 'return progress');
  close(returned.pan, original.pan, 'return pan');
  assert.ok(advanced.progress > original.progress, 'the outward drag must actually advance');
  for (const [width, height] of viewports) for (const object of objects) {
    const before = screenPoint(object, original, width, height);
    const after = screenPoint(object, returned, width, height);
    for (const component of ['x', 'y', 'scale', 'depth']) close(after[component], before[component], `${object.id} return ${component}`);
  }
});

check('bounded sideways looking changes neither route distance nor object size', () => {
  for (const [width, height] of viewports) for (const progress of [0, .5, 1]) {
    const poses = [-1, 0, 1].map(pan => ({ progress, pan }));
    const frames = poses.map(pose => cameraFrame(pose, width, height));
    const points = poses.map(pose => screenPoint(signal, pose, width, height));
    assert.ok(points[0].x > points[1].x && points[1].x > points[2].x, 'looking right must move the scene left');
    for (let index = 1; index < poses.length; index++) {
      close(frames[index].z, frames[0].z, 'pan preserves route depth');
      close(frames[index].y, frames[0].y, 'pan preserves camera height');
      close(points[index].scale, points[0].scale, 'pan preserves target scale');
      close(points[index].y, points[0].y, 'pan preserves target elevation');
    }
  }
});

check('the complete destination silhouette stays onscreen on narrow phones, including lateral limits', () => {
  for (const [width, height] of [[320, 568], [390, 844], [430, 932]]) for (const pan of [-1, 0, 1]) {
    const bounds = billboardBounds(signal, { progress: 1, pan }, width, height);
    assert.ok(bounds.left >= 0 && bounds.right <= width && bounds.top >= 0 && bounds.bottom <= height,
      `${width}×${height}, pan=${pan}: destination cropped; bounds=${JSON.stringify(bounds)}`);
  }
});

check('DOM hit-target projection agrees with Three and has correct screen-axis signs', () => {
  for (const [width, height] of viewports) for (const progress of [0, .5, 1]) for (const pan of [-1, 0, 1]) {
    const pose = { progress, pan };
    const camera = threeCamera(pose, width, height);
    for (const object of objects) {
      const actual = screenPoint(object, pose, width, height);
      const point = new Vector3(object.x, object.y, object.z);
      const viewDepth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z;
      close(actual.depth, viewDepth, `${object.id} camera-space depth`);
      if (viewDepth <= 1) continue; // Behind-camera coordinates are intentionally culled, not rendered.
      const expected = threeScreen(point, camera, width, height);
      close(actual.x, expected.x, `${object.id} DOM x`);
      close(actual.y, expected.y, `${object.id} DOM y`);
      const bounds = billboardBounds(object, pose, width, height);
      close(actual.scale * object.width, bounds.right - bounds.left, `${object.id} DOM width`);
    }
    const base = screenPoint(signal, pose, width, height);
    const right = project(signal.x + 10, signal.y, pose, width, height, signal.z);
    const up = project(signal.x, signal.y + 10, pose, width, height, signal.z);
    assert.ok(right.x > base.x, 'positive world X must project right');
    assert.ok(up.y < base.y, 'positive world Y must project up');
  }
});

if (failures) process.exitCode = 1;

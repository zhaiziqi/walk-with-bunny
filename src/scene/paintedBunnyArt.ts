/** This study can only run in an isolated development playthrough. */
export function bunnyWalkPreview() {
  if (!import.meta.env.DEV || typeof location === 'undefined') return false;
  const query = new URLSearchParams(location.search);
  return query.get('bunny') === 'painted' && query.get('preview') === 'fresh' && !query.has('walk');
}

export function mistGardenPreview() {
  if (!import.meta.env.DEV || typeof location === 'undefined') return false;
  const query = new URLSearchParams(location.search);
  return query.get('mist') === '1' && query.get('preview') === 'fresh' && !query.has('walk');
}

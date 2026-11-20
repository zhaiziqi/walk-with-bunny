/** Only development previews may deliberately refuse local scene artwork. */
export function sceneAssetUrl(url: string): string {
  return import.meta.env.DEV && typeof location !== 'undefined'
    && new URLSearchParams(location.search).get('qa') === 'asset-error'
    ? `${url}.intentional-failure` : url;
}

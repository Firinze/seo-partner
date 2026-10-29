import { renderBingFeature, type BingFeatureProps } from '../bing-feature.js';

export type BingConnectorCardProps = BingFeatureProps;

export function renderBingConnectorCard(props: BingConnectorCardProps): string {
  return renderBingFeature(props);
}

export { renderBingFeature };


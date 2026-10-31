/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';
export const searchAssets = {
  headerBus: require('../../shared/assets/search/header-bus.svg') as number,
  logo: require('../../shared/assets/search/logo.png') as number,
  collapse: require('../../shared/assets/search/collapse.svg') as number,
  headerLine: require('../../shared/assets/search/header-line.svg') as number,
  glow: require('../../shared/assets/search/header-glow.png') as number,
  back: require('../../shared/assets/search/back.svg') as number,
  bus: require('../../shared/assets/search/bus.svg') as number,
  background: require('../../shared/assets/search/ticket-shape.png') as number,
  line: require('../../shared/assets/search/route-line.svg') as number,
  divider: require('../../shared/assets/search/divider.svg') as number,
  home: require('../../shared/assets/search/home.svg') as number,
  search: require('../../shared/assets/search/search.svg') as number,
  journey: require('../../shared/assets/search/journey.svg') as number,
  ticket: require('../../shared/assets/search/ticket.svg') as number,
  account: require('../../shared/assets/search/account.svg') as number,
  close: require('../../shared/assets/search/close.svg') as number,
  chevron: require('../../shared/assets/search/chevron.svg') as number,
  catalogChevron: require('../../shared/assets/search/catalog-chevron.svg') as number,
};
export function SearchIcon({
  source,
  width = 20,
  height = width,
}: {
  source: number;
  width?: number | string;
  height?: number | string;
}): React.ReactElement {
  return <SvgUri uri={Image.resolveAssetSource(source).uri} width={width} height={height} />;
}

import { Config } from '../registry/types.js';

export const defaultConfig: Config = {
  repos: [],
  discovery: {
    enabled: true,
    autoDetectType: true,
  },
  tools: {
    lazyLoad: true,
    cacheResults: true,
  },
};

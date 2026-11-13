import config from '@root/studio.config.json';

export interface StudioConfig {
  theme: string;
  character: string;
  exportsDir: string;
}
export const studioConfig = config as StudioConfig;

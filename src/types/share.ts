export type ShareFormat = 'story_9x16' | 'carousel_4x5' | 'square_1x1' | 'route_overlay';

export type ShareAsset = {
  format: ShareFormat;
  uri: string;
  width: number;
  height: number;
  transparent: boolean;
  caption?: string;
};

import assert from 'node:assert/strict';
import { SHARE_ASPECT, aspectRatio, suggestedCaption } from './shareFormats';

assert.ok(SHARE_ASPECT.story_9x16.height > SHARE_ASPECT.story_9x16.width);
assert.ok(Math.abs(aspectRatio('square_1x1') - 1) < 0.001);
assert.equal(SHARE_ASPECT.route_overlay.transparent, true);

const caption = suggestedCaption('Barcelona', 'Modernisme Loop');
assert.ok(caption.includes('✦'));
assert.ok(caption.includes('Barcelona'));
assert.ok(!caption.toLowerCase().includes('llm'));

console.log('shareFormats tests: ok');

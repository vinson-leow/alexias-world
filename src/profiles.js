/* Who can be holding the tablet.
 *
 * Children are real profiles whose play is what the dashboard is about. The
 * grown-up profile exists so a parent can try things without polluting the
 * child's record — everything a grown-up does is logged separately. */

import { artUrl, LOGO_URL } from './cards.js';

export const PROFILES = {
  alexia: { name: 'Alexia', kind: 'child', avatar: artUrl('03-alexia-cardigan'), hello: 'Hi Alexia!' },
  zane:   { name: 'Zane',   kind: 'child', avatar: artUrl('01-zane-denim'),      hello: 'Hi Zane!' },
  oliver: { name: 'Oliver', kind: 'child', avatar: artUrl('15-oliver-firefighter'), hello: 'Hi Oliver!' },
  parent: { name: 'Grown-up', kind: 'parent', avatar: LOGO_URL, hello: 'Hello, grown-up.' },
};

export const CHILD_IDS = Object.keys(PROFILES).filter((id) => PROFILES[id].kind === 'child');

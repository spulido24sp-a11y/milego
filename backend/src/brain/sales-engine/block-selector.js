const ARCHETYPE_BLOCKS = {
  health:  ['hero', 'problem', 'enemy', 'transformation', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta'],
  beauty:  ['hero', 'problem', 'transformation', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta'],
  home:    ['hero', 'problem', 'transformation', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta'],
  tech:    ['hero', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta'],
  fashion: ['hero', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta'],
  food:    ['hero', 'problem', 'benefits', 'offer', 'guarantee', 'faq', 'cta'],
  general: ['hero', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta'],
};

export class BlockSelector {
  selectBlocks(archetype) {
    return ARCHETYPE_BLOCKS[archetype] || ARCHETYPE_BLOCKS.general;
  }
}

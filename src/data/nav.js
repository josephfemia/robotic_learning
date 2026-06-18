// Nav model extracted verbatim from reference/robot-learning-companion.html (lines ~299–319, 2235–2247)

export const NAV_GROUPS = [
  {
    header: 'Orientation',
    items: [
      { id: 'start',  idx: '··', label: 'Start here' },
      { id: 'primer', idx: '00', label: 'The Primer: your missing background' },
    ],
  },
  {
    header: 'Fundamentals',
    items: [
      { id: 'l1', idx: 'L01', label: 'Introduction to Robot Learning' },
      { id: 'l2', idx: 'L02', label: 'Robot Control & MDPs' },
      { id: 'l3', idx: 'L03', label: 'Imitation Learning' },
      { id: 'l4', idx: 'L04', label: 'Reinforcement Learning I' },
      { id: 'l5', idx: 'L05', label: 'Reinforcement Learning II' },
    ],
  },
  {
    header: 'Modern policy learning',
    items: [
      { id: 'l6', idx: 'L06', label: 'Generative Models' },
      { id: 'l7', idx: 'L07', label: 'Sequence Modeling & Transformers' },
      { id: 'l8', idx: 'L08', label: 'World Models' },
    ],
  },
  {
    header: 'Foundation models',
    items: [
      { id: 'l9',  idx: 'L09', label: 'Generalist Robot Policies' },
      { id: 'l10', idx: 'L10', label: 'Embodied Reasoning & Test-time Scaling' },
      { id: 'l11', idx: 'L11', label: 'Frontier & Open Problems' },
      { id: 'l12', idx: 'L12', label: 'Guest Lectures: Two Arcs' },
    ],
  },
  {
    header: 'Practice',
    items: [
      { id: 'review', idx: '★', label: 'Review mode — all quiz questions' },
    ],
  },
];

// Flat ordered list of all nav entries (convenience)
export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// Progress denominator — only l1..l12 count
export const LECTURES = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12'];

// TITLES: id → short title used in topbar whereLabel (verbatim from original IIFE)
export const TITLES = {
  start:  'Start here',
  primer: '00 · The Primer',
  l1:  'L01 · Introduction to Robot Learning',
  l2:  'L02 · Robot Control & MDPs',
  l3:  'L03 · Imitation Learning',
  l4:  'L04 · Reinforcement Learning I',
  l5:  'L05 · Reinforcement Learning II',
  l6:  'L06 · Generative Models',
  l7:  'L07 · Sequence Modeling & Transformers',
  l8:  'L08 · World Models',
  l9:  'L09 · Generalist Robot Policies',
  l10: 'L10 · Embodied Reasoning & Test-time Scaling',
  l11: 'L11 · Frontier & Open Problems',
  l12: 'L12 · Guest Lectures',
};

// LABELS: id → label used by complete buttons (verbatim from original IIFE)
export const LABELS = {
  primer: 'Primer',
  l1:  'L01', l2:  'L02', l3:  'L03', l4:  'L04',
  l5:  'L05', l6:  'L06', l7:  'L07', l8:  'L08',
  l9:  'L09', l10: 'L10', l11: 'L11', l12: 'L12',
};

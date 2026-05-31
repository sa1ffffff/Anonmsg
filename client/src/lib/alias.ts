const ADJECTIVES = [
  'Silent',
  'Neon',
  'Paper',
  'Velvet',
  'Midnight',
  'Crimson',
  'Silver',
  'Amber',
  'Shadow',
  'Quiet',
  'Ghost',
  'Soft',
  'Lunar',
  'Cinder',
  'Nova',
  'Signal',
  'Drift',
  'Sable',
  'Obsidian',
  'Pale',
];

const NOUNS = [
  'Wave',
  'Echo',
  'Moon',
  'Signal',
  'Atlas',
  'Note',
  'Lumen',
  'Bloom',
  'Horizon',
  'Cipher',
  'Orbit',
  'Fox',
  'Crane',
  'Raven',
  'Otter',
  'Koi',
  'Wren',
  'Hawk',
  'Lynx',
  'Finch',
];

const STORAGE_KEY = 'anonmsg_alias';

function createAlias() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${adjective} ${noun} ${suffix}`;
}

export function getSessionAlias() {
  if (typeof window === 'undefined') return createAlias();
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const alias = createAlias();
  window.sessionStorage.setItem(STORAGE_KEY, alias);
  return alias;
}

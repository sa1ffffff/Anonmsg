const PALETTE = [
  '#2d3142',
  '#3d348b',
  '#6c2c5d',
  '#5b2a2a',
  '#1f4d5f',
  '#2f5d50',
  '#5c4b2e',
  '#4b2c5f',
];

export function aliasColor(alias: string): string {
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function aliasInitials(alias: string): string {
  return alias
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

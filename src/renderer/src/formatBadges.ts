export interface FormatBadge {
  label: string
  color: string
  bg: string
}

export const FORMAT_BADGES: Record<string, FormatBadge> = {
  stl: { label: 'STL', color: '#4fd1c5', bg: 'rgba(79,209,197,0.15)' },
  obj: { label: 'OBJ', color: '#7fd858', bg: 'rgba(127,216,88,0.15)' },
  scad: { label: 'SCAD', color: '#f5a623', bg: 'rgba(245,166,35,0.15)' },
  fcstd: { label: 'FCSTD', color: '#9aa3ff', bg: 'rgba(140,150,255,0.15)' },
  step: { label: 'STEP', color: '#ff8a9d', bg: 'rgba(255,138,157,0.15)' },
  // MTL is Listed, not Renderable (see formats.ts), so this badge is dormant
  // today - the tree filters Listed formats out same as unrecognized files -
  // kept for when that changes, same treatment as the other Listed badges.
  mtl: { label: 'MTL', color: '#c9c9c9', bg: 'rgba(201,201,201,0.15)' }
}

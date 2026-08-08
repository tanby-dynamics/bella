export interface FormatBadge {
  label: string
  color: string
  bg: string
}

export const FORMAT_BADGES: Record<string, FormatBadge> = {
  stl: { label: 'STL', color: '#4fd1c5', bg: 'rgba(79,209,197,0.15)' },
  scad: { label: 'SCAD', color: '#f5a623', bg: 'rgba(245,166,35,0.15)' },
  fcstd: { label: 'FCSTD', color: '#9aa3ff', bg: 'rgba(140,150,255,0.15)' },
  step: { label: 'STEP', color: '#ff8a9d', bg: 'rgba(255,138,157,0.15)' }
}

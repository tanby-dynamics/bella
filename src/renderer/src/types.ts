// Type-only re-exports of the domain layer's public shapes. Erased at compile
// time, so importing them here doesn't pull Node-only domain code (Buffer,
// fs-shaped adapters) into the renderer bundle.
export type { FileEntry } from '../../domain/listFolder'
export type { Subfolder } from '../../domain/listSubfolders'
export type { SortColumn, SortDirection } from '../../domain/sortEntries'
export type { Location } from '../../domain/locations'
export type {
  Favorite,
  Settings,
  Theme,
  RenderMode,
  ColumnWidths,
  StoreData
} from '../../domain/store'
export type { StlParseSuccess } from '../../domain/stlParser'
export type { FormatClassification } from '../../domain/formats'

// Value-level re-exports - unlike the type-only ones above, these do bundle
// real code, but only from domain modules that are pure logic with zero
// Node/fs dependency (see src/domain/formats.ts, sortEntries.ts). Kept to
// functions that must stay byte-identical between what's displayed and what
// the domain layer sorts/classifies by - duplicating them renderer-side
// would risk drift (e.g. the Type column's text vs. what sortEntries sorts
// "type" by).
export { typeLabel } from '../../domain/formats'
export { sortEntries } from '../../domain/sortEntries'

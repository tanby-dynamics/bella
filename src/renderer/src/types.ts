// Type-only re-exports of the domain layer's public shapes. Erased at compile
// time, so importing them here doesn't pull Node-only domain code (Buffer,
// fs-shaped adapters) into the renderer bundle.
export type { FileEntry } from '../../domain/listFolder'
export type { Location } from '../../domain/locations'
export type { Favorite, Settings, Theme, RenderMode } from '../../domain/store'
export type { StlParseSuccess } from '../../domain/stlParser'
export type { FormatClassification } from '../../domain/formats'

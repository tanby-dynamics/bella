// Type-only re-exports of the domain layer's public shapes. Erased at compile
// time, so importing them here doesn't pull Node-only domain code (Buffer,
// fs-shaped adapters) into the renderer bundle.
export type { FileEntry, Subfolder, FolderContents } from '../../domain/listFolderContents'
export type { Location } from '../../domain/locations'
export type { Favorite, Settings, Theme, RenderMode, StoreData } from '../../domain/store'
export { COLOR_PRESETS } from '../../domain/store'
export type { StlParseSuccess } from '../../domain/stlParser'
export type { FormatClassification } from '../../domain/formats'
export type { UpdateCheckResult, UpdateDownloadStatus } from '../../shared/ipc'

// Value-level re-export - unlike the type-only ones above, this bundles real
// code, but only from a domain module that's pure logic with zero Node/fs
// dependency (see src/domain/formats.ts). Kept to a function that must stay
// byte-identical between what's displayed (tree row, status bar) and what
// the domain layer classifies by - duplicating it renderer-side would risk
// drift.
export { typeLabel } from '../../domain/formats'

import type { StlParseSuccess } from './types'

/** The preview panel's state machine. "not-available" covers both Listed
 * formats (STEP/FCStd/SCAD - a known, expected gap) and plain non-CAD files;
 * "error" is reserved for a Renderable file that Bella claims to support but
 * failed to parse - a distinct, more alarming state. */
export type PreviewState =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'not-available' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: StlParseSuccess }

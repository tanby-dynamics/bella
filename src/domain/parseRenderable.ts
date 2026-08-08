import type { RenderableFormatId } from './formats'
import { parseStl, type StlParseResult } from './stlParser'

/** Result shape is shared by every renderable-format parser; only STL exists today,
 * but this dispatcher is the extension point new formats register into. */
export function parseRenderable(
  format: RenderableFormatId,
  bytes: Buffer | Uint8Array
): StlParseResult {
  switch (format) {
    case 'stl':
      return parseStl(bytes)
  }
}

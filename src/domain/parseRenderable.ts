import type { RenderableFormatId } from './formats'
import { parseStl, type StlParseResult } from './stlParser'
import { parseObj } from './objParser'
import { parseThreeMf } from './threeMfParser'

export interface ParseRenderableExtra {
  /** OBJ only: raw MTL source text for every `mtllib` filename the caller
   * (which owns filesystem access - see extractMtlLibNames in objParser.ts)
   * managed to read from disk, keyed by that filename. Omitted/empty means
   * no materials were resolved - not a failure, just no color info. */
  materialSources?: Map<string, string>
}

/** Result shape is shared by every renderable-format parser (see
 * StlParseSuccess); this dispatcher is the extension point new formats
 * register into. */
export function parseRenderable(
  format: RenderableFormatId,
  bytes: Buffer | Uint8Array,
  extra: ParseRenderableExtra = {}
): StlParseResult {
  switch (format) {
    case 'stl':
      return parseStl(bytes)
    case 'obj':
      return parseObj(bytes, extra.materialSources)
    case '3mf':
      return parseThreeMf(bytes)
  }
}

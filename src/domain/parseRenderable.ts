import type { RenderableFormatId } from './formats'
import { parseStl, type StlParseResult } from './stlParser'
import { parseObj } from './objParser'
import { parseThreeMf } from './threeMfParser'
import { parseStep } from './stepParser'

export interface ParseRenderableExtra {
  /** OBJ only: raw MTL source text for every `mtllib` filename the caller
   * (which owns filesystem access - see extractMtlLibNames in objParser.ts)
   * managed to read from disk, keyed by that filename. Omitted/empty means
   * no materials were resolved - not a failure, just no color info. */
  materialSources?: Map<string, string>
}

/** Result shape is shared by every renderable-format parser (see
 * StlParseSuccess); this dispatcher is the extension point new formats
 * register into. Async because STEP's parser (occt-import-js, a WASM
 * module) has no synchronous API - every format is dispatched through the
 * same async signature rather than special-casing STEP's callers. */
export async function parseRenderable(
  format: RenderableFormatId,
  bytes: Buffer | Uint8Array,
  extra: ParseRenderableExtra = {}
): Promise<StlParseResult> {
  switch (format) {
    case 'stl':
      return parseStl(bytes)
    case 'obj':
      return parseObj(bytes, extra.materialSources)
    case '3mf':
      return parseThreeMf(bytes)
    case 'step':
      return parseStep(bytes)
  }
}

// occt-import-js ships no TypeScript types of its own (see
// node_modules/occt-import-js/package.json) - this is the minimal ambient
// shape stepParser.ts actually uses, transcribed from the upstream README
// (https://github.com/kovacsv/occt-import-js#processing-the-result) rather
// than a full re-declaration of every field OCCT can produce.
declare module 'occt-import-js' {
  export interface OcctReadParams {
    linearUnit?: 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot'
    linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value'
    linearDeflection?: number
    angularDeflection?: number
  }

  export interface OcctMesh {
    name: string
    /** Whole-mesh RGB in [0,1], present when the STEP file assigns the
     * shape a color. See stepParser.ts for why per-brep_face colors aren't
     * read. */
    color?: [number, number, number]
    brep_faces: Array<{ first: number; last: number; color: [number, number, number] | null }>
    attributes: {
      position: { array: number[] }
      normal?: { array: number[] }
    }
    index: { array: number[] }
  }

  export interface OcctReadResult {
    success: boolean
    root: { name: string; meshes: number[]; children: unknown[] }
    meshes: OcctMesh[]
  }

  export interface OcctImportJsModule {
    ReadStepFile(content: Uint8Array, params: OcctReadParams | null): OcctReadResult
    ReadIgesFile(content: Uint8Array, params: OcctReadParams | null): OcctReadResult
    ReadBrepFile(content: Uint8Array, params: OcctReadParams | null): OcctReadResult
  }

  export default function occtimportjs(): Promise<OcctImportJsModule>
}

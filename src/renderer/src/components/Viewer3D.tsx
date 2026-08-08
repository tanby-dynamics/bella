import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { RenderMode } from '../types'

interface Viewer3DProps {
  vertices: number[]
  /** Flat per-vertex RGB in [0,1], aligned 1:1 with `vertices` - present only
   * for a format that supplies its own material color (OBJ+MTL). When set,
   * it's rendered as-is via vertex colors and `renderColor` is ignored - a
   * format's own color takes precedence over the fallback. See
   * StlParseSuccess.colors and Settings.renderColor. */
  colors?: number[]
  boundingBox: { min: [number, number, number]; max: [number, number, number] }
  renderMode: RenderMode
  /** Fallback mesh color for formats with no color info of their own (e.g.
   * STL). See Settings.renderColor. */
  renderColor: string
}

interface SceneRefs {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  mesh: THREE.Mesh
  material: THREE.MeshStandardMaterial
}

function frameCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  boundingBox: Viewer3DProps['boundingBox']
): void {
  const [minX, minY, minZ] = boundingBox.min
  const [maxX, maxY, maxZ] = boundingBox.max
  const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2)
  const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6)

  const distance = size * 1.8
  camera.position.set(
    center.x + distance * 0.6,
    center.y + distance * 0.5,
    center.z + distance * 0.6
  )
  camera.near = size / 100
  camera.far = size * 100
  camera.updateProjectionMatrix()

  controls.target.copy(center)
  controls.update()
}

function applyRenderMode(material: THREE.MeshStandardMaterial, renderMode: RenderMode): void {
  switch (renderMode) {
    case 'shaded':
      material.wireframe = false
      material.transparent = false
      material.opacity = 1
      break
    case 'wireframe':
      material.wireframe = true
      material.transparent = false
      material.opacity = 1
      break
    case 'xray':
      material.wireframe = false
      material.transparent = true
      material.opacity = 0.35
      break
  }
  material.needsUpdate = true
}

export function Viewer3D({
  vertices,
  colors,
  boundingBox,
  renderMode,
  renderColor
}: Viewer3DProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const refs = useRef<SceneRefs | null>(null)

  // Set up the scene once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Damping off: the camera tracks the mouse directly, with no inertia/
    // "floaty" drift once the drag ends.
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.2)
    key.position.set(1, 1.5, 1)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.4)
    fill.position.set(-1, -0.5, -1)
    scene.add(fill)

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(renderColor),
      metalness: 0.1,
      roughness: 0.6,
      side: THREE.DoubleSide
    })
    const geometry = new THREE.BufferGeometry()
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    refs.current = { renderer, scene, camera, controls, mesh, material }

    let frameId: number
    const animate = (): void => {
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      controls.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      refs.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene is set up once; props are applied in the effects below
  }, [])

  // Rebuild geometry when the mesh data changes.
  useEffect(() => {
    const current = refs.current
    if (!current) return
    const positions = new Float32Array(vertices)
    current.mesh.geometry.dispose()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    if (colors) {
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
    }
    geometry.computeVertexNormals()
    current.mesh.geometry = geometry
    frameCamera(current.camera, current.controls, boundingBox)
  }, [vertices, colors, boundingBox])

  // Apply render mode.
  useEffect(() => {
    const current = refs.current
    if (!current) return
    applyRenderMode(current.material, renderMode)
  }, [renderMode])

  // Apply render color - moot when the mesh carries its own per-vertex
  // colors (OBJ+MTL): that color takes precedence, so renderColor is
  // ignored and the material's base color is left white so the vertex
  // colors show unmodified (MeshStandardMaterial multiplies the two).
  useEffect(() => {
    const current = refs.current
    if (!current) return
    current.material.vertexColors = !!colors
    current.material.color = new THREE.Color(colors ? '#ffffff' : renderColor)
    current.material.needsUpdate = true
  }, [renderColor, colors])

  function zoomBy(factor: number): void {
    const current = refs.current
    if (!current) return
    const { camera, controls } = current
    const offset = camera.position.clone().sub(controls.target)
    offset.multiplyScalar(factor)
    camera.position.copy(controls.target).add(offset)
    controls.update()
  }

  return (
    <div className="viewer3d" ref={containerRef}>
      <div className="viewer3d__zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(0.8)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1.25)}>
          −
        </button>
      </div>
    </div>
  )
}

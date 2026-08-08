import type { FileEntry, StlParseSuccess } from '../types'
import { formatDate, formatFileSize } from '../paths'

interface MetadataPanelProps {
  entry: FileEntry
  renderable?: StlParseSuccess
}

function dimensionsLabel(box: StlParseSuccess['boundingBox']): string {
  const [minX, minY, minZ] = box.min
  const [maxX, maxY, maxZ] = box.max
  const fmt = (n: number): string => n.toFixed(1).replace(/\.0$/, '')
  return `${fmt(maxX - minX)} × ${fmt(maxY - minY)} × ${fmt(maxZ - minZ)} mm`
}

export function MetadataPanel({ entry, renderable }: MetadataPanelProps): React.JSX.Element {
  const fields: { label: string; value: string }[] = renderable
    ? [
        { label: 'DIMENSIONS', value: dimensionsLabel(renderable.boundingBox) },
        { label: 'TRIANGLES', value: renderable.triangleCount.toLocaleString() },
        { label: 'MODIFIED', value: formatDate(entry.modifiedAt) }
      ]
    : [
        { label: 'SIZE', value: formatFileSize(entry.size) },
        { label: 'MODIFIED', value: formatDate(entry.modifiedAt) }
      ]

  return (
    <div className="metadata-panel">
      {fields.map((field) => (
        <div className="metadata-panel__field" key={field.label}>
          <div className="metadata-panel__label">{field.label}</div>
          <div className="metadata-panel__value">{field.value}</div>
        </div>
      ))}
    </div>
  )
}

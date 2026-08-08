import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  onSelect: () => void
}

interface ContextMenuProps {
  /** Viewport coordinates to anchor at - the triggering event's
   * clientX/clientY, so the menu opens exactly under the cursor regardless
   * of which row/depth was right-clicked. */
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/** A minimal right-click popup menu. Closes itself on an outside click or
 * Escape - there's no other dismissal affordance, since items are one-shot
 * actions rather than a persistent panel. Content-agnostic (just a list of
 * labeled actions) so it isn't tied to any one row type. */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Attached post-render, so the mousedown that opened the menu (from a
    // right-click, which fires mousedown before contextmenu) has already
    // been dispatched and can't immediately close it again.
    function handlePointerDown(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="context-menu" style={{ top: y, left: x }} ref={menuRef} role="menu">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="context-menu__item"
          role="menuitem"
          onClick={() => {
            item.onSelect()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

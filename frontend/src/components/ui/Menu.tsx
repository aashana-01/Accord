// Dropdown menu for the top bar. Arrow keys move, Enter/Space picks, Esc closes and returns focus.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  checked?: boolean // shown as a radio choice when defined
  hint?: string
  lang?: string // for language names, so screen readers pronounce them right
}

interface Props {
  label: string
  items: MenuItem[]
  buttonClassName?: string
  align?: 'left' | 'right'
  icon?: string
}

export default function Menu({ label, items, buttonClassName = '', align = 'left', icon }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]')[active]?.focus()
  }, [open, active])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!listRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const openAt = (index: number) => {
    setActive(index)
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openAt(Math.max(0, items.findIndex((i) => i.checked)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      openAt(items.length - 1)
    }
  }

  const onItemKey = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1
    if (e.key === 'ArrowDown') setActive(index === last ? 0 : index + 1)
    else if (e.key === 'ArrowUp') setActive(index === 0 ? last : index - 1)
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') close(false)
    else if (e.key === 'Enter' || e.key === ' ') {
      items[index].onSelect()
      close()
    } else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openAt(Math.max(0, items.findIndex((i) => i.checked))))}
        onKeyDown={onButtonKey}
        className={buttonClassName}
      >
        {icon && <span aria-hidden>{icon}</span>}
        {label}
        <span aria-hidden className="text-[10px] opacity-70">
          ▾
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute top-full z-50 mt-1 min-w-52 rounded-xl border p-1 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ background: 'var(--surface)', color: 'var(--surface-fg)', borderColor: 'var(--border)' }}
        >
          {items.map((item, i) => (
            <li
              key={item.label}
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked === undefined ? undefined : item.checked}
              tabIndex={i === active ? 0 : -1}
              onClick={() => {
                item.onSelect()
                close()
              }}
              onKeyDown={(e) => onItemKey(e, i)}
              onMouseEnter={() => setActive(i)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)]"
            >
              {item.checked !== undefined && (
                <span aria-hidden className="w-4 text-center">
                  {item.checked ? '●' : ''}
                </span>
              )}
              <span className="flex-1 whitespace-nowrap" lang={item.lang}>
                {item.label}
              </span>
              {item.hint && (
                <span className="whitespace-nowrap text-xs" style={{ color: 'var(--surface-muted)' }}>
                  {item.hint}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

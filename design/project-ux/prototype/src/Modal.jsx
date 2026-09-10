import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({ open, onClose, title, description, children, size = 'medium', label }) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFirst = () => {
      const panel = panelRef.current
      if (!panel) return
      const preferred = panel.querySelector('[data-autofocus]')
      const first = panel.querySelector(FOCUSABLE)
      ;(preferred || first || panel).focus()
    }
    const frame = requestAnimationFrame(focusFirst)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
      )
      if (!focusables.length) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = priorOverflow
      requestAnimationFrame(() => {
        if (previous && typeof previous.focus === 'function' && previous.isConnected) previous.focus()
      })
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={panelRef}
        className={`modal-panel modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        aria-label={label}
        tabIndex={-1}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">Project Stewardship</p>
            <h2 id="modal-title">{title}</h2>
            {description ? <p id="modal-description">{description}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={`Close ${title}`}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

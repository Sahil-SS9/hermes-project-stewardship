import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { PROFILES } from './data.js'

function nextAvailable(results, current, direction) {
  if (!results.some((profile) => profile.available)) return -1
  let candidate = current
  for (let count = 0; count < results.length; count += 1) {
    candidate = (candidate + direction + results.length) % results.length
    if (results[candidate].available) return candidate
  }
  return -1
}

export default function ProfilePicker({
  open,
  onClose,
  onSelect,
  title = 'Choose a Hermes profile',
  description = 'Select one discovered profile. Availability is read-only discovery state.',
  exclude = [],
  profiles = PROFILES,
}) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const results = useMemo(() => {
    const cleaned = query.trim().toLowerCase()
    return profiles.filter((profile) => {
      if (exclude.includes(profile.slug)) return false
      if (!cleaned) return true
      return `${profile.slug} ${profile.name} ${profile.specialty}`.toLowerCase().includes(cleaned)
    })
  }, [query, exclude, profiles])

  useEffect(() => {
    if (!open) return
    setQuery('')
  }, [open])

  useEffect(() => {
    setActiveIndex(results.findIndex((profile) => profile.available))
  }, [results])

  const choose = (profile) => {
    if (!profile?.available) return
    onSelect(profile)
    onClose()
  }

  const onSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => nextAvailable(results, index, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => nextAvailable(results, index < 0 ? 0 : index, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const candidate = results[activeIndex]?.available
        ? results[activeIndex]
        : results.find((profile) => profile.available)
      choose(candidate)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="picker">
      <label className="field-label" htmlFor="profile-search">Search discovered profiles</label>
      <div className="search-wrap">
        <span aria-hidden="true">⌕</span>
        <input
          id="profile-search"
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="profile-results"
          aria-activedescendant={activeIndex >= 0 && results[activeIndex] ? `profile-option-${results[activeIndex].slug}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search name, slug, or specialty"
        />
        <kbd>↑↓ ↵</kbd>
      </div>

      <div className="picker-summary" aria-live="polite">
        <span>{results.length} profile{results.length === 1 ? '' : 's'}</span>
        <span>Available profiles can be selected</span>
      </div>

      <div id="profile-results" className="profile-list" role="listbox" aria-label="Hermes profiles">
        {results.map((profile, index) => (
          <button
            id={`profile-option-${profile.slug}`}
            key={profile.slug}
            className="profile-option"
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={activeIndex === index}
            aria-disabled={!profile.available}
            disabled={!profile.available}
            onMouseMove={() => profile.available && setActiveIndex(index)}
            onClick={() => choose(profile)}
          >
            <span className="avatar" aria-hidden="true">{profile.name.slice(0, 1)}</span>
            <span className="profile-copy">
              <strong>{profile.name}</strong>
              <span><code>{profile.slug}</code> · {profile.specialty}</span>
            </span>
            <span className={`status-tag ${profile.available ? 'success' : 'danger'}`}>
              <span className="status-mark" aria-hidden="true" />
              {profile.available ? 'Available' : 'Unavailable'}
            </span>
          </button>
        ))}
        {!results.length ? (
          <div className="empty-compact" role="status">
            <strong>No discovered profile matches “{query}”.</strong>
            <span>Clear the search or create the profile outside this panel.</span>
          </div>
        ) : null}
      </div>

      <aside className="info-callout profile-guidance">
        <strong>Need a new profile?</strong>
        <p>
          Hermes profiles are created outside Project Stewardship with Hermes profile management.
          This panel cannot create a profile or change its availability. Create it in Hermes, then return
          and refresh discovery before assigning project access.
        </p>
      </aside>

      <footer className="modal-actions">
        <span className="keyboard-hint">Escape closes without changing the field.</span>
        <button className="button" type="button" onClick={onClose}>Close</button>
      </footer>
    </Modal>
  )
}

export default function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    rocket: <><path d="M14.5 4.5c2.2-1.5 4.5-1.5 5-1 .5.5.5 2.8-1 5l-5.8 5.8-3-3 4.8-6.8Z"/><path d="m9.7 11.3-3.5.8-2.7 2.7 5.7.1M12.7 14.3l-.8 3.5-2.7 2.7-.1-5.7"/><circle cx="16" cy="7" r="1.2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 14.2c3.3-.8 5 1 5 3.3V19"/></>,
    transfer: <><path d="M4 7h13l-3-3M20 17H7l3 3"/><path d="m17 7-3 3M7 17l3-3"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m15 9 6-6M17 3h4v4"/></>,
    archive: <><path d="M4 7h16v13H4zM3 3h18v4H3z"/><path d="M9 11h6"/></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5h.01"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    shield: <><path d="M12 3 5 6v5c0 4.5 2.8 8.1 7 10 4.2-1.9 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  )
}

/**
 * StewardshipPanel — Desktop extension panel scaffold.
 *
 * Consumes the same RPC contract as CLI/TUI/gateway (see docs/architecture.md).
 * This scaffold renders health, pending approvals and initiatives; it keeps
 * NO local stewardship state — every view is a fetch of canonical state.
 *
 * Build: npm install && npm run build (Vite + React, output to dist/).
 * Wiring: served by the Hermes desktop plugin surface at route /stewardship
 * with api_prefix /stewardship/v1 (see plugin.yaml).
 */
import React, { useEffect, useState } from "react";

const API = "/stewardship/v1";

type Health = { status: string; score: number | null; created_at: string } | null;
type Initiative = {
  ref: string;
  title: string;
  status: string;
  risk: string;
  rationale: string;
};
type Settings = {
  project_id: string;
  mission: string;
  phase: string;
  autonomy_level: number;
  owner: { lead_profile: string | null; member_profiles: string[] };
};

export function StewardshipPanel({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [health, setHealth] = useState<Health>(null);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const s = await fetch(`${API}/projects/${projectId}/settings`).then((r) => r.json());
    const h = await fetch(`${API}/projects/${projectId}/health`).then((r) =>
      r.ok ? r.json() : null
    );
    const i = await fetch(`${API}/projects/${projectId}/initiatives`).then((r) => r.json());
    setSettings(s);
    setHealth(h);
    setInitiatives(i.initiatives ?? []);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000); // poll; websockets are a later upgrade
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const act = async (path: string) => {
    setBusy(true);
    try {
      await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "desktop-user", interface: "desktop" }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <div className="stewardship-loading">loading…</div>;

  const stateColor =
    { healthy: "#2e7d32", watch: "#f9a825", degraded: "#ef6c00", critical: "#c62828", unknown: "#616161" }[
      health?.status ?? "unknown"
    ] ?? "#616161";

  return (
    <div className="stewardship-panel">
      <header>
        <h2>{settings.project_id}</h2>
        <p className="mission">{settings.mission || "(no mission set)"}</p>
        <p>
          phase={settings.phase} · autonomy L{settings.autonomy_level} · lead=
          {settings.owner.lead_profile ?? "(unset)"}
        </p>
      </header>

      <section className="health" aria-label="project health">
        <span className="dot" style={{ background: stateColor }} />
        <strong>{health?.status ?? "never-verified"}</strong>
        {health?.score != null && <span> score={health.score}</span>}
        <button disabled={busy} onClick={() => act(`/projects/${projectId}/cycle`)}>
          Run cycle
        </button>
        <button disabled={busy} onClick={() => act(`/projects/${projectId}/pause`)}>
          Pause
        </button>
      </section>

      <section className="approvals" aria-label="pending approvals">
        <h3>Pending approvals</h3>
        {initiatives.filter((i) => i.status === "pending_approval").length === 0 && (
          <p className="quiet">none</p>
        )}
        {initiatives
          .filter((i) => i.status === "pending_approval")
          .map((i) => (
            <div key={i.ref} className="initiative">
              <span className={`risk risk-${i.risk}`}>{i.risk}</span>
              <strong>{i.ref}</strong> {i.title}
              <button disabled={busy} onClick={() => act(`/initiatives/${i.ref}/approve`)}>
                Approve
              </button>
              <button disabled={busy} onClick={() => act(`/initiatives/${i.ref}/reject`)}>
                Reject
              </button>
            </div>
          ))}
      </section>

      <section className="initiatives" aria-label="all initiatives">
        <h3>All initiatives</h3>
        {initiatives.slice(0, 25).map((i) => (
          <div key={i.ref}>
            {i.ref} [{i.status}] {i.title}
          </div>
        ))}
      </section>
    </div>
  );
}

export default StewardshipPanel;

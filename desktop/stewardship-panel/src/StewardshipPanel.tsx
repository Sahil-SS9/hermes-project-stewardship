/**
 * StewardshipPanel — Desktop extension panel (full build).
 *
 * Consumes the same RPC contract as CLI/TUI/gateway. Keeps NO local
 * stewardship state; every view is a fetch of canonical state.
 *
 * UX contract (WS16):
 * - state first: health banner answers "is this project OK?" in one glance;
 * - every state designed: loading, empty, error, offline — never a raw trace;
 * - approvals show evidence + risk before the action; buttons disable while
 *   in-flight with visible pending text;
 * - keyboard reachable, ARIA-labelled regions, reduced-motion respected via
 *   tokens.css.
 */
import React, { useCallback, useEffect, useState } from "react";
import "./tokens.css";

const API = "/stewardship/v1";

type Health = {
  status: string;
  score: number | null;
  created_at: string;
  contradictions?: { severity: string; detail: string }[];
} | null;

type Initiative = {
  ref: string;
  title: string;
  status: string;
  risk: string;
  rationale: string;
  expected_outcome: string;
};

type Settings = {
  project_id: string;
  mission: string;
  phase: string;
  autonomy_level: number;
  owner: { lead_profile: string | null; member_profiles: string[] };
};

type LoadState = "loading" | "ready" | "error" | "offline";

const STATE_COLOUR: Record<string, string> = {
  healthy: "var(--health-healthy)",
  watch: "var(--health-watch)",
  degraded: "var(--health-degraded)",
  critical: "var(--health-critical)",
  unknown: "var(--health-unknown)",
  "never-verified": "var(--health-unknown)",
};

const STATE_LABEL: Record<string, string> = {
  healthy: "Healthy",
  watch: "Watch",
  degraded: "Degraded",
  critical: "Critical",
  unknown: "Unknown",
  "never-verified": "Never verified",
};

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card" role="alert">
      <h3>Couldn’t reach the stewardship backend</h3>
      <p className="secondary">{message}</p>
      <button className="btn primary" onClick={onRetry}>Retry</button>
    </div>
  );
}

export function StewardshipPanel({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [health, setHealth] = useState<Health>(null);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [load, setLoad] = useState<LoadState>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await fetch(`${API}/projects/${projectId}/settings`);
      if (s.status === 404) {
        setLoad("error");
        setErrMsg(`Project “${projectId}” has no stewardship settings yet.`);
        return;
      }
      if (!s.ok) throw new Error(`settings ${s.status}`);
      const h = await fetch(`${API}/projects/${projectId}/health`);
      const i = await fetch(`${API}/projects/${projectId}/initiatives`);
      setSettings(await s.json());
      setHealth(h.ok ? await h.json() : null);
      setInitiatives((await i.json()).initiatives ?? []);
      setLoad("ready");
    } catch (e) {
      setLoad(navigator.onLine ? "error" : "offline");
      setErrMsg(e instanceof Error ? e.message : String(e));
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = async (path: string, ref: string, doneMsg: string) => {
    setBusyRef(ref);
    setBanner(null);
    try {
      const r = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "desktop-user", interface: "desktop" }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error?.message ?? `request failed (${r.status})`);
      }
      setBanner(doneMsg);
      await refresh();
    } catch (e) {
      setBanner(e instanceof Error ? `Action failed: ${e.message}` : "Action failed");
    } finally {
      setBusyRef(null);
    }
  };

  if (load === "loading") {
    return <div className="panel" aria-busy="true"><p className="secondary">Loading stewardship…</p></div>;
  }
  if (load === "error" || load === "offline" || !settings) {
    return (
      <div className="panel">
        <ErrorState
          message={load === "offline" ? "You appear to be offline." : errMsg}
          onRetry={refresh}
        />
      </div>
    );
  }

  const state = health?.status ?? "never-verified";
  const pending = initiatives.filter((i) => i.status === "pending_approval");
  const others = initiatives.filter((i) => i.status !== "pending_approval");

  return (
    <div className="panel">
      <style>{css}</style>

      <header className="header">
        <div>
          <h2>{settings.project_id}</h2>
          <p className="secondary mission">{settings.mission || "(no mission set)"}</p>
        </div>
        <span className={`phase phase-${settings.phase}`}>{settings.phase}</span>
      </header>

      {banner && (
        <div className="banner" role="status">
          {banner}
          <button className="btn ghost dismiss" onClick={() => setBanner(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Health banner — the one-glance answer */}
      <section className="card health" aria-label="Project health">
        <span
          className="dot"
          style={{ background: STATE_COLOUR[state] }}
          role="img"
          aria-label={`${STATE_LABEL[state]} health`}
        />
        <div className="grow">
          <strong>{STATE_LABEL[state]}</strong>
          {health?.score != null && <span className="secondary"> · score {health.score}</span>}
          <div className="secondary small">
            autonomy L{settings.autonomy_level} · lead {settings.owner.lead_profile ?? "unset"}
            {health && <> · verified {new Date(health.created_at).toLocaleString()}</>}
          </div>
        </div>
        <div className="actions">
          <button
            className="btn primary"
            disabled={busyRef !== null || settings.phase !== "active"}
            onClick={() => act(`/projects/${projectId}/cycle`, "__cycle", "Cycle complete.")}
          >
            {busyRef === "__cycle" ? "Running…" : "Run cycle"}
          </button>
          {settings.phase === "active" ? (
            <button className="btn" disabled={busyRef !== null}
                    onClick={() => act(`/projects/${projectId}/pause`, "__pause", "Project paused.")}>
              Pause
            </button>
          ) : (
            <button className="btn" disabled={busyRef !== null}
                    onClick={() => act(`/projects/${projectId}/resume`, "__resume", "Project resumed.")}>
              Resume
            </button>
          )}
        </div>
      </section>

      {health?.contradictions && health.contradictions.length > 0 && (
        <section className="card contradictions" aria-label="Contradictions">
          <h3>Verification findings</h3>
          {health.contradictions.map((c, n) => (
            <p key={n} className={`contra contra-${c.severity}`}>
              [{c.severity}] {c.detail}
            </p>
          ))}
        </section>
      )}

      {/* Approvals */}
      <section aria-label="Pending approvals">
        <h3>Pending approvals {pending.length > 0 && <span className="count">{pending.length}</span>}</h3>
        {pending.length === 0 && (
          <p className="secondary empty">Nothing needs you right now.</p>
        )}
        {pending.map((i) => (
          <div key={i.ref} className="card initiative">
            <div className="ini-head">
              <span className={`risk risk-${i.risk}`}>{i.risk}</span>
              <strong>{i.ref}</strong>
            </div>
            <p className="title">{i.title}</p>
            <p className="secondary">{i.rationale}</p>
            {i.expected_outcome && (
              <p className="secondary small">Expected: {i.expected_outcome}</p>
            )}
            <div className="actions">
              <button
                className="btn primary"
                disabled={busyRef !== null}
                onClick={() => act(`/initiatives/${i.ref}/approve`, i.ref, `${i.ref} approved.`)}
              >
                {busyRef === i.ref ? "Working…" : "Approve"}
              </button>
              <button
                className="btn danger"
                disabled={busyRef !== null}
                onClick={() => act(`/initiatives/${i.ref}/reject`, i.ref + ":r", `${i.ref} rejected.`)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* All initiatives */}
      <section aria-label="Initiative history">
        <h3>Initiative history</h3>
        {others.length === 0 && <p className="secondary empty">No delivered work yet.</p>}
        {others.map((i) => (
          <div key={i.ref} className="row">
            <span className={`risk risk-${i.risk}`}>{i.risk}</span>
            <span className="mono">{i.ref}</span>
            <span className={`status st-${i.status}`}>{i.status.replace("_", " ")}</span>
            <span className="grow truncate">{i.title}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

const css = `
.panel { font-family: system-ui, sans-serif; color: var(--text-primary);
         max-width: 720px; margin: 0 auto; display: grid; gap: var(--space-4); }
.header { display: flex; justify-content: space-between; align-items: baseline; }
.header h2 { margin: 0; font-size: var(--text-xl); }
.mission { margin: var(--space-1) 0 0; }
.card { background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); box-shadow: var(--shadow);
        padding: var(--space-4); }
.health { display: flex; gap: var(--space-3); align-items: center; }
.dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.grow { flex: 1; min-width: 0; }
.actions { display: flex; gap: var(--space-2); }
.btn { border: 1px solid var(--border); background: var(--surface-alt);
       color: var(--text-primary); border-radius: var(--radius);
       padding: 6px 14px; font-size: var(--text-sm); cursor: pointer; }
.btn:hover:not(:disabled) { filter: brightness(0.97); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn:disabled { opacity: .5; cursor: default; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.danger { color: var(--health-critical); border-color: var(--health-critical); }
.btn.ghost { border: none; background: none; }
.banner { background: var(--surface-alt); border: 1px solid var(--border);
          border-radius: var(--radius); padding: var(--space-2) var(--space-3);
          display: flex; justify-content: space-between; align-items: center; }
.count { background: var(--health-critical); color: #fff; border-radius: 10px;
         padding: 1px 8px; font-size: var(--text-xs); vertical-align: middle; }
.initiative { display: grid; gap: var(--space-2); margin-bottom: var(--space-3); }
.ini-head { display: flex; gap: var(--space-2); align-items: center; }
.risk { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: .04em;
        padding: 2px 8px; border-radius: 999px; color: #fff; }
.risk-low { background: var(--risk-low); } .risk-medium { background: var(--risk-medium); }
.risk-high { background: var(--risk-high); } .risk-critical { background: var(--risk-critical); }
.row { display: flex; gap: var(--space-3); align-items: center;
       padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
.mono { font-family: ui-monospace, monospace; font-size: var(--text-sm); }
.status { font-size: var(--text-xs); color: var(--text-secondary); }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.secondary { color: var(--text-secondary); }
.small { font-size: var(--text-xs); }
.empty { font-style: italic; }
.contra-high { color: var(--health-critical); }
.contra-medium { color: var(--health-degraded); }
.contra-low { color: var(--text-secondary); }
.phase { font-size: var(--text-xs); padding: 2px 10px; border-radius: 999px;
         border: 1px solid var(--border); color: var(--text-secondary); }
.phase-frozen { color: var(--health-critical); border-color: var(--health-critical); }
`;

export default StewardshipPanel;

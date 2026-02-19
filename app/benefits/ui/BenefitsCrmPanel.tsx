"use client";

import { useEffect, useMemo, useState } from "react";
import type { BenefitsCrmClient, BenefitsCrmEligibilityCheck, BenefitsCrmFollowUp, BenefitsCrmStatusSummary } from "@/lib/benefitscrm/types";

type View = "lane1" | "lane2" | "lane3" | "lane4";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BenefitsCrmPanel() {
  const [view, setView] = useState<View>("lane1");
  const [status, setStatus] = useState<BenefitsCrmStatusSummary | null>(null);
  const [clients, setClients] = useState<BenefitsCrmClient[]>([]);
  const [followups, setFollowups] = useState<BenefitsCrmFollowUp[]>([]);
  const [eligibility, setEligibility] = useState<BenefitsCrmEligibilityCheck[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [leadType, setLeadType] = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient = useMemo(() => clients.find((c) => c.id === selectedClientId) || null, [clients, selectedClientId]);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const [sRes, cRes, fRes, eRes, aRes] = await Promise.all([
          fetch("/api/benefitscrm/status", { cache: "no-store" }),
          fetch(`/api/benefitscrm/clients?q=${encodeURIComponent(q)}&status=${encodeURIComponent(clientStatus)}&leadType=${encodeURIComponent(leadType)}&limit=50`, { cache: "no-store" }),
          fetch("/api/benefitscrm/followups?limit=50", { cache: "no-store" }),
          fetch("/api/benefitscrm/eligibility?limit=50", { cache: "no-store" }),
          fetch("/api/benefitscrm/audit?limit=50", { cache: "no-store" }),
        ]);

        const sJson = await sRes.json();
        const cJson = await cRes.json();
        const fJson = await fRes.json();
        const eJson = await eRes.json();
        const aJson = await aRes.json();

        if (stopped) return;
        setStatus(sJson?.ok ? sJson.data : null);
        setClients(Array.isArray(cJson?.items) ? cJson.items : []);
        setFollowups(Array.isArray(fJson?.items) ? fJson.items : []);
        setEligibility(Array.isArray(eJson?.items) ? eJson.items : []);
        setAudit(Array.isArray(aJson?.items) ? aJson.items : []);
      } catch {
        if (stopped) return;
        setStatus(null);
      }
    };

    tick().catch(() => {});
    const interval = setInterval(() => tick().catch(() => {}), 4000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [q, clientStatus, leadType]);

  const posture = status?.posture || "nominal";

  return (
    <div className="wrap">
      <div className="laneHeader">
        <div className="laneTitle">
          <div className="logo">B</div>
          <div>
            <div className="h1">Benefits CRM Sovereign</div>
            <div className="sub">Intake triage, follow-ups, eligibility, and workflow automation</div>
          </div>
        </div>
        <div className="right">
          <div className={cls("posture", posture === "nominal" && "pNominal", posture === "degraded" && "pDegraded", posture === "critical" && "pCritical")}>
            <span className="dot" />
            <span className="label">POSTURE</span>
            <span className="value">{posture.toUpperCase()}</span>
          </div>
          <div className="sync">
            <div className="syncLabel">Last Sync</div>
            <div className="syncValue">{status?.lastSync ? new Date(status.lastSync).toLocaleTimeString() : "—"}</div>
          </div>
        </div>
      </div>

      <div className="laneCards">
        <LaneCard
          active={view === "lane1"}
          onClick={() => setView("lane1")}
          title="Lane 1 — Lead Intake"
          subtitle="Process new leads, check for duplicates, and route to the right team"
        />
        <LaneCard
          active={view === "lane2"}
          onClick={() => setView("lane2")}
          title="Lane 2 — Follow-ups"
          subtitle="Send reminders, track responses, and manage follow-up tasks"
        />
        <LaneCard
          active={view === "lane3"}
          onClick={() => setView("lane3")}
          title="Lane 3 — Eligibility Check"
          subtitle="Verify insurance eligibility and track enrollment status"
        />
        <LaneCard
          active={view === "lane4"}
          onClick={() => setView("lane4")}
          title="Lane 4 — Automation"
          subtitle="Set up automated workflows and notification triggers"
          tone="amber"
        />
      </div>

      <div className="content">
        {view === "lane1" ? (
          <div className="grid2">
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">Lead Management</div>
                  <div className="panelSub">Process new insurance leads and manage client information</div>
                </div>
                <div className="filters">
                  <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/email/phone…" />
                  <select className="input" value={clientStatus} onChange={(e) => setClientStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="New">New</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="Lost">Lost</option>
                  </select>
                  <select className="input" value={leadType} onChange={(e) => setLeadType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="ACA">ACA</option>
                    <option value="Medicare">Medicare</option>
                    <option value="Employer">Employer</option>
                    <option value="Individual/Family">Ind/Fam</option>
                  </select>
                </div>
              </div>

              <div className="statsRow">
                <Stat label="TOTAL" value={String(status?.counts.clients ?? "—")} tone="neutral" />
                <Stat label="FOLLOWUPS" value={String(status?.counts.followups.pending ?? "—")} tone="cyan" />
                <Stat label="OVERDUE" value={String(status?.counts.followups.overdue ?? "—")} tone="rose" />
                <Stat label="ENROLLED" value={String(status?.counts.byStatus?.Enrolled ?? 0)} tone="emerald" />
              </div>

              <div className="list">
                {clients.length === 0 ? (
                  <div className="empty">No clients found.</div>
                ) : (
                  clients.map((c) => (
                    <button
                      key={c.id}
                      className={cls("row", selectedClientId === c.id && "rowActive")}
                      onClick={() => setSelectedClientId(c.id)}
                    >
                      <div className="rowTop">
                        <div className="chips">
                          {c.leadType ? <span className={cls("chip", "chipType")}>{c.leadType}</span> : null}
                          {c.status ? <span className={cls("chip", "chipStatus")}>{c.status}</span> : null}
                          {c.priority ? <span className={cls("chip", "chipPrio")}>{c.priority.toUpperCase()}</span> : null}
                        </div>
                        <div className="time">{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}</div>
                      </div>
                      <div className="rowMid">
                        <div className="name">{c.name || c.email || c.phone || c.id}</div>
                        <div className="meta">
                          <span>{c.email || "—"}</span>
                          <span className="sep">·</span>
                          <span>{c.phone || "—"}</span>
                          {c.eligibilityCategory ? (
                            <>
                              <span className="sep">·</span>
                              <span className="link">{`Eligibility: ${c.eligibilityCategory}`}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">Lead Detail View</div>
                  <div className="panelSub">Client profile, posture, and next actions</div>
                </div>
                <button
                  className={cls("btn", !selectedClient && "btnDisabled")}
                  onClick={() => {}}
                  disabled={!selectedClient}
                >
                  View →
                </button>
              </div>

              {!selectedClient ? (
                <div className="empty">Select a client from Lane 1 to inspect details.</div>
              ) : (
                <div className="detail">
                  <div className="detailTitle">{selectedClient.name || selectedClient.email || selectedClient.phone || selectedClient.id}</div>
                  <div className="detailGrid">
                    <Detail label="Lead Type" value={selectedClient.leadType || "—"} />
                    <Detail label="Status" value={selectedClient.status || "—"} />
                    <Detail label="Priority" value={selectedClient.priority || "—"} />
                    <Detail label="Next Follow-up" value={selectedClient.nextFollowUp ? new Date(selectedClient.nextFollowUp).toLocaleString() : "—"} />
                    <Detail label="Last Contact" value={selectedClient.lastContact ? new Date(selectedClient.lastContact).toLocaleString() : "—"} />
                    <Detail label="Eligibility" value={selectedClient.eligibilityCategory || "—"} />
                  </div>
                  <div className="notes">
                    <div className="notesLabel">Notes</div>
                    <div className="notesBody">{selectedClient.notes || "—"}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {view === "lane2" ? (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">Follow-up Tasks</div>
                  <div className="panelSub">Track upcoming reminders and manage client follow-ups</div>
                </div>
              <div className="mini">
                pending: {status?.counts.followups.pending ?? "—"} · overdue: {status?.counts.followups.overdue ?? "—"} · completed:{" "}
                {status?.counts.followups.completed ?? "—"}
              </div>
            </div>

            <div className="list">
              {followups.length === 0 ? (
                <div className="empty">No follow-ups found.</div>
              ) : (
                followups.map((f) => (
                  <div key={f.id} className="row rowStatic">
                    <div className="rowTop">
                      <div className="chips">
                        {f.type ? <span className={cls("chip", "chipType")}>{String(f.type).toUpperCase()}</span> : null}
                        {f.status ? <span className={cls("chip", "chipStatus")}>{f.status}</span> : null}
                        {f.priority ? <span className={cls("chip", "chipPrio")}>{f.priority.toUpperCase()}</span> : null}
                        {f.smsSent ? <span className={cls("chip", "chipOk")}>SMS</span> : <span className={cls("chip", "chipWarn")}>NO SMS</span>}
                      </div>
                      <div className="time">{f.dueDate ? new Date(f.dueDate).toLocaleString() : "—"}</div>
                    </div>
                    <div className="rowMid">
                      <div className="name">{f.title || "Follow-up"}</div>
                      <div className="meta">
                        <span className="subtle">{f.clientId ? `Client: ${f.clientId}` : "Client: —"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {view === "lane3" ? (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">Eligibility Verification</div>
                  <div className="panelSub">Check insurance eligibility and track enrollment progress</div>
                </div>
              <button className="btn" onClick={() => window.location.reload()}>
                Refresh
              </button>
            </div>

            <div className="statsRow">
              <Stat label="TOTAL" value={String(status?.counts.eligibility.total ?? "—")} />
              <Stat label="PENDING" value={String(status?.counts.eligibility.pending ?? "—")} tone="amber" />
              <Stat label="VERIFIED" value={String(status?.counts.eligibility.verified ?? "—")} tone="emerald" />
              <Stat label="DENIED" value={String(status?.counts.eligibility.denied ?? "—")} tone="rose" />
              <Stat label="NEEDS INFO" value={String(status?.counts.eligibility.needsInfo ?? "—")} tone="violet" />
              <Stat label="AVG TIME" value={status?.counts.eligibility.avgMinutes != null ? `${status.counts.eligibility.avgMinutes}m` : "—"} tone="cyan" />
            </div>

            <div className="list">
              {eligibility.length === 0 ? (
                <div className="empty">
                  No eligibility records found. If your base uses a different table name, set `BENEFITSCRM_TABLE_ELIGIBILITY` to the table name.
                </div>
              ) : (
                eligibility.map((e) => (
                  <div key={e.id} className="row rowStatic">
                    <div className="rowTop">
                      <div className="chips">
                        {e.status ? <span className={cls("chip", "chipStatus")}>{e.status}</span> : null}
                        {e.leadType ? <span className={cls("chip", "chipType")}>{e.leadType}</span> : null}
                        {e.confidence != null ? <span className={cls("chip", "chipOk")}>{Math.round(e.confidence * 100)}%</span> : null}
                      </div>
                      <div className="time">
                        {e.checkedAt ? `Checked: ${new Date(e.checkedAt).toLocaleString()}` : e.requestedAt ? `Requested: ${new Date(e.requestedAt).toLocaleString()}` : "—"}
                      </div>
                    </div>
                    <div className="rowMid">
                      <div className="name">{e.clientName || e.clientId || e.id}</div>
                      <div className="meta">
                        <span className="subtle">{e.notes || "—"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {view === "lane4" ? (
          <div className="grid2">
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">Automation Setup</div>
                  <div className="panelSub">Configure automated workflows and system notifications</div>
                </div>
              </div>
              <div className="list">
                {audit.length === 0 ? (
                  <div className="empty">No Benefits CRM signals observed yet. Trigger an intake to start the circuit.</div>
                ) : (
                  audit.map((s) => (
                    <div key={s.signalId || s.id} className="row rowStatic">
                      <div className="rowTop">
                        <div className="chips">
                          <span className={cls("chip", "chipType")}>{String(s.type || "signal")}</span>
                          <span className={cls("chip", s.severity === "error" ? "chipWarn" : "chipOk")}>{String(s.severity || "info")}</span>
                        </div>
                        <div className="time">{s.timestamp ? new Date(s.timestamp).toLocaleString() : "—"}</div>
                      </div>
                      <div className="rowMid">
                        <div className="meta">
                          <span className="subtle">{truncate(JSON.stringify(s.payload || {}), 140)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">Manual Triggers</div>
                  <div className="panelSub">Test automation workflows manually</div>
                </div>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => trigger("benefits-intake", "process_intake")}>
                  Process New Leads
                </button>
                <button className="btn" onClick={() => trigger("benefits-followup", "process_tasks")}>
                  Send Follow-up Reminders
                </button>
              </div>
              <div className="mini subtle" style={{ marginTop: 10 }}>
                Use these buttons to manually run automated processes. This is helpful for testing while setting up automated triggers.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .wrap {
          padding: 18px 0 0 0;
        }
        .laneHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .laneTitle {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .logo {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(6, 182, 212, 0.25);
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(168, 85, 247, 0.08));
          color: rgb(6, 182, 212);
          font-weight: 800;
          box-shadow: 0 0 24px rgba(6, 182, 212, 0.12);
        }
        .h1 {
          font-size: 22px;
          font-weight: 780;
          color: var(--text-0);
          letter-spacing: -0.02em;
        }
        .sub {
          font-size: 12px;
          color: var(--text-2);
          margin-top: 4px;
          font-family: var(--font-mono);
        }
        .right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .posture {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }
        .posture .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.15);
        }
        .posture .label {
          font-size: 10px;
          color: var(--text-2);
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .posture .value {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--text-0);
        }
        .pNominal {
          border-color: rgba(16, 185, 129, 0.22);
          background: rgba(16, 185, 129, 0.08);
        }
        .pNominal .dot {
          background: rgb(16, 185, 129);
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.28);
        }
        .pDegraded {
          border-color: rgba(245, 158, 11, 0.22);
          background: rgba(245, 158, 11, 0.08);
        }
        .pDegraded .dot {
          background: rgb(245, 158, 11);
          box-shadow: 0 0 18px rgba(245, 158, 11, 0.28);
        }
        .pCritical {
          border-color: rgba(239, 68, 68, 0.22);
          background: rgba(239, 68, 68, 0.08);
        }
        .pCritical .dot {
          background: rgb(239, 68, 68);
          box-shadow: 0 0 18px rgba(239, 68, 68, 0.28);
        }
        .sync {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .syncLabel {
          font-size: 9px;
          color: var(--text-2);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .syncValue {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-1);
          margin-top: 2px;
        }
        .laneCards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .content {
          margin-top: 6px;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 14px;
        }
        .panel {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
        }
        .panelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .panelTitle {
          font-weight: 820;
          color: var(--text-0);
          letter-spacing: -0.01em;
        }
        .panelSub {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-2);
        }
        .filters {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .input {
          height: 40px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-0);
          outline: none;
          min-width: 160px;
        }
        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
          margin-bottom: 10px;
        }
        .list {
          margin-top: 10px;
          display: grid;
          gap: 10px;
        }
        .row {
          text-align: left;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.18);
          padding: 12px;
          cursor: pointer;
          transition: transform 140ms var(--ease-out), border-color 140ms var(--ease-out);
        }
        .row:hover {
          transform: translateY(-1px);
          border-color: rgba(6, 182, 212, 0.18);
        }
        .rowStatic {
          cursor: default;
        }
        .rowActive {
          border-color: rgba(6, 182, 212, 0.38);
          box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.16), 0 18px 40px rgba(0, 0, 0, 0.25);
        }
        .rowTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .chips {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .chip {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-1);
          text-transform: uppercase;
        }
        .chipType {
          border-color: rgba(6, 182, 212, 0.2);
          color: rgb(6, 182, 212);
          background: rgba(6, 182, 212, 0.08);
        }
        .chipStatus {
          border-color: rgba(148, 163, 184, 0.18);
          background: rgba(148, 163, 184, 0.06);
        }
        .chipPrio {
          border-color: rgba(245, 158, 11, 0.2);
          color: rgb(245, 158, 11);
          background: rgba(245, 158, 11, 0.08);
        }
        .chipOk {
          border-color: rgba(16, 185, 129, 0.2);
          color: rgb(16, 185, 129);
          background: rgba(16, 185, 129, 0.07);
        }
        .chipWarn {
          border-color: rgba(244, 63, 94, 0.2);
          color: rgb(244, 63, 94);
          background: rgba(244, 63, 94, 0.08);
        }
        .time {
          font-size: 11px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }
        .rowMid {
          margin-top: 10px;
          display: grid;
          gap: 6px;
        }
        .name {
          font-weight: 760;
          color: var(--text-0);
        }
        .meta {
          font-size: 12px;
          color: var(--text-2);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sep {
          opacity: 0.5;
        }
        .link {
          color: rgb(6, 182, 212);
        }
        .empty {
          padding: 22px 12px;
          color: var(--text-2);
          font-size: 13px;
          text-align: center;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 14px;
        }
        .btn {
          height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(6, 182, 212, 0.22);
          background: rgba(6, 182, 212, 0.10);
          color: rgb(6, 182, 212);
          font-weight: 800;
          cursor: pointer;
        }
        .btnDisabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .detail {
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.18);
          padding: 14px;
        }
        .detailTitle {
          font-size: 16px;
          font-weight: 850;
          color: var(--text-0);
        }
        .detailGrid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .notes {
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .notesLabel {
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--text-2);
          font-family: var(--font-mono);
        }
        .notesBody {
          margin-top: 6px;
          color: var(--text-1);
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .mini {
          font-size: 12px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }
        .subtle {
          color: var(--text-2);
        }
        .actions {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }
        @media (max-width: 1100px) {
          .laneCards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function LaneCard(props: { title: string; subtitle: string; active: boolean; onClick: () => void; tone?: "amber" }) {
  return (
    <button className={cls("card", props.active && "active", props.tone === "amber" && "amber")} onClick={props.onClick}>
      <div className="t">{props.title}</div>
      <div className="s">{props.subtitle}</div>
      <style jsx>{`
        .card {
          text-align: left;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 160ms var(--ease-out);
        }
        .card:hover {
          border-color: rgba(6, 182, 212, 0.18);
          transform: translateY(-1px);
        }
        .card.active {
          border-color: rgba(6, 182, 212, 0.38);
          background: rgba(6, 182, 212, 0.06);
          box-shadow: 0 0 28px rgba(6, 182, 212, 0.12);
        }
        .card.amber.active {
          border-color: rgba(245, 158, 11, 0.35);
          background: rgba(245, 158, 11, 0.07);
          box-shadow: 0 0 28px rgba(245, 158, 11, 0.10);
        }
        .t {
          font-weight: 850;
          color: var(--text-0);
          font-size: 12px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .s {
          margin-top: 6px;
          color: var(--text-2);
          font-size: 12px;
        }
      `}</style>
    </button>
  );
}

function Stat(props: { label: string; value: string; tone?: "neutral" | "cyan" | "emerald" | "amber" | "rose" | "violet" }) {
  const tone = props.tone || "neutral";
  const toneMap: Record<string, { fg: string; bg: string; border: string }> = {
    neutral: { fg: "var(--text-0)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)" },
    cyan: { fg: "rgb(6, 182, 212)", bg: "rgba(6, 182, 212, 0.08)", border: "rgba(6, 182, 212, 0.18)" },
    emerald: { fg: "rgb(16, 185, 129)", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.18)" },
    amber: { fg: "rgb(245, 158, 11)", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.18)" },
    rose: { fg: "rgb(244, 63, 94)", bg: "rgba(244, 63, 94, 0.08)", border: "rgba(244, 63, 94, 0.18)" },
    violet: { fg: "rgb(168, 85, 247)", bg: "rgba(168, 85, 247, 0.08)", border: "rgba(168, 85, 247, 0.18)" },
  };
  const t = toneMap[tone] || toneMap.neutral;

  return (
    <div className="stat" style={{ borderColor: t.border, background: t.bg }}>
      <div className="v" style={{ color: t.fg }}>
        {props.value}
      </div>
      <div className="l">{props.label}</div>
      <style jsx>{`
        .stat {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid;
          display: grid;
          gap: 4px;
          align-content: start;
        }
        .v {
          font-family: var(--font-mono);
          font-size: 18px;
          font-weight: 850;
        }
        .l {
          font-size: 10px;
          color: var(--text-2);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

function Detail(props: { label: string; value: string }) {
  return (
    <div className="d">
      <div className="k">{props.label}</div>
      <div className="v">{props.value}</div>
      <style jsx>{`
        .d {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }
        .k {
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-2);
          font-family: var(--font-mono);
          text-transform: uppercase;
        }
        .v {
          margin-top: 6px;
          font-weight: 760;
          color: var(--text-0);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

async function trigger(agentId: string, action: string) {
  await fetch(`/api/cockpit/agent/${encodeURIComponent(agentId)}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, mode: "direct", payload: {} }),
  });
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

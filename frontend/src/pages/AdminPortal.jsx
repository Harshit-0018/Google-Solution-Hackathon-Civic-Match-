import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import HeatMap from "../components/HeatMap";
import { StatCard, ScoreBar } from "../components/Cards";
import { UrgencyBadge, StatusBadge, SkillTag } from "../components/Badges";
import { toast } from "sonner";
import { Check, Trash2, Play, Database, Shield, ShieldCheck, Inbox, Gift, CheckCircle2, X } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/ngos", label: "NGOs" },
  { to: "/admin/volunteers", label: "Volunteers" },
  { to: "/admin/matching", label: "Run Matching" },
  { to: "/admin/pipeline", label: "Form Submissions" },
  { to: "/admin/redemptions", label: "Redemptions" },
  { to: "/admin/audit", label: "Audit Log" },
];

export default function AdminPortal() {
  return (
    <Layout nav={NAV} portalLabel="ADMIN">
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="ngos" element={<ManageNGOs />} />
        <Route path="volunteers" element={<ManageVolunteers />} />
        <Route path="matching" element={<RunMatching />} />
        <Route path="pipeline" element={<PipelineSubmissions />} />
        <Route path="redemptions" element={<Redemptions />} />
        <Route path="audit" element={<AuditLog />} />
      </Routes>
    </Layout>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const [s, a, t] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/audit-logs", { params: { limit: 10 } }),
      api.get("/tasks"),
    ]);
    setStats(s.data); setAudit(a.data); setTasks(t.data);
  };

  useEffect(() => { load(); }, []);

  const seedDemo = async () => {
    if (!window.confirm("This will replace all non-admin data with Kerala demo data. Continue?")) return;
    setSeeding(true);
    try {
      await api.post("/admin/seed-demo");
      toast.success("Demo data seeded: 3 NGOs, 15 volunteers, 10 tasks");
      load();
    } catch { toast.error("Seed failed"); } finally { setSeeding(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-mono mb-2">System Overview</div>
          <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter">Control Room</h1>
        </div>
        <button data-testid="seed-demo-btn" onClick={seedDemo} disabled={seeding}
          className="btn-outline-black px-4 py-2 text-sm inline-flex items-center gap-2">
          <Database size={14} /> {seeding ? "SEEDING..." : "SEED DEMO DATA"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
          <StatCard label="NGOs" value={stats.ngos_total} sublabel={`${stats.ngos_verified} verified`} />
          <StatCard label="Volunteers" value={stats.volunteers} />
          <StatCard label="Tasks" value={stats.tasks_total} sublabel={`${stats.tasks_open} open`} />
          <StatCard label="Matches (7d)" value={stats.matches_week} sublabel={`${stats.matches_total} total`} />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Global Urgency Map</div>
          <HeatMap height={420} points={tasks.map((t) => ({ lat: t.location_lat, lng: t.location_lng, weight: t.urgency, title: t.title, category: t.category, location_name: t.location_name }))} />
        </div>
        <div className="lg:col-span-2 border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Recent Audit Activity</div>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {audit.map((a) => (
              <div key={a.log_id} className="border-b border-[#E5E5E5] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider bg-[#111] text-white px-2 py-0.5">{a.action}</span>
                </div>
                <div className="text-xs text-[#5C5C5C] mt-1">
                  {a.performed_by_name} · {new Date(a.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageNGOs() {
  const [ngos, setNgos] = useState([]);
  const load = async () => {
    const { data } = await api.get("/ngos");
    setNgos(data);
  };
  useEffect(() => { load(); }, []);

  const verify = async (id) => {
    await api.put(`/ngos/${id}/verify`); toast.success("Verified"); load();
  };
  const del = async (id) => {
    if (!window.confirm("Delete this NGO?")) return;
    await api.delete(`/ngos/${id}`); toast.success("Deleted"); load();
  };

  return (
    <div>
      <div className="label-mono mb-2">NGO Management</div>
      <h1 className="font-heading font-black text-4xl tracking-tighter mb-6">Organisations</h1>
      <div className="border border-[#E5E5E5] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
            <tr>
              <Th>NAME</Th><Th>FOCUS</Th><Th>LOCATION</Th><Th>TASKS</Th><Th>STATUS</Th><Th>ACTIONS</Th>
            </tr>
          </thead>
          <tbody>
            {ngos.map((n) => (
              <tr key={n.ngo_id} className="border-b border-[#E5E5E5]">
                <Td><div className="font-medium">{n.name}</div><div className="text-[10px] font-mono text-[#5C5C5C]">{n.registration_no}</div></Td>
                <Td><div className="flex flex-wrap gap-1">{n.focus_areas?.map((f) => <SkillTag key={f}>{f}</SkillTag>)}</div></Td>
                <Td className="font-mono text-xs">{n.location_name}</Td>
                <Td>{n.total_tasks_posted || 0}</Td>
                <Td>{n.verified ? <span className="text-[#00C05A] inline-flex items-center gap-1 font-mono text-xs"><ShieldCheck size={12}/>VERIFIED</span> : <span className="text-[#FF2A2A] inline-flex items-center gap-1 font-mono text-xs"><Shield size={12}/>UNVERIFIED</span>}</Td>
                <Td>
                  <div className="flex gap-2">
                    {!n.verified && <button data-testid={`verify-ngo-${n.ngo_id}`} onClick={() => verify(n.ngo_id)} className="btn-primary px-2 py-1 text-[10px] inline-flex items-center gap-1"><Check size={10}/>VERIFY</button>}
                    <button data-testid={`delete-ngo-${n.ngo_id}`} onClick={() => del(n.ngo_id)} className="btn-outline-black px-2 py-1 text-[10px] inline-flex items-center gap-1"><Trash2 size={10}/>DELETE</button>
                  </div>
                </Td>
              </tr>
            ))}
            {ngos.length === 0 && <tr><Td colSpan={6} className="text-center py-8 text-[#5C5C5C]">No NGOs yet.</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManageVolunteers() {
  const [vols, setVols] = useState([]);
  const load = async () => {
    const { data } = await api.get("/admin/users", { params: { role: "volunteer" } });
    setVols(data);
  };
  useEffect(() => { load(); }, []);

  const verify = async (id) => { await api.put(`/users/${id}/verify`); toast.success("Verified"); load(); };
  const del = async (id) => { if (!window.confirm("Delete?")) return; await api.delete(`/users/${id}`); toast.success("Deleted"); load(); };

  return (
    <div>
      <div className="label-mono mb-2">Volunteer Management</div>
      <h1 className="font-heading font-black text-4xl tracking-tighter mb-6">Volunteers</h1>
      <div className="border border-[#E5E5E5] bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
            <tr><Th>NAME</Th><Th>SKILLS</Th><Th>LOCATION</Th><Th>POINTS</Th><Th>BADGES</Th><Th>ACTIONS</Th></tr>
          </thead>
          <tbody>
            {vols.map((v) => (
              <tr key={v.user_id} className="border-b border-[#E5E5E5]">
                <Td><div className="font-medium">{v.name}</div><div className="text-[10px] font-mono text-[#5C5C5C]">{v.email}</div></Td>
                <Td><div className="flex flex-wrap gap-1">{(v.skills || []).slice(0, 3).map((s) => <SkillTag key={s}>{s}</SkillTag>)}</div></Td>
                <Td className="font-mono text-xs">{v.location_name}</Td>
                <Td className="font-mono font-bold">{v.total_points || 0}</Td>
                <Td>{(v.badges || []).length}</Td>
                <Td>
                  <div className="flex gap-2">
                    {!v.verified && <button onClick={() => verify(v.user_id)} className="btn-primary px-2 py-1 text-[10px]">VERIFY</button>}
                    <button onClick={() => del(v.user_id)} className="btn-outline-black px-2 py-1 text-[10px]">DELETE</button>
                  </div>
                </Td>
              </tr>
            ))}
            {vols.length === 0 && <tr><Td colSpan={6} className="text-center py-8 text-[#5C5C5C]">No volunteers yet.</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RunMatching() {
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.get("/tasks").then(({ data }) => setTasks(data.filter((t) => ["open", "matching"].includes(t.status))));
  }, []);

  const pickTask = async (t) => {
    setSelected(t);
    const { data } = await api.get(`/match/task/${t.task_id}`);
    setMatches(data);
  };

  const runMatch = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const { data } = await api.post(`/match/run/${selected.task_id}`);
      setMatches(data.matches);
      toast.success(`Matched ${data.matches.length} volunteers`);
    } catch { toast.error("Matching failed"); }
    setRunning(false);
  };

  return (
    <div>
      <div className="label-mono mb-2">AI Matching</div>
      <h1 className="font-heading font-black text-4xl tracking-tighter mb-6">Run the algorithm</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Open Tasks</div>
          <div className="space-y-2 max-h-[600px] overflow-auto">
            {tasks.map((t) => (
              <button key={t.task_id} onClick={() => pickTask(t)} data-testid={`pick-task-${t.task_id}`}
                className={`w-full text-left p-3 border ${selected?.task_id === t.task_id ? "border-[#002FA7] bg-[#F0F4FF]" : "border-[#E5E5E5]"}`}>
                <div className="flex items-center gap-1 mb-1"><UrgencyBadge value={t.urgency} /></div>
                <div className="font-bold text-sm">{t.title}</div>
                <div className="text-[10px] text-[#5C5C5C] font-mono">{t.location_name}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              <div className="border border-[#E5E5E5] bg-white p-5">
                <div className="flex items-center gap-2 mb-2">
                  <UrgencyBadge value={selected.urgency} />
                  <StatusBadge status={selected.status} />
                </div>
                <h3 className="font-heading font-bold text-xl mb-2">{selected.title}</h3>
                <p className="text-sm text-[#5C5C5C] mb-3">{selected.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">{selected.required_skills?.map((s) => <SkillTag key={s}>{s}</SkillTag>)}</div>
                <button data-testid="admin-run-match-btn" onClick={runMatch} disabled={running}
                  className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
                  <Play size={14} /> {running ? "RUNNING..." : "RUN AI MATCHING"}
                </button>
              </div>

              <div className="space-y-3 stagger-in">
                {matches.map((m, i) => (
                  <div key={m.match_id} className="border border-[#E5E5E5] bg-white p-4">
                    <div className="grid lg:grid-cols-12 gap-3 items-center">
                      <div className="lg:col-span-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#111] text-white flex items-center justify-center font-mono text-xs">#{i + 1}</div>
                          <div>
                            <div className="font-bold">{m.volunteer_name}</div>
                            <div className="label-mono">{Math.round(m.distance_km)} KM</div>
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-2 text-center">
                        <div className="label-mono">Score</div>
                        <div className="font-heading font-black text-2xl text-[#002FA7]">{Math.round(m.score_total * 100)}%</div>
                      </div>
                      <div className="lg:col-span-5 grid grid-cols-2 gap-x-5 gap-y-1">
                        <ScoreBar label="Skill" value={m.score_skill} color="#002FA7" />
                        <ScoreBar label="Prox" value={m.score_proximity} color="#00C05A" />
                        <ScoreBar label="Avail" value={m.score_availability} color="#FFC000" />
                        <ScoreBar label="Impact" value={m.score_impact} color="#FF2A2A" />
                      </div>
                      <div className="lg:col-span-2"><StatusBadge status={m.status} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#E5E5E5] p-10 text-center text-[#5C5C5C]">
              Select a task from the left to run AI matching.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditLog() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs", { params: { limit: 100 } }).then(({ data }) => setLogs(data)); }, []);

  return (
    <div>
      <div className="label-mono mb-2">Audit</div>
      <h1 className="font-heading font-black text-4xl tracking-tighter mb-6">Immutable action log</h1>
      <div className="border border-[#E5E5E5] bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
            <tr><Th>TIMESTAMP</Th><Th>ACTION</Th><Th>ACTOR</Th><Th>TARGET</Th><Th>DATA</Th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.log_id} className="border-b border-[#E5E5E5]">
                <Td className="font-mono text-xs">{new Date(l.timestamp).toLocaleString()}</Td>
                <Td><span className="font-mono text-[10px] uppercase bg-[#111] text-white px-2 py-0.5">{l.action}</span></Td>
                <Td>{l.performed_by_name} <span className="text-[10px] font-mono text-[#5C5C5C]">{l.performed_by_role}</span></Td>
                <Td className="font-mono text-[10px]">{l.target_collection}:{l.target_id}</Td>
                <Td><pre className="text-[10px] font-mono text-[#5C5C5C]">{JSON.stringify(l.data, null, 0)}</pre></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) { return <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider">{children}</th>; }
function Td({ children, className = "", colSpan }) { return <td colSpan={colSpan} className={`px-4 py-3 align-top ${className}`}>{children}</td>; }

function PipelineSubmissions() {
  const [subs, setSubs] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [publishForm, setPublishForm] = useState({ ngo_id: "", title: "", volunteers_required: 5 });

  const load = async () => {
    const [s, n] = await Promise.all([
      api.get("/admin/pipeline", { params: filter === "all" ? {} : { status: filter } }),
      api.get("/ngos"),
    ]);
    setSubs(s.data); setNgos(n.data);
  };
  useEffect(() => { load(); }, [filter]);

  const pick = (s) => {
    setSelected(s);
    setPublishForm({
      ngo_id: ngos.find((n) => (n.focus_areas || []).includes(s.category))?.ngo_id || ngos[0]?.ngo_id || "",
      title: (s.description || "").slice(0, 60),
      volunteers_required: s.affected_count > 50 ? 10 : 5,
    });
  };

  const publish = async () => {
    if (!selected) return;
    try {
      await api.post(`/admin/pipeline/${selected.submission_id}/publish`, publishForm);
      toast.success("Published as open task");
      setSelected(null);
      load();
    } catch { toast.error("Publish failed"); }
  };

  const discard = async (id) => {
    if (!window.confirm("Discard this submission?")) return;
    await api.post(`/admin/pipeline/${id}/discard`);
    toast.success("Discarded");
    if (selected?.submission_id === id) setSelected(null);
    load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="label-mono mb-2">Google Forms Pipeline</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Field reports intake</h1>
          <p className="text-[#5C5C5C] text-sm mt-2">
            Paper surveys → Google Forms → webhook → Gemini translate + skill extract → admin review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="label-mono">Filter:</span>
          {["pending", "published", "discarded", "all"].map((f) => (
            <button key={f} data-testid={`pipeline-filter-${f}`} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-mono uppercase border ${filter === f ? "bg-[#111] text-white border-[#111]" : "border-[#E5E5E5]"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 border border-[#E5E5E5] bg-white p-3">
          <div className="label-mono mb-2 px-2">{subs.length} submissions</div>
          <div className="space-y-2 max-h-[640px] overflow-auto">
            {subs.map((s) => (
              <button key={s.submission_id} data-testid={`pipeline-pick-${s.submission_id}`} onClick={() => pick(s)}
                className={`w-full text-left p-3 border ${selected?.submission_id === s.submission_id ? "border-[#002FA7] bg-[#F0F4FF]" : "border-[#E5E5E5]"}`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <UrgencyBadge value={s.urgency || 3} />
                  <StatusBadge status={s.status} />
                  <span className="label-mono">{s.category}</span>
                </div>
                <div className="text-sm font-medium line-clamp-2">{s.description}</div>
                <div className="text-[10px] font-mono text-[#5C5C5C] mt-1">{s.area || s.raw_location} · {new Date(s.created_at).toLocaleString()}</div>
              </button>
            ))}
            {subs.length === 0 && (
              <div className="text-center py-10 text-[#5C5C5C] text-sm">
                <Inbox size={32} className="mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                No submissions. Send form data to<br/>
                <code className="text-[10px]">POST /api/pipeline/ingest</code>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-3">
          {selected ? (
            <div className="border border-[#E5E5E5] bg-white p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <UrgencyBadge value={selected.urgency || 3} />
                  <span className="label-mono">{selected.category}</span>
                  <span className="label-mono text-[#002FA7]">{selected.source?.toUpperCase()}</span>
                </div>
                <div className="font-heading font-bold text-lg mb-1">{selected.area || selected.raw_location}</div>
                <p className="text-sm text-[#5C5C5C]">{selected.description}</p>
                <div className="mt-2 text-xs font-mono">
                  <span className="text-[#5C5C5C]">Contact:</span> {selected.contact || "—"} &nbsp;·&nbsp;
                  <span className="text-[#5C5C5C]">Affected:</span> {selected.affected_count || 0}
                </div>
              </div>
              {selected.suggested_skills?.length > 0 && (
                <div>
                  <div className="label-mono text-[#002FA7] mb-1.5">GEMINI-SUGGESTED SKILLS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.suggested_skills.map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                  </div>
                </div>
              )}
              {selected.description_translated && Object.keys(selected.description_translated).length > 1 && (
                <div>
                  <div className="label-mono text-[#002FA7] mb-1.5">GEMINI TRANSLATIONS</div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(selected.description_translated)
                      .filter(([k]) => k !== "en")
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <div key={k} className="border-l-2 border-[#E5E5E5] pl-3">
                          <span className="label-mono text-[#5C5C5C]">{k.toUpperCase()}:</span> {v}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {selected.status === "pending" && (
                <div className="border-t border-[#E5E5E5] pt-5 space-y-3">
                  <div className="label-mono">Publish as open task</div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <label className="block">
                      <div className="label-mono mb-1">Assign NGO</div>
                      <select data-testid="pipeline-ngo-select" value={publishForm.ngo_id} onChange={(e) => setPublishForm({ ...publishForm, ngo_id: e.target.value })} className="border border-[#E5E5E5] px-2 py-2 w-full bg-white text-sm">
                        {ngos.filter((n) => n.verified).map((n) => (
                          <option key={n.ngo_id} value={n.ngo_id}>{n.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <div className="label-mono mb-1">Task title</div>
                      <input data-testid="pipeline-title" value={publishForm.title} onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })} className="border border-[#E5E5E5] px-2 py-2 w-full text-sm" />
                    </label>
                    <label className="block">
                      <div className="label-mono mb-1">Volunteers needed</div>
                      <input type="number" min="1" data-testid="pipeline-vol-count" value={publishForm.volunteers_required} onChange={(e) => setPublishForm({ ...publishForm, volunteers_required: parseInt(e.target.value || 1) })} className="border border-[#E5E5E5] px-2 py-2 w-full text-sm" />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button data-testid="pipeline-publish" onClick={publish} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
                      <CheckCircle2 size={14} /> PUBLISH
                    </button>
                    <button data-testid="pipeline-discard" onClick={() => discard(selected.submission_id)} className="btn-outline-black px-4 py-2 text-sm inline-flex items-center gap-2">
                      <X size={14} /> DISCARD
                    </button>
                  </div>
                </div>
              )}
              {selected.status === "published" && (
                <div className="border-t border-[#E5E5E5] pt-5 text-sm text-[#5C5C5C]">
                  Published as task <code className="font-mono">{selected.task_id}</code>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-[#E5E5E5] p-10 text-center text-[#5C5C5C] text-sm">
              Select a submission on the left to review, translate, publish or discard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Redemptions() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const load = async () => {
    const params = filter === "pending" ? { fulfilled: false } : filter === "fulfilled" ? { fulfilled: true } : {};
    const { data } = await api.get("/admin/redemptions", { params });
    setItems(data);
  };
  useEffect(() => { load(); }, [filter]);

  const fulfill = async (id) => {
    await api.put(`/admin/redemptions/${id}/fulfill`);
    toast.success("Marked fulfilled");
    load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="label-mono mb-2">Reward Fulfillment</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter inline-flex items-center gap-3">
            <Gift size={30} className="text-[#002FA7]" /> Redemptions
          </h1>
        </div>
        <div className="flex gap-2">
          {["pending", "fulfilled", "all"].map((f) => (
            <button key={f} data-testid={`redemption-filter-${f}`} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-mono uppercase border ${filter === f ? "bg-[#111] text-white border-[#111]" : "border-[#E5E5E5]"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="border border-[#E5E5E5] bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
            <tr><Th>DATE</Th><Th>VOLUNTEER</Th><Th>ITEM</Th><Th>COST</Th><Th>STATUS</Th><Th>ACTION</Th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.reward_id} className="border-b border-[#E5E5E5]">
                <Td className="font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</Td>
                <Td><div className="font-medium">{r.volunteer_name}</div><div className="text-[10px] font-mono text-[#5C5C5C]">{r.volunteer_id}</div></Td>
                <Td><div className="font-medium">{r.catalog_title}</div></Td>
                <Td className="font-mono font-bold">{Math.abs(r.points)} pts</Td>
                <Td>{r.fulfilled ? <span className="text-[#00C05A] font-mono text-xs">FULFILLED</span> : <span className="text-[#FFC000] font-mono text-xs">PENDING</span>}</Td>
                <Td>
                  {!r.fulfilled && (
                    <button data-testid={`fulfill-${r.reward_id}`} onClick={() => fulfill(r.reward_id)} className="btn-primary px-3 py-1.5 text-[10px] inline-flex items-center gap-1">
                      <CheckCircle2 size={10} /> FULFIL
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td colSpan={6} className="text-center py-10 text-[#5C5C5C]">No redemptions {filter === "pending" ? "pending" : filter === "fulfilled" ? "fulfilled" : "yet"}.</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

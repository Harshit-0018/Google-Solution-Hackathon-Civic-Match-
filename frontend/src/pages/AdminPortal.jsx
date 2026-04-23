import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import HeatMap from "../components/HeatMap";
import { StatCard, ScoreBar } from "../components/Cards";
import { UrgencyBadge, StatusBadge, SkillTag } from "../components/Badges";
import { toast } from "sonner";
import { Check, Trash2, Play, Database, Shield, ShieldCheck } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/ngos", label: "NGOs" },
  { to: "/admin/volunteers", label: "Volunteers" },
  { to: "/admin/matching", label: "Run Matching" },
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

import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, Routes, Route, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import HeatMap from "../components/HeatMap";
import { TaskCard, StatCard, ScoreBar } from "../components/Cards";
import { UrgencyBadge, StatusBadge, SkillTag } from "../components/Badges";
import { toast } from "sonner";
import { Plus, Play, CheckCircle2, Star, Users as UsersIcon } from "lucide-react";

const NAV = [
  { to: "/ngo", label: "Dashboard" },
  { to: "/ngo/post", label: "Post Task" },
  { to: "/ngo/tasks", label: "My Tasks" },
  { to: "/ngo/profile", label: "Profile" },
];

export default function NGOPortal() {
  return (
    <Layout nav={NAV} portalLabel="NGO">
      <Routes>
        <Route index element={<NGODashboard />} />
        <Route path="post" element={<PostTask />} />
        <Route path="tasks" element={<MyTasks />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="profile" element={<NGOProfile />} />
      </Routes>
    </Layout>
  );
}

function NGODashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ open: 0, active: 0, completed: 0, total: 0 });

  useEffect(() => {
    if (!user?.ngo_id) return;
    api.get("/tasks", { params: { ngo_id: user.ngo_id } }).then(({ data }) => {
      setTasks(data);
      setStats({
        total: data.length,
        open: data.filter((t) => t.status === "open").length,
        active: data.filter((t) => t.status === "active" || t.status === "matching").length,
        completed: data.filter((t) => t.status === "completed").length,
      });
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="label-mono mb-2">Overview</div>
          <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter">
            {user?.verified ? "Welcome back." : "Awaiting verification."}
          </h1>
          <p className="text-[#5C5C5C] mt-2">
            {user?.verified ? `Manage tasks and coverage for ${user?.name}.` : "Admin will verify your NGO soon. You can still browse."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
        <StatCard label="Total Tasks" value={stats.total} />
        <StatCard label="Open" value={stats.open} sublabel="Awaiting matching" />
        <StatCard label="Active" value={stats.active} sublabel="In progress" />
        <StatCard label="Completed" value={stats.completed} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Coverage Heatmap</div>
          <HeatMap
            height={420}
            points={tasks.map((t) => ({ lat: t.location_lat, lng: t.location_lng, weight: t.urgency, title: t.title, category: t.category, location_name: t.location_name }))}
          />
        </div>
        <div className="lg:col-span-2 border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Recent Tasks</div>
          <div className="space-y-3 max-h-[400px] overflow-auto">
            {tasks.slice(0, 5).map((t) => (
              <div key={t.task_id} className="border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <UrgencyBadge value={t.urgency} />
                  <StatusBadge status={t.status} />
                </div>
                <div className="font-heading font-bold">{t.title}</div>
                <div className="text-xs text-[#5C5C5C] font-mono">{t.location_name}</div>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-sm text-[#5C5C5C]">No tasks yet. Post your first task.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostTask() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", category: "healthcare", urgency: 3,
    required_skills: [], required_slots: ["morning", "afternoon"],
    volunteers_required: 5,
    location_lat: user?.location_lat || 11.25, location_lng: user?.location_lng || 75.78,
    location_name: user?.location_name || "Kerala", address: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });
  const [newSkill, setNewSkill] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.description) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/tasks", form);
      toast.success("Task posted — Gemini translated to 5 languages");
      navigate(`/ngo/tasks/${data.task_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to post task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="label-mono mb-2">Create Task</div>
      <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter mb-8">Post a new community need.</h1>

      <div className="border border-[#E5E5E5] bg-white p-6 lg:p-8 space-y-6">
        <Field label="Title">
          <input data-testid="task-title" className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
            value={form.title} onChange={(e) => upd("title", e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea data-testid="task-description" rows={4} className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
            value={form.description} onChange={(e) => upd("description", e.target.value)} />
          <p className="text-xs text-[#5C5C5C] mt-1 font-mono">Will be auto-translated to Hindi, Tamil, Malayalam, Kannada, Telugu via Gemini.</p>
        </Field>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Category">
            <select data-testid="task-category" className="border border-[#E5E5E5] px-3 py-2 w-full bg-white"
              value={form.category} onChange={(e) => upd("category", e.target.value)}>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="disaster">Disaster Relief</option>
              <option value="environment">Environment</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label={`Urgency: ${form.urgency}/5`}>
            <input data-testid="task-urgency" type="range" min="1" max="5" step="1"
              value={form.urgency} onChange={(e) => upd("urgency", parseInt(e.target.value))}
              className="w-full accent-[#002FA7]" />
            <div className="flex justify-between text-xs font-mono text-[#5C5C5C]">
              <span>LOW</span><span>MOD</span><span>ELEV</span><span>HIGH</span><span className="text-[#FF2A2A]">CRITICAL</span>
            </div>
          </Field>
        </div>
        <Field label="Required skills">
          <div className="flex flex-wrap gap-2 mb-2">
            {form.required_skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-[#111] bg-[#111] text-white">
                {s}
                <button onClick={() => upd("required_skills", form.required_skills.filter((x) => x !== s))} className="ml-1">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input data-testid="task-skill-input" placeholder="Skill and Enter"
              className="border border-[#E5E5E5] px-3 py-2 flex-1 focus:outline-none focus:border-[#111]"
              value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newSkill.trim()) { upd("required_skills", [...form.required_skills, newSkill.trim().toLowerCase()]); setNewSkill(""); } } }} />
          </div>
        </Field>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Volunteers needed">
            <input data-testid="task-volunteers" type="number" min="1" className="border border-[#E5E5E5] px-3 py-2 w-full"
              value={form.volunteers_required} onChange={(e) => upd("volunteers_required", parseInt(e.target.value || 1))} />
          </Field>
          <Field label="Start date">
            <input data-testid="task-start" type="date" className="border border-[#E5E5E5] px-3 py-2 w-full"
              value={form.start_date} onChange={(e) => upd("start_date", e.target.value)} />
          </Field>
          <Field label="End date">
            <input data-testid="task-end" type="date" className="border border-[#E5E5E5] px-3 py-2 w-full"
              value={form.end_date} onChange={(e) => upd("end_date", e.target.value)} />
          </Field>
        </div>
        <Field label="Location">
          <input data-testid="task-location-name" placeholder="Area name" className="border border-[#E5E5E5] px-3 py-2 w-full mb-2"
            value={form.location_name} onChange={(e) => upd("location_name", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Lat" type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm"
              value={form.location_lat} onChange={(e) => upd("location_lat", parseFloat(e.target.value))} />
            <input placeholder="Lng" type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm"
              value={form.location_lng} onChange={(e) => upd("location_lng", parseFloat(e.target.value))} />
          </div>
        </Field>

        <button data-testid="task-submit" onClick={submit} disabled={submitting}
          className="btn-primary w-full px-5 py-3 font-medium inline-flex items-center justify-center gap-2">
          <Plus size={16} /> {submitting ? "POSTING & TRANSLATING..." : "POST TASK"}
        </button>
      </div>
    </div>
  );
}

function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!user?.ngo_id) return;
    api.get("/tasks", { params: { ngo_id: user.ngo_id } }).then(({ data }) => setTasks(data));
  }, [user]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="label-mono mb-2">My Tasks</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Tasks posted</h1>
        </div>
        <button onClick={() => navigate("/ngo/post")} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
          <Plus size={14} /> NEW TASK
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
        {tasks.map((t) => (
          <TaskCard key={t.task_id} task={t} onClick={() => navigate(`/ngo/tasks/${t.task_id}`)} />
        ))}
        {tasks.length === 0 && <div className="col-span-3 text-center py-10 text-[#5C5C5C]">No tasks yet.</div>}
      </div>
    </div>
  );
}

function TaskDetail() {
  const location = useLocation();
  const taskId = location.pathname.split("/").pop();
  const [task, setTask] = useState(null);
  const [matches, setMatches] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [ratingFor, setRatingFor] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const { data: t } = await api.get(`/tasks/${taskId}`);
    setTask(t);
    const { data: m } = await api.get(`/match/task/${taskId}`);
    setMatches(m);
    try {
      const { data: a } = await api.get(`/tasks/${taskId}/applicants`);
      setApplicants(a);
    } catch {}
  };

  useEffect(() => { load(); }, [taskId]);

  const runMatch = async () => {
    setRunning(true);
    try {
      await api.post(`/match/run/${taskId}`);
      toast.success("AI matching complete");
      await load();
    } catch (e) {
      toast.error("Matching failed");
    } finally { setRunning(false); }
  };

  const complete = async (matchId) => {
    await api.put(`/match/${matchId}/complete`);
    toast.success("Marked complete. Points awarded.");
    load();
  };

  const submitRating = async () => {
    if (!ratingFor) return;
    try {
      await api.put(`/match/${ratingFor.match_id}/rate`, { rating: ratingValue });
      toast.success(`Rated ${ratingValue}★`);
      setRatingFor(null);
      load();
    } catch { toast.error("Rating failed"); }
  };

  if (!task) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <UrgencyBadge value={task.urgency} />
            <StatusBadge status={task.status} />
            <span className="label-mono">{task.category}</span>
          </div>
          <h1 className="font-heading font-black text-4xl tracking-tighter mb-2">{task.title}</h1>
          <p className="text-[#5C5C5C] max-w-2xl">{task.description}</p>
          {task.semantic_skills?.length > 0 && (
            <div className="mt-3">
              <div className="label-mono text-[#002FA7] mb-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-[#002FA7]" />
                GEMINI-EXPANDED SEMANTIC SKILLS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.semantic_skills.slice(0, 10).map((s) => (
                  <span key={s} className="text-[11px] font-mono px-2 py-0.5 border border-dashed border-[#002FA7] text-[#002FA7]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <button data-testid="run-matching-btn" onClick={runMatch} disabled={running}
          className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
          <Play size={14} /> {running ? "MATCHING..." : "RUN AI MATCHING"}
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Required</div>
          <div className="font-heading font-black text-2xl">{task.volunteers_required}</div>
        </div>
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Matched</div>
          <div className="font-heading font-black text-2xl">{matches.filter((m) => m.status === "accepted").length}</div>
        </div>
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Pending</div>
          <div className="font-heading font-black text-2xl">{matches.filter((m) => m.status === "pending").length}</div>
        </div>
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Applicants</div>
          <div className="font-heading font-black text-2xl">{task.applicants?.length || 0}</div>
        </div>
      </div>

      <div className="mb-4 label-mono">Ranked Candidates</div>
      <div className="space-y-3 stagger-in">
        {matches.length === 0 && <div className="text-sm text-[#5C5C5C] border border-dashed border-[#E5E5E5] p-6 text-center">No matches yet. Click "Run AI Matching" to generate candidates.</div>}
        {matches.map((m, i) => (
          <div key={m.match_id} className="border border-[#E5E5E5] bg-white p-5">
            <div className="grid lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#111] text-white flex items-center justify-center font-mono text-sm">#{i + 1}</div>
                  <div>
                    <div className="font-heading font-bold">{m.volunteer_name}</div>
                    <div className="label-mono">{Math.round(m.distance_km)} KM away</div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 text-center">
                <div className="label-mono mb-1">Total Score</div>
                <div className="font-heading font-black text-3xl text-[#002FA7]">{Math.round(m.score_total * 100)}%</div>
              </div>
              <div className="lg:col-span-5 grid grid-cols-2 gap-x-6 gap-y-2">
                <ScoreBar label="Skill" value={m.score_skill} color="#002FA7" />
                <ScoreBar label="Proximity" value={m.score_proximity} color="#00C05A" />
                <ScoreBar label="Availability" value={m.score_availability} color="#FFC000" />
                <ScoreBar label="Impact" value={m.score_impact} color="#FF2A2A" />
              </div>
              <div className="lg:col-span-2 flex flex-col gap-2">
                <StatusBadge status={m.status} />
                {m.status === "accepted" && (
                  <button data-testid={`complete-${m.match_id}`} onClick={() => complete(m.match_id)} className="btn-outline-black px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} /> MARK COMPLETE
                  </button>
                )}
                {m.status === "completed" && !m.ngo_rating && (
                  <button data-testid={`rate-${m.match_id}`} onClick={() => { setRatingFor(m); setRatingValue(5); }} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1">
                    <Star size={12} /> RATE VOLUNTEER
                  </button>
                )}
                {m.status === "completed" && m.ngo_rating && (
                  <div className="label-mono text-[#FFC000] flex items-center gap-0.5 justify-center">
                    {"★".repeat(m.ngo_rating)}{"☆".repeat(5 - m.ngo_rating)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {applicants.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 label-mono flex items-center gap-2">
            <UsersIcon size={14} /> Self-Applicants ({applicants.length})
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {applicants.map((a) => (
              <div key={a.user_id} className="border border-[#E5E5E5] bg-white p-4">
                <div className="flex items-center gap-3 mb-2">
                  {a.picture ? <img src={a.picture} alt="" className="w-9 h-9 border border-[#E5E5E5]" /> : <div className="w-9 h-9 bg-[#111] text-white flex items-center justify-center font-mono text-xs">{a.name?.[0]}</div>}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{a.name}</div>
                    <div className="label-mono truncate">{a.location_name}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(a.skills || []).slice(0, 4).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                </div>
                <div className="text-[10px] font-mono text-[#5C5C5C] flex items-center justify-between border-t border-[#E5E5E5] pt-2 mt-2">
                  <span>{a.total_points || 0} pts</span>
                  <span>{(a.badges || []).length} badges</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratingFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRatingFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-[#111] p-6 w-full max-w-md shadow-[6px_6px_0_0_#111]">
            <div className="label-mono mb-2">Rate volunteer</div>
            <h3 className="font-heading font-bold text-xl mb-4">{ratingFor.volunteer_name}</h3>
            <div className="flex gap-2 mb-5">
              {[1,2,3,4,5].map((v) => (
                <button key={v} data-testid={`rate-star-${v}`} onClick={() => setRatingValue(v)}
                  className={`w-12 h-12 flex items-center justify-center text-2xl border ${ratingValue >= v ? "bg-[#FFC000] border-[#FFC000]" : "border-[#E5E5E5] text-[#E5E5E5]"}`}>
                  ★
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button data-testid="rating-submit" onClick={submitRating} className="btn-primary px-4 py-2 text-sm flex-1">SUBMIT</button>
              <button onClick={() => setRatingFor(null)} className="btn-outline-black px-4 py-2 text-sm">CANCEL</button>
            </div>
            <p className="text-xs text-[#5C5C5C] mt-3">5-star rating awards the volunteer a +50 bonus.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NGOProfile() {
  const { user } = useAuth();
  const [ngo, setNgo] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.ngo_id) return;
    const { data } = await api.get(`/ngos/${user.ngo_id}`);
    setNgo(data);
    setForm({
      name: data.name || "", description: data.description || "",
      website: data.website || "", contact_email: data.contact_email || "",
      focus_areas: data.focus_areas || [],
      location_lat: data.location_lat, location_lng: data.location_lng,
      location_name: data.location_name || "", registration_no: data.registration_no || "",
    });
  };
  useEffect(() => { load(); }, [user]);

  const FOCUS_OPTIONS = ["education", "healthcare", "disaster relief", "environment", "women empowerment", "skills training"];

  const toggleFocus = (f) =>
    setForm((g) => ({ ...g, focus_areas: g.focus_areas.includes(f) ? g.focus_areas.filter((x) => x !== f) : [...g.focus_areas, f] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/ngos/me", form);
      toast.success("Profile updated");
      load();
    } catch { toast.error("Save failed"); }
    setSaving(false);
  };

  if (!ngo) return <div className="label-mono">Loading NGO profile...</div>;

  return (
    <div className="max-w-3xl">
      <div className="label-mono mb-2">Organisation</div>
      <h1 className="font-heading font-black text-4xl tracking-tighter mb-6">{ngo.name}</h1>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Verified</div>
          <div className="font-heading font-black text-xl">{ngo.verified ? "YES" : "PENDING"}</div>
        </div>
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Tasks posted</div>
          <div className="font-heading font-black text-xl">{ngo.total_tasks_posted || 0}</div>
        </div>
        <div className="border border-[#E5E5E5] bg-white p-4">
          <div className="label-mono mb-1">Rating</div>
          <div className="font-heading font-black text-xl">{ngo.rating || 0}/5</div>
        </div>
      </div>
      <div className="border border-[#E5E5E5] bg-white p-6 space-y-4">
        <Field label="Name"><input data-testid="ngo-name" className="border border-[#E5E5E5] px-3 py-2 w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Registration number"><input className="border border-[#E5E5E5] px-3 py-2 w-full" value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} /></Field>
        <Field label="Description"><textarea rows={3} className="border border-[#E5E5E5] px-3 py-2 w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Website"><input className="border border-[#E5E5E5] px-3 py-2 w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="Contact email"><input className="border border-[#E5E5E5] px-3 py-2 w-full" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
        <Field label="Focus areas">
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((f) => (
              <button key={f} onClick={() => toggleFocus(f)} className={`text-xs px-3 py-1.5 border font-mono uppercase ${form.focus_areas?.includes(f) ? "bg-[#002FA7] text-white border-[#002FA7]" : "border-[#E5E5E5]"}`}>
                {f}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Location">
          <input className="border border-[#E5E5E5] px-3 py-2 w-full mb-2" value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm" value={form.location_lat} onChange={(e) => setForm({ ...form, location_lat: parseFloat(e.target.value) })} />
            <input type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm" value={form.location_lng} onChange={(e) => setForm({ ...form, location_lng: parseFloat(e.target.value) })} />
          </div>
        </Field>
        <button data-testid="ngo-save" onClick={save} disabled={saving} className="btn-primary w-full py-3 font-medium">
          {saving ? "SAVING..." : "SAVE PROFILE"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="label-mono mb-2">{label}</div>
      {children}
    </div>
  );
}

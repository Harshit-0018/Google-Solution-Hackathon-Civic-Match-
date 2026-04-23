import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import HeatMap from "../components/HeatMap";
import { TaskCard, ScoreBar, StatCard } from "../components/Cards";
import { UrgencyBadge, StatusBadge, SkillTag } from "../components/Badges";
import { toast } from "sonner";
import { Award, Trophy, Check, X, Gift, Languages } from "lucide-react";

const NAV = [
  { to: "/volunteer", label: "Dashboard" },
  { to: "/volunteer/browse", label: "Browse Tasks" },
  { to: "/volunteer/matches", label: "My Matches" },
  { to: "/volunteer/rewards", label: "Rewards" },
];

export default function VolunteerPortal() {
  return (
    <Layout nav={NAV} portalLabel="VOLUNTEER">
      <Routes>
        <Route index element={<VolDashboard />} />
        <Route path="browse" element={<BrowseTasks />} />
        <Route path="matches" element={<MyMatches />} />
        <Route path="rewards" element={<Rewards />} />
      </Routes>
    </Layout>
  );
}

function VolDashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get("/match/my-matches").then(({ data }) => setMatches(data));
    api.get("/tasks", { params: { status: "open" } }).then(({ data }) => setTasks(data.slice(0, 6)));
  }, []);

  const pending = matches.filter((m) => m.status === "pending").length;
  const accepted = matches.filter((m) => m.status === "accepted").length;
  const completed = matches.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <div className="label-mono mb-2">Your impact</div>
        <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter">
          Hello, {user?.name?.split(" ")[0] || "volunteer"}.
        </h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
        <StatCard label="Points" value={user?.total_points || 0} sublabel="Total earned" />
        <StatCard label="Pending Matches" value={pending} />
        <StatCard label="Active" value={accepted} />
        <StatCard label="Completed" value={completed} />
      </div>

      {user?.badges?.length > 0 && (
        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Earned Badges</div>
          <div className="flex flex-wrap gap-3">
            {user.badges.map((b) => (
              <div key={b} className="border border-[#FFC000] bg-[#FFFBEB] px-3 py-2 flex items-center gap-2">
                <Award size={16} className="text-[#FFC000]" />
                <span className="font-mono text-xs uppercase tracking-wider">{b.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-3">Live Urgency Near You</div>
          <HeatMap
            height={400}
            points={tasks.map((t) => ({ lat: t.location_lat, lng: t.location_lng, weight: t.urgency, title: t.title, category: t.category, location_name: t.location_name }))}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="label-mono mb-3">Top Urgent Tasks</div>
          <div className="space-y-3">
            {tasks.slice(0, 3).map((t) => (
              <div key={t.task_id} className="border border-[#E5E5E5] bg-white p-4 card-tactile">
                <div className="flex items-center gap-2 mb-2">
                  <UrgencyBadge value={t.urgency} />
                  <span className="label-mono">{t.category}</span>
                </div>
                <div className="font-heading font-bold">{t.title}</div>
                <div className="text-xs text-[#5C5C5C] font-mono">{t.location_name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowseTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filterCat, setFilterCat] = useState("");
  const [filterUrg, setFilterUrg] = useState(0);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const params = { status: "open" };
    if (filterCat) params.category = filterCat;
    if (filterUrg) params.urgency_min = filterUrg;
    api.get("/tasks", { params }).then(({ data }) => setTasks(data));
  }, [filterCat, filterUrg]);

  useEffect(() => {
    if (user?.languages?.[0]) {
      const map = { Malayalam: "ml", Hindi: "hi", Tamil: "ta", Kannada: "kn", Telugu: "te", English: "en" };
      setLang(map[user.languages[0]] || "en");
    }
  }, [user]);

  const applyToTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/apply`);
      toast.success("Applied! NGO can now match you.");
    } catch { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="label-mono mb-2">Browse</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Open Tasks</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border border-[#E5E5E5] bg-white px-3 py-2 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} data-testid="filter-category">
            <option value="">ALL CATEGORIES</option>
            <option value="healthcare">Healthcare</option>
            <option value="education">Education</option>
            <option value="disaster">Disaster</option>
            <option value="environment">Environment</option>
          </select>
          <select className="border border-[#E5E5E5] bg-white px-3 py-2 text-sm" value={filterUrg} onChange={(e) => setFilterUrg(parseInt(e.target.value))} data-testid="filter-urgency">
            <option value="0">ANY URGENCY</option>
            <option value="3">3+ ELEVATED</option>
            <option value="4">4+ HIGH</option>
            <option value="5">5 CRITICAL</option>
          </select>
          <select className="border border-[#E5E5E5] bg-white px-3 py-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value)} data-testid="filter-lang">
            <option value="en">ENGLISH</option>
            <option value="hi">हिन्दी</option>
            <option value="ml">മലയാളം</option>
            <option value="ta">தமிழ்</option>
            <option value="kn">ಕನ್ನಡ</option>
            <option value="te">తెలుగు</option>
          </select>
        </div>
      </div>

      <div className="border border-[#E5E5E5] bg-white p-5 mb-6">
        <div className="label-mono mb-3">Map view</div>
        <HeatMap height={320} points={tasks.map((t) => ({ lat: t.location_lat, lng: t.location_lng, weight: t.urgency, title: t.title, category: t.category, location_name: t.location_name }))} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
        {tasks.map((t) => {
          const desc = t.description_translated?.[lang] || t.description;
          return (
            <div key={t.task_id} className="border border-[#E5E5E5] bg-white p-5 card-tactile">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <UrgencyBadge value={t.urgency} />
                <span className="label-mono">{t.category}</span>
                {desc !== t.description && <span className="label-mono text-[#002FA7] inline-flex items-center gap-1"><Languages size={10} /> {lang.toUpperCase()}</span>}
              </div>
              <h3 className="font-heading font-bold text-lg leading-tight mb-2">{t.title}</h3>
              <p className="text-sm text-[#5C5C5C] line-clamp-3 mb-3">{desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(t.required_skills || []).slice(0, 4).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5]">
                <div className="text-xs text-[#5C5C5C] font-mono">{t.location_name} · {t.volunteers_matched}/{t.volunteers_required}</div>
                <button data-testid={`apply-${t.task_id}`} onClick={() => applyToTask(t.task_id)} className="btn-primary px-3 py-1.5 text-xs">APPLY</button>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && <div className="col-span-3 text-center py-10 text-[#5C5C5C]">No open tasks match your filters.</div>}
      </div>
    </div>
  );
}

function MyMatches() {
  const [matches, setMatches] = useState([]);

  const load = async () => {
    const { data } = await api.get("/match/my-matches");
    setMatches(data);
  };
  useEffect(() => { load(); }, []);

  const respond = async (matchId, status) => {
    try {
      await api.put(`/match/${matchId}/respond`, { status });
      toast.success(`Match ${status}`);
      load();
    } catch { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="label-mono mb-2">Matches</div>
      <h1 className="font-heading font-black text-4xl tracking-tighter mb-6">Your match queue</h1>
      <div className="space-y-3 stagger-in">
        {matches.map((m) => (
          <div key={m.match_id} className="border border-[#E5E5E5] bg-white p-5">
            <div className="grid lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-4">
                <div className="flex items-center gap-2 mb-2">
                  {m.task && <UrgencyBadge value={m.task.urgency} />}
                  <StatusBadge status={m.status} />
                </div>
                <div className="font-heading font-bold text-lg">{m.task_title}</div>
                <div className="text-xs text-[#5C5C5C] font-mono">{m.task?.location_name} · {Math.round(m.distance_km)} km</div>
              </div>
              <div className="lg:col-span-2 text-center">
                <div className="label-mono mb-1">Match</div>
                <div className="font-heading font-black text-3xl text-[#002FA7]">{Math.round(m.score_total * 100)}%</div>
              </div>
              <div className="lg:col-span-4 grid grid-cols-2 gap-x-6 gap-y-2">
                <ScoreBar label="Skill" value={m.score_skill} color="#002FA7" />
                <ScoreBar label="Proximity" value={m.score_proximity} color="#00C05A" />
                <ScoreBar label="Availability" value={m.score_availability} color="#FFC000" />
                <ScoreBar label="Impact" value={m.score_impact} color="#FF2A2A" />
              </div>
              <div className="lg:col-span-2 flex flex-col gap-2">
                {m.status === "pending" && (
                  <>
                    <button data-testid={`accept-${m.match_id}`} onClick={() => respond(m.match_id, "accepted")} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1">
                      <Check size={12} /> ACCEPT
                    </button>
                    <button data-testid={`decline-${m.match_id}`} onClick={() => respond(m.match_id, "declined")} className="btn-outline-black px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1">
                      <X size={12} /> DECLINE
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {matches.length === 0 && <div className="text-center py-10 text-[#5C5C5C] border border-dashed border-[#E5E5E5]">No matches yet. Browse tasks to apply, or wait for an admin to run matching.</div>}
      </div>
    </div>
  );
}

function Rewards() {
  const { user, refresh } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [history, setHistory] = useState([]);

  const load = async () => {
    const [c, l, h] = await Promise.all([
      api.get("/rewards/catalog"),
      api.get("/rewards/leaderboard"),
      api.get("/rewards/history"),
    ]);
    setCatalog(c.data); setLeaders(l.data); setHistory(h.data);
  };
  useEffect(() => { load(); }, []);

  const redeem = async (item) => {
    if ((user?.total_points || 0) < item.points_cost) {
      toast.error("Not enough points");
      return;
    }
    try {
      await api.post("/rewards/redeem", { catalog_id: item.catalog_id });
      toast.success(`Redeemed ${item.title}`);
      await refresh();
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-mono mb-2">Rewards</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Your impact, rewarded.</h1>
        </div>
        <div className="border border-[#111] bg-[#111] text-white px-6 py-4">
          <div className="label-mono text-[#FFC000] mb-1">Your Points</div>
          <div className="font-heading font-black text-4xl">{user?.total_points || 0}</div>
        </div>
      </div>

      <div>
        <div className="label-mono mb-3">Catalog</div>
        <div className="grid md:grid-cols-3 gap-4 stagger-in">
          {catalog.map((item) => (
            <div key={item.catalog_id} className="border border-[#E5E5E5] bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Gift size={20} className="text-[#002FA7]" />
                <div className="label-mono">Stock: {item.stock}</div>
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{item.title}</h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="label-mono">COST</div>
                  <div className="font-heading font-black text-2xl">{item.points_cost} pts</div>
                </div>
                <button data-testid={`redeem-${item.catalog_id}`} onClick={() => redeem(item)}
                  disabled={(user?.total_points || 0) < item.points_cost}
                  className="btn-primary px-3 py-2 text-xs disabled:opacity-50">
                  REDEEM
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-[#FFC000]" />
            <div className="label-mono">Leaderboard</div>
          </div>
          <div className="space-y-2">
            {leaders.map((l, i) => (
              <div key={l.user_id} className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 flex items-center justify-center font-mono text-xs ${i < 3 ? "bg-[#FFC000] text-[#111]" : "bg-[#F5F5F5]"}`}>{i + 1}</div>
                  <span className="font-medium text-sm">{l.name}</span>
                </div>
                <div className="font-mono font-bold">{l.total_points}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="label-mono mb-4">Recent Activity</div>
          <div className="space-y-2 max-h-[320px] overflow-auto">
            {history.map((h) => (
              <div key={h.reward_id} className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                <div className="text-sm">{h.description}</div>
                <div className={`font-mono text-sm ${h.points > 0 ? "text-[#00C05A]" : "text-[#FF2A2A]"}`}>{h.points > 0 ? "+" : ""}{h.points}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-sm text-[#5C5C5C]">No activity yet. Complete tasks to earn points.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

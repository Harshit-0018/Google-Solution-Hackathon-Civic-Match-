import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeatMap from "../components/HeatMap";
import { UrgencyBadge, SkillTag } from "../components/Badges";
import { StatCard } from "../components/Cards";
import { api } from "../lib/api";
import { ArrowLeft, ArrowRight, Trophy, Activity } from "lucide-react";

export default function ImpactPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/impact/public").then(({ data }) => {
      setData(data); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111]">
      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" data-testid="impact-back-home" className="flex items-center gap-2">
            <ArrowLeft size={16} /> <span className="label-mono">Back to home</span>
          </Link>
          <Link to="/login" data-testid="impact-signin" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            SIGN IN <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10 lg:py-16 space-y-12">
        <section>
          <div className="label-mono mb-3">Public Impact Dashboard</div>
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter max-w-4xl mb-4">
            The aggregate result <br />of a smarter allocation.
          </h1>
          <p className="text-[#5C5C5C] max-w-2xl text-lg">
            Live, read-only view of community impact on the SRA network.
            No login needed — share this page with funders, press, and your community.
          </p>
        </section>

        {loading && <div className="label-mono">Loading impact data...</div>}

        {data && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in" data-testid="impact-stats">
              <StatCard label="Verified NGOs" value={data.stats.ngos} />
              <StatCard label="Active Volunteers" value={data.stats.volunteers} />
              <StatCard label="Tasks Posted" value={data.stats.tasks_total} sublabel={`${data.stats.tasks_completed} completed`} />
              <StatCard label="AI Matches" value={data.stats.matches_total} sublabel={`${data.stats.matches_completed} completed`} />
            </section>

            <section className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 border border-[#E5E5E5] bg-white p-5">
                <div className="label-mono mb-3">Live Urgency Heatmap</div>
                <HeatMap height={440}
                  points={data.heatmap.map((t) => ({ lat: t.location_lat, lng: t.location_lng, weight: t.urgency, title: t.title, category: t.category, location_name: t.location_name }))}
                />
                <p className="text-xs text-[#5C5C5C] mt-3 font-mono uppercase tracking-wider">
                  Each pin is an open/active task. Weight = urgency level.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="border border-[#E5E5E5] bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy size={16} className="text-[#FFC000]" />
                    <div className="label-mono">Top Volunteers</div>
                  </div>
                  <div className="space-y-2">
                    {data.leaders.map((l, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-[#E5E5E5] pb-2 last:border-b-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center font-mono text-xs ${i < 3 ? "bg-[#FFC000] text-[#111]" : "bg-[#F5F5F5]"}`}>{i + 1}</div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{l.name}</div>
                            <div className="text-[10px] font-mono text-[#5C5C5C] truncate">{l.location_name || "Kerala"}</div>
                          </div>
                        </div>
                        <div className="font-mono font-bold flex-shrink-0 ml-2">{l.total_points}</div>
                      </div>
                    ))}
                    {data.leaders.length === 0 && <div className="text-sm text-[#5C5C5C]">Be the first to make impact.</div>}
                  </div>
                </div>
                <div className="border border-[#E5E5E5] bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={16} className="text-[#002FA7]" />
                    <div className="label-mono">Categories</div>
                  </div>
                  <div className="space-y-2">
                    {data.categories.map((c) => (
                      <div key={c.category} className="flex items-center gap-3">
                        <div className="label-mono w-28 shrink-0">{c.category || "other"}</div>
                        <div className="flex-1 h-4 bg-[#F5F5F5]">
                          <div className="h-full bg-[#002FA7]" style={{ width: `${Math.min(100, (c.count / Math.max(1, data.stats.tasks_total)) * 100)}%` }} />
                        </div>
                        <div className="font-mono text-xs w-6 text-right">{c.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="label-mono mb-3">Recently Completed</div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
                {data.recent_completed.map((t, i) => (
                  <div key={i} className="border border-[#E5E5E5] bg-white p-5 card-tactile">
                    <div className="flex items-center gap-2 mb-2">
                      <UrgencyBadge value={t.urgency} />
                      <span className="label-mono">{t.category}</span>
                    </div>
                    <h3 className="font-heading font-bold text-base leading-tight mb-2">{t.title}</h3>
                    <div className="text-xs text-[#5C5C5C] mb-2">{t.location_name}</div>
                    <div className="flex items-center justify-between text-[10px] font-mono tracking-wider uppercase border-t border-[#E5E5E5] pt-2 mt-2">
                      <span className="text-[#5C5C5C]">{t.ngo_name}</span>
                      <span className="font-bold">{t.volunteers_matched}/{t.volunteers_required} VOL</span>
                    </div>
                  </div>
                ))}
                {data.recent_completed.length === 0 && (
                  <div className="md:col-span-2 lg:col-span-4 text-center py-10 text-[#5C5C5C] border border-dashed border-[#E5E5E5]">
                    No completed tasks yet.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-[#111] text-white p-10 lg:p-16 relative overflow-hidden">
              <div className="label-mono mb-4 text-[#FFC000]">Total reward points awarded</div>
              <div className="font-heading font-black text-6xl lg:text-8xl tracking-tighter">{data.stats.total_points_awarded.toLocaleString()}</div>
              <p className="text-white/70 mt-4 max-w-xl">
                Points represent real effort by real volunteers on urgent community needs —
                redeemable for gift cards, kits, and certificates.
              </p>
              <div className="mt-8">
                <Link to="/login" data-testid="impact-cta" className="bg-white text-[#111] px-6 py-3 inline-flex items-center gap-2 font-medium hover:-translate-y-0.5 transition-transform">
                  JOIN THE NETWORK <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-[#E5E5E5] bg-white py-6 mt-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="label-mono">Public Impact · Smart Resource Allocation · Google Solution Challenge 2026</div>
          <div className="label-mono">Updated in real-time</div>
        </div>
      </footer>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { Zap, MapPin, Award, ArrowRight, Users, Brain, Layers, Globe } from "lucide-react";
import { useAuth } from "../lib/auth";

const HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/5c024b8d-e008-44a4-b48f-072db2e06663/images/bb29e714e27861c8be643a9fea7331cef839d96ac59c3888deb007b813f4c0eb.png";
const CONCEPT_IMG = "https://static.prod-images.emergentagent.com/jobs/5c024b8d-e008-44a4-b48f-072db2e06663/images/36a3f19e7bcf1d0523f74155c75364b3f1b4fc8573f631d7e75cbca3e8c8df13.png";
const COMMUNITY_1 = "https://images.pexels.com/photos/6646926/pexels-photo-6646926.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const COMMUNITY_2 = "https://images.pexels.com/photos/6591433/pexels-photo-6591433.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111]">
      {/* Top bar */}
      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#002FA7] flex items-center justify-center">
              <span className="text-white font-heading font-black">S</span>
            </div>
            <span className="font-heading font-black text-xl tracking-tight">SRA</span>
            <span className="label-mono hidden md:inline ml-2 border border-[#111] px-2 py-0.5">
              Smart Resource Allocation
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={user.role === "admin" ? "/admin" : user.role === "ngo" ? "/ngo" : user.role === "volunteer" ? "/volunteer" : "/onboarding"}
                data-testid="nav-dashboard"
                className="btn-primary px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
              >
                GO TO DASHBOARD <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/login"
                data-testid="nav-signin"
                className="btn-primary px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
              >
                SIGN IN <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#E5E5E5]">
        <div className="absolute inset-0 opacity-[0.18]">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="label-mono mb-6 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-[#111]"></span>
              Google Solution Challenge · 2026
            </div>
            <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl xl:text-[96px] leading-[0.9] tracking-tighter mb-6">
              Match the right <br />
              <span className="text-[#002FA7]">volunteer</span> to the <br />
              right <span className="underline decoration-[6px] decoration-[#FFC000] underline-offset-[14px]">urgent need</span>.
            </h1>
            <p className="text-lg lg:text-xl text-[#5C5C5C] max-w-2xl mb-10 leading-relaxed">
              SRA digitises scattered community-need data from NGOs and social groups,
              visualises urgency on a live heatmap, and uses Google Gemini to auto-match
              volunteers by skill, proximity, availability, and impact.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" data-testid="hero-get-started" className="btn-primary px-6 py-3 font-medium inline-flex items-center gap-2">
                GET STARTED <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="btn-outline-black px-6 py-3 font-medium">
                HOW IT WORKS
              </a>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-4">
            <StatChip label="Communities served" value="50+" />
            <StatChip label="Active volunteers" value="1,200+" />
            <StatChip label="Avg. match time" value="&lt; 4m" />
            <StatChip label="Impact score" value="92%" />
          </div>
        </div>
      </section>

      {/* 3 Portals */}
      <section id="portals" className="py-20 lg:py-28 border-b border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <div className="label-mono mb-3">01 — Three portals</div>
            <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter mb-3">
              One platform.<br />Three points of view.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger-in">
            <PortalCard
              kicker="FOR ORGANISATIONS"
              title="NGO Portal"
              copy="Post urgent tasks, set urgency 1–5, specify required skills and location. Watch your coverage on the heatmap."
              href="/login"
              testid="portal-ngo"
              bullets={["Post & manage tasks", "Urgency heatmap of coverage", "Track matched volunteers"]}
            />
            <PortalCard
              kicker="FOR CONTRIBUTORS"
              title="Volunteer Portal"
              copy="Build your skills profile, browse nearby urgent tasks, accept matches, earn points and badges."
              href="/login"
              testid="portal-volunteer"
              bullets={["Skill-based profile", "Browse by urgency", "Points, badges & rewards"]}
              primary
            />
            <PortalCard
              kicker="FOR ADMINS"
              title="Admin Portal"
              copy="Approve NGOs & volunteers, trigger AI matching, audit every decision, keep the system trustworthy."
              href="/login"
              testid="portal-admin"
              bullets={["Verify NGOs & users", "Run AI matching", "Audit every action"]}
            />
          </div>
        </div>
      </section>

      {/* How it works / AI matching */}
      <section id="how-it-works" className="py-20 lg:py-28 border-b border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="border border-[#111] bg-[#FFC000] p-1 inline-block mb-6">
              <img src={CONCEPT_IMG} alt="AI Matching" className="w-full max-w-md" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="label-mono mb-3">02 — AI Matching</div>
            <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter mb-6">
              A 4-signal scoring engine.
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-10 max-w-xl">
              Every volunteer is scored against every open task. The algorithm combines four
              transparent signals — you always see <em>why</em> someone was matched.
            </p>
            <div className="space-y-3">
              <Signal color="#002FA7" weight="0.40" label="Skill similarity" desc="Semantic match of volunteer skills to task requirements" />
              <Signal color="#00C05A" weight="0.30" label="Proximity" desc="Distance between volunteer and task (Haversine)" />
              <Signal color="#FFC000" weight="0.20" label="Availability" desc="Date window & time-slot overlap" />
              <Signal color="#FF2A2A" weight="0.10" label="Impact" desc="Track record & past NGO ratings" />
            </div>
          </div>
        </div>
      </section>

      {/* Google integration map */}
      <section className="py-20 lg:py-28 border-b border-[#E5E5E5] bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <div className="label-mono mb-3">03 — Powered by Google</div>
            <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter mb-3">
              Deep Google ecosystem integration.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#E5E5E5]">
            <IntegCell icon={<Users />} title="Google Sign-In" desc="Frictionless Google OAuth authentication" />
            <IntegCell icon={<Brain />} title="Gemini 2.5" desc="Multilingual task translation & descriptions" />
            <IntegCell icon={<MapPin />} title="Maps + Heatmap" desc="Urgency-weighted visualization of needs" />
            <IntegCell icon={<Layers />} title="Firestore-Ready" desc="Schema designed for Google Cloud Firestore" />
            <IntegCell icon={<Globe />} title="Translate" desc="Auto-translate to 5 Indian languages" />
            <IntegCell icon={<Zap />} title="FCM Notifications" desc="Push alerts for matches & urgent tasks" />
            <IntegCell icon={<Award />} title="Points & Badges" desc="Gamified rewards system for volunteers" />
            <IntegCell icon={<ArrowRight />} title="Forms Pipeline" desc="Paper surveys → Google Forms → Firestore" />
          </div>
        </div>
      </section>

      {/* Impact imagery */}
      <section className="py-20 lg:py-28 border-b border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
          <div className="border border-[#E5E5E5] overflow-hidden">
            <img src={COMMUNITY_1} alt="Volunteers" className="w-full h-80 object-cover" />
            <div className="p-6 bg-white border-t border-[#E5E5E5]">
              <div className="label-mono mb-2">Education & Disaster</div>
              <h3 className="font-heading font-bold text-xl">On-the-ground impact, measured.</h3>
            </div>
          </div>
          <div className="border border-[#E5E5E5] overflow-hidden">
            <img src={COMMUNITY_2} alt="Community" className="w-full h-80 object-cover" />
            <div className="p-6 bg-white border-t border-[#E5E5E5]">
              <div className="label-mono mb-2">Community Health</div>
              <h3 className="font-heading font-bold text-xl">Deployed where it matters most.</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-[#111] text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <div className="label-mono mb-4 text-[#FFC000]">GET STARTED</div>
          <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter mb-6">
            Allocate the right volunteer.<br />Change the right life.
          </h2>
          <Link to="/login" data-testid="cta-get-started" className="inline-flex items-center gap-2 bg-white text-[#111] px-6 py-3 font-medium hover:-translate-y-0.5 transition-transform">
            SIGN IN WITH GOOGLE <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E5E5E5] bg-white py-8">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="label-mono">Smart Resource Allocation · Google Solution Challenge 2026</div>
          <div className="label-mono">Built with React · FastAPI · MongoDB · Gemini</div>
        </div>
      </footer>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="border border-[#E5E5E5] bg-white p-5 card-tactile">
      <div className="label-mono mb-2">{label}</div>
      <div className="font-heading font-black text-4xl tracking-tighter" dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  );
}

function PortalCard({ kicker, title, copy, href, testid, bullets, primary = false }) {
  return (
    <Link
      to={href}
      data-testid={testid}
      className={`block border border-[#E5E5E5] ${primary ? "bg-[#002FA7] text-white" : "bg-white"} p-7 card-tactile`}
    >
      <div className={`label-mono mb-3 ${primary ? "text-[#FFC000]" : ""}`}>{kicker}</div>
      <h3 className="font-heading font-black text-3xl tracking-tighter mb-3">{title}</h3>
      <p className={`text-sm mb-5 ${primary ? "text-white/80" : "text-[#5C5C5C]"}`}>{copy}</p>
      <ul className="space-y-2 mb-6">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <span className={primary ? "text-[#FFC000]" : "text-[#002FA7]"}>▸</span> {b}
          </li>
        ))}
      </ul>
      <div className="inline-flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
        Enter portal <ArrowRight size={14} />
      </div>
    </Link>
  );
}

function Signal({ color, weight, label, desc }) {
  return (
    <div className="flex items-center gap-4 border-l-4 pl-4 py-2" style={{ borderColor: color }}>
      <div className="font-mono text-xs w-10">{weight}</div>
      <div className="flex-1">
        <div className="font-heading font-bold">{label}</div>
        <div className="text-sm text-[#5C5C5C]">{desc}</div>
      </div>
    </div>
  );
}

function IntegCell({ icon, title, desc }) {
  return (
    <div className="p-6 border-r border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors">
      <div className="text-[#002FA7] mb-3">{React.cloneElement(icon, { size: 22, strokeWidth: 1.5 })}</div>
      <div className="font-heading font-bold mb-1">{title}</div>
      <div className="text-xs text-[#5C5C5C]">{desc}</div>
    </div>
  );
}

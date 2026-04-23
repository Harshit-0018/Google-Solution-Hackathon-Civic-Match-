import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Users, Building2, ArrowRight } from "lucide-react";

const SKILL_SUGGESTIONS = [
  "first aid", "teaching", "mathematics", "english", "nursing", "healthcare",
  "construction", "carpentry", "cooking", "driving", "data entry",
  "malayalam translation", "software", "counselling", "agriculture",
];
const LANG_OPTIONS = ["Malayalam", "English", "Hindi", "Tamil", "Kannada", "Telugu"];
const SLOT_OPTIONS = ["morning", "afternoon", "evening"];
const FOCUS_OPTIONS = ["education", "healthcare", "disaster relief", "environment", "women empowerment", "skills training"];

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: "",
    skills: [], languages: ["Malayalam", "English"], experience: "",
    location_lat: 10.8505, location_lng: 76.2711, location_name: "Kerala",
    availability_dates: [], availability_slots: ["morning", "afternoon"],
    ngo_name: "", registration_no: "", focus_areas: [], description: "", website: "",
  });
  const [newSkill, setNewSkill] = useState("");

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k, v) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const addSkill = (s) => {
    const clean = s.trim().toLowerCase();
    if (clean && !form.skills.includes(clean)) upd("skills", [...form.skills, clean]);
    setNewSkill("");
  };

  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 20; i += 2) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    upd("availability_dates", dates);
  };

  const submit = async () => {
    if (!role) return;
    setSubmitting(true);
    try {
      const payload = { role, ...form };
      await api.post("/auth/onboard", payload);
      await refresh();
      toast.success("Profile saved");
      navigate(role === "ngo" ? "/ngo" : "/volunteer");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="label-mono mb-4">Welcome, {user?.name}</div>
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter mb-3">
            How would you like to contribute?
          </h1>
          <p className="text-[#5C5C5C] mb-10 max-w-xl">
            Pick your role. You can always request a role change from the admin later.
          </p>
          <div className="grid md:grid-cols-2 gap-6 stagger-in">
            <button
              data-testid="onboard-volunteer-card"
              onClick={() => setRole("volunteer")}
              className="border border-[#E5E5E5] bg-[#002FA7] text-white text-left p-8 card-tactile"
            >
              <Users size={28} className="text-[#FFC000] mb-4" strokeWidth={1.5} />
              <div className="label-mono mb-2 text-[#FFC000]">For Contributors</div>
              <h3 className="font-heading font-black text-3xl tracking-tighter mb-3">Volunteer</h3>
              <p className="text-white/80 text-sm mb-6">
                Build a skill profile. Get matched to urgent tasks near you. Earn points & badges.
              </p>
              <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                Continue <ArrowRight size={14} />
              </div>
            </button>
            <button
              data-testid="onboard-ngo-card"
              onClick={() => setRole("ngo")}
              className="border border-[#E5E5E5] bg-white text-left p-8 card-tactile"
            >
              <Building2 size={28} className="text-[#111] mb-4" strokeWidth={1.5} />
              <div className="label-mono mb-2">For Organisations</div>
              <h3 className="font-heading font-black text-3xl tracking-tighter mb-3">NGO</h3>
              <p className="text-[#5C5C5C] text-sm mb-6">
                Register your NGO, post urgent community tasks, and get AI-matched volunteers.
              </p>
              <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                Continue <ArrowRight size={14} />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 lg:p-10">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setRole(null)} className="label-mono mb-6 hover:text-[#002FA7]" data-testid="onboard-back">
          ← Change role
        </button>
        <div className="label-mono mb-3">{role === "ngo" ? "NGO Registration" : "Volunteer Profile"}</div>
        <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter mb-8">
          {role === "ngo" ? "Tell us about your organisation." : "Let's build your profile."}
        </h1>

        <div className="space-y-6 border border-[#E5E5E5] bg-white p-6 lg:p-8">
          <Field label="Full name">
            <input
              data-testid="onboard-name"
              className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
              value={form.name} onChange={(e) => upd("name", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              data-testid="onboard-phone"
              className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
              value={form.phone} onChange={(e) => upd("phone", e.target.value)}
            />
          </Field>

          {role === "volunteer" ? (
            <>
              <Field label="Your skills">
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-[#111] bg-[#111] text-white">
                      {s}
                      <button onClick={() => upd("skills", form.skills.filter((x) => x !== s))} className="ml-1">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    data-testid="onboard-skill-input"
                    placeholder="Type a skill and press Enter"
                    className="border border-[#E5E5E5] px-3 py-2 flex-1 focus:outline-none focus:border-[#111]"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(newSkill); } }}
                  />
                  <button data-testid="onboard-skill-add" className="btn-outline-black px-3 text-sm" onClick={() => addSkill(newSkill)}>ADD</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s)).map((s) => (
                    <button key={s} onClick={() => addSkill(s)} className="text-xs px-2 py-1 border border-[#E5E5E5] hover:border-[#111]">
                      + {s}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Languages">
                <div className="flex flex-wrap gap-2">
                  {LANG_OPTIONS.map((l) => (
                    <button key={l} onClick={() => toggleIn("languages", l)}
                      className={`text-xs px-3 py-1.5 border font-mono uppercase tracking-wide ${
                        form.languages.includes(l) ? "bg-[#002FA7] text-white border-[#002FA7]" : "border-[#E5E5E5]"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Time slots available">
                <div className="flex gap-2">
                  {SLOT_OPTIONS.map((s) => (
                    <button key={s} onClick={() => toggleIn("availability_slots", s)} data-testid={`onboard-slot-${s}`}
                      className={`flex-1 px-3 py-2 border font-mono uppercase text-xs tracking-wide ${
                        form.availability_slots.includes(s) ? "bg-[#111] text-white border-[#111]" : "border-[#E5E5E5]"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <button onClick={generateDates} className="btn-outline-black px-3 py-1.5 text-xs" data-testid="onboard-dates-btn">
                    AUTO-ADD NEXT 20 DAYS
                  </button>
                  <span className="ml-3 label-mono">{form.availability_dates.length} dates</span>
                </div>
              </Field>

              <Field label="Location (city/area)">
                <input
                  data-testid="onboard-location"
                  className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.location_name} onChange={(e) => upd("location_name", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input placeholder="Lat" type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm" value={form.location_lat} onChange={(e) => upd("location_lat", parseFloat(e.target.value))} />
                  <input placeholder="Lng" type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm" value={form.location_lng} onChange={(e) => upd("location_lng", parseFloat(e.target.value))} />
                </div>
              </Field>

              <Field label="Experience (optional)">
                <textarea rows={3} className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.experience} onChange={(e) => upd("experience", e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="NGO name">
                <input data-testid="onboard-ngo-name" className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.ngo_name} onChange={(e) => upd("ngo_name", e.target.value)} />
              </Field>
              <Field label="Registration number">
                <input data-testid="onboard-ngo-reg" className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.registration_no} onChange={(e) => upd("registration_no", e.target.value)} />
              </Field>
              <Field label="Focus areas">
                <div className="flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.map((f) => (
                    <button key={f} onClick={() => toggleIn("focus_areas", f)} data-testid={`onboard-focus-${f}`}
                      className={`text-xs px-3 py-1.5 border font-mono uppercase tracking-wide ${
                        form.focus_areas.includes(f) ? "bg-[#002FA7] text-white border-[#002FA7]" : "border-[#E5E5E5]"
                      }`}>{f}</button>
                  ))}
                </div>
              </Field>
              <Field label="Description">
                <textarea rows={3} className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.description} onChange={(e) => upd("description", e.target.value)} />
              </Field>
              <Field label="Website (optional)">
                <input className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.website} onChange={(e) => upd("website", e.target.value)} />
              </Field>
              <Field label="Location">
                <input className="border border-[#E5E5E5] px-3 py-2 w-full focus:outline-none focus:border-[#111]"
                  value={form.location_name} onChange={(e) => upd("location_name", e.target.value)} />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input placeholder="Lat" type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm" value={form.location_lat} onChange={(e) => upd("location_lat", parseFloat(e.target.value))} />
                  <input placeholder="Lng" type="number" step="0.001" className="border border-[#E5E5E5] px-3 py-2 font-mono text-sm" value={form.location_lng} onChange={(e) => upd("location_lng", parseFloat(e.target.value))} />
                </div>
              </Field>
            </>
          )}

          <button
            data-testid="onboard-submit"
            disabled={submitting}
            onClick={submit}
            className="btn-primary w-full px-5 py-3 font-medium flex items-center justify-center gap-2"
          >
            {submitting ? "SAVING..." : "COMPLETE PROFILE"} <ArrowRight size={16} />
          </button>
          {role === "ngo" && (
            <p className="text-xs text-[#5C5C5C]">Note: NGOs require admin verification before posting tasks.</p>
          )}
        </div>
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

import React from "react";
import { UrgencyBadge, StatusBadge, SkillTag } from "./Badges";
import { MapPin, Users, Calendar } from "lucide-react";

export function TaskCard({ task, onClick, children }) {
  return (
    <div
      data-testid={`task-card-${task.task_id}`}
      onClick={onClick}
      className={`border border-[#E5E5E5] bg-white p-5 card-tactile ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <UrgencyBadge value={task.urgency} />
            <StatusBadge status={task.status} />
            <span className="label-mono">{task.category}</span>
          </div>
          <h3 className="font-heading font-bold text-lg leading-tight mb-1">{task.title}</h3>
          <p className="text-sm text-[#5C5C5C] line-clamp-2">{task.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(task.required_skills || []).slice(0, 5).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#E5E5E5]">
        <div className="flex items-center gap-1.5 text-xs text-[#5C5C5C]">
          <MapPin size={12} /> {task.location_name}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#5C5C5C]">
          <Users size={12} /> {task.volunteers_matched || 0}/{task.volunteers_required}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#5C5C5C] font-mono">
          <Calendar size={12} /> {task.start_date?.slice(5)}
        </div>
      </div>
      {children}
    </div>
  );
}

export function ScoreBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono tracking-wider uppercase">
        <span>{label}</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-[#E5E5E5]">
        <div className="h-full fill-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function StatCard({ label, value, sublabel }) {
  return (
    <div className="border border-[#E5E5E5] bg-white p-5">
      <div className="label-mono mb-2">{label}</div>
      <div className="font-heading font-black text-4xl lg:text-5xl leading-none">{value}</div>
      {sublabel && <div className="text-xs text-[#5C5C5C] mt-2">{sublabel}</div>}
    </div>
  );
}

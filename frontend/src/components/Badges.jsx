import React from "react";

export function UrgencyBadge({ value = 3 }) {
  const labels = { 1: "LOW", 2: "MODERATE", 3: "ELEVATED", 4: "HIGH", 5: "CRITICAL" };
  return (
    <span
      data-testid={`urgency-badge-${value}`}
      className={`urg-${value} inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono tracking-wider border border-black/10`}
    >
      <span>U/{value}</span>
      <span className="opacity-80">{labels[value]}</span>
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    open: "bg-[#E0F7FA] text-[#006064] border-[#006064]",
    matching: "bg-[#FFF3E0] text-[#E65100] border-[#E65100]",
    active: "bg-[#E8F5E9] text-[#1B5E20] border-[#1B5E20]",
    completed: "bg-[#F5F5F5] text-[#424242] border-[#424242]",
    pending: "bg-[#FFF3E0] text-[#E65100] border-[#E65100]",
    accepted: "bg-[#E8F5E9] text-[#1B5E20] border-[#1B5E20]",
    declined: "bg-[#FFEBEE] text-[#B71C1C] border-[#B71C1C]",
    cancelled: "bg-[#F5F5F5] text-[#424242] border-[#424242]",
  };
  return (
    <span className={`${map[status] || map.open} inline-flex items-center px-2 py-0.5 text-[11px] font-mono tracking-wider border uppercase`}>
      {status}
    </span>
  );
}

export function SkillTag({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono tracking-wide border border-[#111] bg-white text-[#111]">
      {children}
    </span>
  );
}

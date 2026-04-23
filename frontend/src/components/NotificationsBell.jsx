import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../lib/api";

export default function NotificationsBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 20 } });
      setData(data);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const clickNotif = async (n) => {
    try { await api.put(`/notifications/${n.notification_id}/read`); } catch {}
    setOpen(false);
    if (n.link) navigate(n.link);
    load();
  };

  const markAll = async () => {
    try { await api.put("/notifications/read-all"); load(); } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="notifications-bell"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 border border-[#E5E5E5] hover:border-[#111] transition-colors"
      >
        <Bell size={16} />
        {data.unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF2A2A] text-white text-[10px] font-mono px-1 py-0.5 min-w-[16px] text-center">
            {data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] border border-[#111] bg-white shadow-[4px_4px_0_0_#111] z-50">
          <div className="flex items-center justify-between p-3 border-b border-[#E5E5E5]">
            <div className="label-mono">Notifications</div>
            {data.unread > 0 && (
              <button data-testid="mark-all-read" onClick={markAll} className="text-[10px] font-mono uppercase tracking-wider hover:text-[#002FA7]">
                MARK ALL READ
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-auto">
            {data.items.length === 0 && (
              <div className="p-6 text-sm text-[#5C5C5C] text-center">No notifications yet.</div>
            )}
            {data.items.map((n) => (
              <button
                key={n.notification_id}
                onClick={() => clickNotif(n)}
                className={`w-full text-left p-3 border-b border-[#E5E5E5] hover:bg-[#FAFAFA] ${!n.read ? "bg-[#F0F4FF]" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-2 h-2 bg-[#002FA7] mt-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-sm">{n.title}</div>
                    <div className="text-xs text-[#5C5C5C] mt-0.5">{n.body}</div>
                    <div className="label-mono mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

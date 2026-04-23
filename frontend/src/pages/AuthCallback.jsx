import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, refresh } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login", { replace: true });
      return;
    }
    const sessionId = match[1];
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        if (setUser) setUser(data.user);
        else await refresh();
        const u = data.user;
        // route by role
        if (!u.role) {
          navigate("/onboarding", { replace: true, state: { user: u } });
        } else if (u.role === "admin") {
          navigate("/admin", { replace: true, state: { user: u } });
        } else if (u.role === "ngo") {
          navigate("/ngo", { replace: true, state: { user: u } });
        } else {
          navigate("/volunteer", { replace: true, state: { user: u } });
        }
      } catch (e) {
        console.error(e);
        navigate("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <div className="label-mono mb-4">Signing you in</div>
        <div className="font-heading font-black text-4xl tracking-tighter">Establishing session...</div>
        <div className="mt-6 inline-block w-12 h-1 bg-[#E5E5E5] overflow-hidden">
          <div className="h-full bg-[#002FA7] fill-bar" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}

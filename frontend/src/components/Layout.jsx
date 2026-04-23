import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Layout({ nav = [], children, portalLabel = "" }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111]">
      {/* Top bar */}
      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" data-testid="nav-home" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#002FA7] flex items-center justify-center">
                <span className="text-white font-heading font-black text-sm">S</span>
              </div>
              <span className="font-heading font-black text-lg tracking-tight">SRA</span>
              {portalLabel && (
                <span className="hidden md:inline-block ml-2 label-mono border border-[#111] px-2 py-0.5">
                  {portalLabel}
                </span>
              )}
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    className={`px-3 py-2 text-sm font-medium transition-all ${
                      active ? "bg-[#111] text-white" : "text-[#111] hover:bg-[#F0F0F0]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden md:flex items-center gap-2">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 border border-[#E5E5E5]" />
                  ) : (
                    <div className="w-8 h-8 bg-[#111] text-white flex items-center justify-center font-mono text-xs">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C5C5C]">
                      {user.role || "no role"}
                    </div>
                  </div>
                </div>
                <button
                  data-testid="logout-btn"
                  onClick={logout}
                  className="btn-outline-black px-3 py-2 text-sm inline-flex items-center gap-1"
                >
                  <LogOut size={14} /> <span className="hidden md:inline">LOGOUT</span>
                </button>
              </>
            )}
            <button
              data-testid="menu-toggle"
              className="md:hidden p-2 border border-[#111]"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        {open && (
          <div className="md:hidden border-t border-[#E5E5E5] bg-white px-6 py-3 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm border-b border-[#E5E5E5]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 lg:py-10">{children}</main>

      <footer className="border-t border-[#E5E5E5] mt-16 py-6 text-center">
        <div className="max-w-[1400px] mx-auto px-6 label-mono">
          Smart Resource Allocation · Google Solution Challenge 2026 · Powered by Google Cloud & Gemini
        </div>
      </footer>
    </div>
  );
}

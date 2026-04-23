import React, { useRef } from "react";
import { Share2, Download } from "lucide-react";

/**
 * ShareImpactCard — generates a branded PNG of the volunteer's impact,
 * downloadable or shareable via Web Share API. Canvas-only (no server).
 */
export default function ShareImpactCard({ user }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const W = 1200, H = 630;
    canvas.width = W; canvas.height = H;

    // background
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = "#E5E5E5";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Klein Blue accent block
    ctx.fillStyle = "#002FA7";
    ctx.fillRect(0, 0, 80, H);

    // Logo S
    ctx.fillStyle = "#FFC000";
    ctx.fillRect(120, 80, 48, 48);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 32px 'Cabinet Grotesk', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("S", 144, 106);

    // Label
    ctx.fillStyle = "#5C5C5C";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("IMPACT · SMART RESOURCE ALLOCATION", 190, 108);

    // Headline
    ctx.fillStyle = "#111111";
    ctx.font = "900 56px 'Cabinet Grotesk', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${user?.name || "Volunteer"}`, 120, 220);
    ctx.font = "900 56px 'Cabinet Grotesk', sans-serif";
    ctx.fillStyle = "#002FA7";
    ctx.fillText("is making change.", 120, 290);

    // Points
    ctx.fillStyle = "#111111";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    ctx.fillText("REWARD POINTS EARNED", 120, 360);
    ctx.fillStyle = "#111111";
    ctx.font = "900 140px 'Cabinet Grotesk', sans-serif";
    ctx.fillText(String(user?.total_points || 0), 120, 490);

    // Badges row
    ctx.fillStyle = "#5C5C5C";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("BADGES EARNED", W - 120, 360);
    const badges = user?.badges || [];
    ctx.fillStyle = "#111111";
    ctx.font = "900 140px 'Cabinet Grotesk', sans-serif";
    ctx.fillText(String(badges.length), W - 120, 490);

    // Badge labels
    ctx.font = "500 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#5C5C5C";
    ctx.textAlign = "right";
    const badgeText = badges.slice(0, 3).map((b) => b.replace(/_/g, " ").toUpperCase()).join(" · ");
    if (badgeText) ctx.fillText(badgeText, W - 120, 520);

    // Footer strip
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, H - 60, W, 60);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("JOIN · WWW.SRA.IO · GOOGLE SOLUTION CHALLENGE 2026", 120, H - 30);
    ctx.fillStyle = "#FFC000";
    ctx.textAlign = "right";
    ctx.fillText("#SMARTRESOURCES", W - 120, H - 30);

    return canvas.toDataURL("image/png");
  };

  const download = () => {
    const url = draw();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(user?.name || "impact").replace(/\s+/g, "_")}_SRA_impact.png`;
    a.click();
  };

  const share = async () => {
    const url = draw();
    if (!url) return;
    // try Web Share API with file
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "sra_impact.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "My SRA Impact",
          text: "I'm contributing to urgent community needs via Smart Resource Allocation.",
          files: [file],
        });
        return;
      }
    } catch {}
    // fallback: download
    download();
  };

  return (
    <div className="border border-[#111] bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="label-mono">Share your impact</div>
        <div className="flex gap-2">
          <button data-testid="share-impact-download" onClick={download} className="btn-outline-black px-3 py-1.5 text-xs inline-flex items-center gap-1">
            <Download size={12} /> PNG
          </button>
          <button data-testid="share-impact-share" onClick={share} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1">
            <Share2 size={12} /> SHARE
          </button>
        </div>
      </div>
      <div className="aspect-[1200/630] bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center">
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-start justify-between p-6">
            <div>
              <div className="label-mono mb-2">IMPACT · SRA</div>
              <div className="font-heading font-black text-2xl md:text-4xl tracking-tighter">{user?.name || "Volunteer"}</div>
              <div className="font-heading font-black text-2xl md:text-4xl tracking-tighter text-[#002FA7]">is making change.</div>
            </div>
            <div className="text-right">
              <div className="label-mono">BADGES</div>
              <div className="font-heading font-black text-4xl md:text-6xl">{(user?.badges || []).length}</div>
            </div>
          </div>
          <div className="flex-1 flex items-end justify-between p-6">
            <div>
              <div className="label-mono">REWARD POINTS</div>
              <div className="font-heading font-black text-4xl md:text-6xl">{user?.total_points || 0}</div>
            </div>
            <div className="label-mono text-[#FFC000] bg-[#111] text-white px-2 py-1">#SMARTRESOURCES</div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-[#5C5C5C] mt-3">
        Click SHARE or PNG to post this card on LinkedIn, Twitter, or WhatsApp — amplify the mission.
      </p>
    </div>
  );
}

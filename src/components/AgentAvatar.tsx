import { memo } from "react";
import { agentColor, agentIcon } from "../lib/constants";
import type { PaneStatus } from "../lib/types";

const STATUS_FX: Record<PaneStatus, { color: string; aura: number; sparkle: boolean; typing: boolean }> = {
  ready: { color: "#39ff14", aura: 1, sparkle: false, typing: false }, // matrix green
  busy:  { color: "#00f0ff", aura: 2, sparkle: true,  typing: true  }, // neon cyan
  idle:  { color: "#3a4658", aura: 0, sparkle: false, typing: false }, // dim slate
};

interface AgentAvatarProps {
  name: string;
  target: string;
  status: PaneStatus;
  preview: string;
  accent: string;
  activity?: string;
  onClick: () => void;
}

export const AgentAvatar = memo(function AgentAvatar({ name, target, status, preview, accent, activity, onClick }: AgentAvatarProps) {
  const color = agentColor(name);
  const fx = STATUS_FX[status];
  const filterId = `glow-${target.replace(/[^a-z0-9]/gi, "-")}`;
  const auraId = `aura-${target.replace(/[^a-z0-9]/gi, "-")}`;

  const displayName = name.replace(/-oracle$/, "").replace(/-/g, " ");
  const shortName = displayName.length > 10 ? displayName.slice(0, 10) + ".." : displayName;
  const icon = agentIcon(name);
  const isCompacting = preview.toLowerCase().includes("compacting");

  // Deterministic features from name hash (LEGO tactical minifig)
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  const helmetStyle = Math.abs(h) % 3;         // 0=combat, 1=riot (w/ crest), 2=stealth (flat)
  const emblemStyle = Math.abs(h >> 4) % 4;    // 0=shield, 1=lock, 2=radar, 3=crosshair
  const hasAntenna = Math.abs(h >> 8) % 2 === 0; // radio antenna on helmet
  // Legacy name kept so no unused-var warnings and old bubble math still valid
  const hasEars = false;
  const eyeStyle = 0;
  void hasEars; void eyeStyle;

  // Darken agent color for armor shading
  const darken = (hex: string, amt = 0.35) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amt)));
    const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amt)));
    const b = Math.max(0, Math.floor((n & 0xff) * (1 - amt)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };
  const armorDark = darken(color, 0.45);
  const armorMid = darken(color, 0.2);

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
        <radialGradient id={auraId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={fx.color} stopOpacity={0.3} />
          <stop offset="70%" stopColor={fx.color} stopOpacity={0.05} />
          <stop offset="100%" stopColor={fx.color} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* === LEVEL 2 AURA (busy) === */}
      {fx.aura >= 2 && (
        <>
          <circle cx={0} cy={-6} r={42} fill="none" stroke={fx.color} strokeWidth={2}
            opacity={0.2} style={{ animation: "saiyan-outer 2s ease-in-out infinite" }} />
          <circle cx={0} cy={-6} r={36} fill={`url(#${auraId})`}
            style={{ animation: "saiyan-aura 2s ease-in-out infinite" }} />
          <rect x={-1.5} y={-65} width={3} height={30} rx={1} fill={fx.color} opacity={0.25}
            style={{ animation: "agent-pulse 0.6s ease-in-out infinite" }} />
          <ellipse cx={0} cy={24} rx={24} ry={6} fill="none" stroke={fx.color} strokeWidth={2}
            opacity={0.35} style={{ animation: "agent-pulse 0.8s ease-in-out infinite" }} />
        </>
      )}

      {/* === LEVEL 1 AURA (ready — subtle glow) === */}
      {fx.aura === 1 && (
        <>
          <circle cx={0} cy={-6} r={28} fill={`url(#${auraId})`} />
          <ellipse cx={0} cy={24} rx={18} ry={4} fill={fx.color} opacity={0.15} />
        </>
      )}

      {/* === SPARKLES (busy) === */}
      {fx.sparkle && (
        <>
          {[
            { ox: -24, oy: -28, d: 0 }, { ox: 22, oy: -16, d: 0.4 },
            { ox: -18, oy: 5, d: 0.8 }, { ox: 26, oy: -32, d: 1.2 },
          ].map((s, i) => (
            <g key={i} transform={`translate(${s.ox}, ${s.oy})`}
              style={{ animation: `sparkle 1.2s ease-in-out ${s.d}s infinite` }}>
              <line x1={-3} y1={0} x2={3} y2={0} stroke={fx.color} strokeWidth={1.5} />
              <line x1={0} y1={-3} x2={0} y2={3} stroke={fx.color} strokeWidth={1.5} />
            </g>
          ))}
        </>
      )}

      {/* Ground shadow */}
      <ellipse cx={0} cy={24} rx={16} ry={4}
        fill={status === "idle" ? "#333" : fx.color}
        opacity={status === "idle" ? 0.3 : 0.2} />

      {/* Chibi body group — spins when busy or compacting */}
      <g style={(fx.typing || isCompacting) ? { animation: "chibi-spin 3s ease-in-out infinite", transformOrigin: "0 0" } : {}}>

      {/* ══════════════════════════════════════════════
           LEGO TACTICAL SECURITY MINIFIG
           Head/helmet (-36..-8), torso (-5..18), legs (18..30)
         ══════════════════════════════════════════════ */}

      {/* === LEGS (drawn first, behind torso) === */}
      {/* Hip piece */}
      <rect x={-9} y={17} width={18} height={3} fill={armorDark} stroke="#0a0e1a" strokeWidth={0.6} />
      {/* Left leg */}
      <rect x={-9} y={20} width={8} height={10} fill={armorDark} stroke="#0a0e1a" strokeWidth={0.6} />
      {/* Right leg */}
      <rect x={1} y={20} width={8} height={10} fill={armorDark} stroke="#0a0e1a" strokeWidth={0.6} />
      {/* Tactical boots */}
      <rect x={-10} y={28} width={9} height={3} rx={0.5} fill="#0a0e1a" />
      <rect x={1} y={28} width={9} height={3} rx={0.5} fill="#0a0e1a" />
      {/* Knee pads — agent color */}
      <rect x={-8.5} y={23} width={7} height={1.5} fill={color} opacity={0.6} />
      <rect x={1.5} y={23} width={7} height={1.5} fill={color} opacity={0.6} />

      {/* === TORSO (tactical vest) === */}
      {/* Main body */}
      <rect x={-13} y={-5} width={26} height={22} rx={1} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.8} />
      {/* Vest plates — darker panels */}
      <rect x={-11} y={-3} width={10} height={14} fill={armorDark} opacity={0.8} />
      <rect x={1} y={-3} width={10} height={14} fill={armorDark} opacity={0.8} />
      {/* Center chest strip */}
      <rect x={-1} y={-5} width={2} height={22} fill="#0a0e1a" />
      {/* Shoulder straps */}
      <rect x={-13} y={-5} width={26} height={2} fill={color} opacity={0.5} />
      <rect x={-13} y={0} width={26} height={1.2} fill={color} opacity={0.3} />

      {/* Chest emblem (security icon, agent color glow) */}
      <g transform="translate(0, 5)">
        {emblemStyle === 0 && (
          <>{/* Shield */}
            <path d="M -4,-3 L 4,-3 L 4,1 Q 4,4 0,5 Q -4,4 -4,1 Z" fill={color} stroke="#0a0e1a" strokeWidth={0.4} />
            <path d="M -2,-1 L 0,-1 L 0,2" fill="none" stroke="#0a0e1a" strokeWidth={0.6} />
          </>
        )}
        {emblemStyle === 1 && (
          <>{/* Lock */}
            <rect x={-3} y={-1} width={6} height={5} rx={0.5} fill={color} stroke="#0a0e1a" strokeWidth={0.4} />
            <path d="M -2,-1 L -2,-3 Q -2,-5 0,-5 Q 2,-5 2,-3 L 2,-1" fill="none" stroke={color} strokeWidth={1} />
            <circle cx={0} cy={1.5} r={0.6} fill="#0a0e1a" />
          </>
        )}
        {emblemStyle === 2 && (
          <>{/* Radar */}
            <circle cx={0} cy={1} r={4} fill="none" stroke={color} strokeWidth={0.8} />
            <circle cx={0} cy={1} r={2} fill="none" stroke={color} strokeWidth={0.5} />
            <line x1={0} y1={1} x2={3} y2={-1.5} stroke={color} strokeWidth={1} strokeLinecap="round" />
            <circle cx={0} cy={1} r={0.6} fill={color} />
          </>
        )}
        {emblemStyle === 3 && (
          <>{/* Crosshair */}
            <circle cx={0} cy={1} r={3.5} fill="none" stroke={color} strokeWidth={0.8} />
            <line x1={-5} y1={1} x2={5} y2={1} stroke={color} strokeWidth={0.6} />
            <line x1={0} y1={-4} x2={0} y2={6} stroke={color} strokeWidth={0.6} />
            <circle cx={0} cy={1} r={0.7} fill={color} />
          </>
        )}
      </g>

      {/* Status LEDs on chest */}
      <circle cx={-10} cy={-1} r={0.9} fill={fx.color}
        style={fx.aura >= 2 ? { animation: "agent-pulse 0.6s ease-in-out infinite" } : {}} />
      <circle cx={-10} cy={2} r={0.9} fill={fx.color} opacity={0.5} />
      <circle cx={10} cy={-1} r={0.9} fill={fx.color} opacity={0.5} />
      <circle cx={10} cy={2} r={0.9} fill={fx.color}
        style={fx.aura >= 2 ? { animation: "agent-pulse 0.6s ease-in-out 0.3s infinite" } : {}} />

      {/* Neck */}
      <rect x={-4} y={-8} width={8} height={3} fill="#1a1f2e" stroke="#0a0e1a" strokeWidth={0.4} />

      {/* === HEAD (LEGO yellow-ish skin under visor) === */}
      <rect x={-10} y={-22} width={20} height={14} rx={1.5} fill="#e8c179" stroke="#0a0e1a" strokeWidth={0.8} />

      {/* === TACTICAL HELMET === */}
      {helmetStyle === 0 && (
        <>{/* Combat helmet — rounded */}
          <path d="M -11,-16 Q -11,-32 0,-32 Q 11,-32 11,-16 L 11,-12 L -11,-12 Z"
            fill={armorDark} stroke="#0a0e1a" strokeWidth={0.9} />
          {/* Top highlight */}
          <path d="M -8,-28 Q 0,-31 8,-28" fill="none" stroke={color} strokeWidth={0.6} opacity={0.6} />
          {/* Side rail */}
          <rect x={-11} y={-16} width={22} height={2} fill="#0a0e1a" />
        </>
      )}
      {helmetStyle === 1 && (
        <>{/* Riot helmet with crest */}
          <path d="M -11,-16 Q -11,-30 0,-32 Q 11,-30 11,-16 L 11,-12 L -11,-12 Z"
            fill={armorDark} stroke="#0a0e1a" strokeWidth={0.9} />
          {/* Crest ridge */}
          <rect x={-1} y={-34} width={2} height={6} fill={color} />
          <path d="M 0,-34 L -4,-28 L 4,-28 Z" fill={color} opacity={0.7} />
          <rect x={-11} y={-16} width={22} height={2} fill="#0a0e1a" />
        </>
      )}
      {helmetStyle === 2 && (
        <>{/* Stealth helmet — flat top */}
          <path d="M -12,-14 L -12,-26 L -9,-30 L 9,-30 L 12,-26 L 12,-14 Z"
            fill={armorDark} stroke="#0a0e1a" strokeWidth={0.9} />
          {/* Plate line */}
          <line x1={-12} y1={-22} x2={12} y2={-22} stroke={color} strokeWidth={0.5} opacity={0.5} />
          <rect x={-12} y={-16} width={24} height={2} fill="#0a0e1a" />
        </>
      )}

      {/* Stud on top of helmet (classic LEGO) */}
      <ellipse cx={0} cy={-33} rx={3} ry={0.8} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.4} />
      <rect x={-3} y={-34.5} width={6} height={2} rx={0.5} fill={armorDark} stroke="#0a0e1a" strokeWidth={0.4} />
      <ellipse cx={0} cy={-34.5} rx={3} ry={0.8} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.4} />

      {/* Radio antenna */}
      {hasAntenna && (
        <>
          <line x1={8} y1={-28} x2={11} y2={-40} stroke="#0a0e1a" strokeWidth={1} />
          <circle cx={11} cy={-40} r={1.5} fill={fx.color}
            style={fx.aura >= 2 ? { animation: "agent-pulse 0.5s ease-in-out infinite" } : { filter: `drop-shadow(0 0 2px ${fx.color})` }} />
        </>
      )}

      {/* === VISOR (HUD strip with neon glow) === */}
      <rect x={-10} y={-19} width={20} height={5} fill="#0a0e1a" stroke="#0a0e1a" strokeWidth={0.4} />
      {/* Visor glow line */}
      <rect x={-9} y={-18} width={18} height={2.5} fill={fx.color}
        opacity={status === "idle" ? 0.15 : 0.7}
        style={fx.aura >= 2 ? { animation: "agent-pulse 1s ease-in-out infinite" } : {}} />
      {/* Visor scan line */}
      {status !== "idle" && (
        <rect x={-9} y={-17} width={18} height={0.5} fill="#fff" opacity={0.6} />
      )}
      {/* Visor HUD ticks */}
      <rect x={-8} y={-18.5} width={1} height={1.5} fill="#0a0e1a" opacity={0.8} />
      <rect x={-4} y={-18.5} width={1} height={1.5} fill="#0a0e1a" opacity={0.8} />
      <rect x={3} y={-18.5} width={1} height={1.5} fill="#0a0e1a" opacity={0.8} />
      <rect x={7} y={-18.5} width={1} height={1.5} fill="#0a0e1a" opacity={0.8} />

      {/* Jaw line / mouth slit */}
      {status === "busy" ? (
        <rect x={-3} y={-11} width={6} height={1.2} fill="#0a0e1a" />
      ) : (
        <line x1={-3} y1={-10} x2={3} y2={-10} stroke="#0a0e1a" strokeWidth={0.8} strokeLinecap="round" />
      )}

      {/* Cheek straps */}
      <line x1={-10} y1={-14} x2={-10} y2={-9} stroke="#0a0e1a" strokeWidth={0.8} />
      <line x1={10} y1={-14} x2={10} y2={-9} stroke="#0a0e1a" strokeWidth={0.8} />

      {/* === ARMS (LEGO boxy) === */}
      {fx.typing ? (
        <>
          {/* Left arm typing */}
          <g style={{ animation: "typing-arm 0.25s ease-in-out infinite", transformOrigin: "-13px -3px" }}>
            <rect x={-17} y={-3} width={5} height={14} rx={1} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.7} />
            <rect x={-17} y={9} width={5} height={4} rx={1} fill="#e8c179" stroke="#0a0e1a" strokeWidth={0.5} />
          </g>
          {/* Right arm typing */}
          <g style={{ animation: "typing-arm 0.25s ease-in-out 0.12s infinite", transformOrigin: "13px -3px" }}>
            <rect x={12} y={-3} width={5} height={14} rx={1} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.7} />
            <rect x={12} y={9} width={5} height={4} rx={1} fill="#e8c179" stroke="#0a0e1a" strokeWidth={0.5} />
          </g>
        </>
      ) : (
        <>
          {/* Left arm at rest */}
          <rect x={-17} y={-3} width={5} height={14} rx={1} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.7} />
          <rect x={-17} y={10} width={5} height={4} rx={1} fill="#e8c179" stroke="#0a0e1a" strokeWidth={0.5} />
          {/* Right arm at rest — holding pistol */}
          <rect x={12} y={-3} width={5} height={14} rx={1} fill={armorMid} stroke="#0a0e1a" strokeWidth={0.7} />
          <rect x={12} y={10} width={5} height={4} rx={1} fill="#e8c179" stroke="#0a0e1a" strokeWidth={0.5} />
          {/* Tactical pistol in right hand */}
          <g transform="translate(15, 11)">
            {/* Barrel */}
            <rect x={1} y={-1.5} width={9} height={3} rx={0.5} fill="#2a2a2a" stroke="#1a1a1a" strokeWidth={0.4} />
            {/* Slide serrations */}
            <line x1={3} y1={-1.5} x2={3} y2={1.5} stroke="#1a1a1a" strokeWidth={0.3} />
            <line x1={4.5} y1={-1.5} x2={4.5} y2={1.5} stroke="#1a1a1a" strokeWidth={0.3} />
            <line x1={6} y1={-1.5} x2={6} y2={1.5} stroke="#1a1a1a" strokeWidth={0.3} />
            {/* Grip */}
            <rect x={0} y={1.5} width={5} height={6} rx={0.5} fill="#333" stroke="#1a1a1a" strokeWidth={0.4} />
            {/* Trigger guard */}
            <path d="M 2,1.5 Q 4,5 7,1.5" fill="none" stroke="#1a1a1a" strokeWidth={0.6} />
            {/* Trigger */}
            <line x1={4} y1={2} x2={4} y2={4} stroke="#1a1a1a" strokeWidth={0.5} />
            {/* Muzzle flash dot */}
            <circle cx={10.5} cy={0} r={0.8} fill={fx.color} opacity={0.5} />
          </g>
        </>
      )}

      {/* Shoulder pads (agent color accents) */}
      <rect x={-15} y={-5} width={4} height={3} fill={color} />
      <rect x={11} y={-5} width={4} height={3} fill={color} />

      {/* Icon badge on shoulder (if agent has icon) */}
      {icon && (
        <text x={0} y={16} textAnchor="middle" fontSize={6} style={{ pointerEvents: "none" }} opacity={0.85}>
          {icon}
        </text>
      )}

      </g>{/* end chibi-spin group */}

      {/* Status dot */}
      {status !== "idle" && (
        <circle cx={16} cy={-28} r={5} fill={fx.color} opacity={0.4} filter={`url(#${filterId})`} />
      )}
      <circle cx={16} cy={-28} r={3.5} fill={fx.color} stroke="#1a1a1a" strokeWidth={1.5}
        style={fx.aura >= 2 ? { animation: "agent-pulse 0.6s ease-in-out infinite" } : {}} />

      {/* Name label removed — rendered as HTML in AgentCard */}

      {/* Name speech bubble above head (cartoon style) */}
      {(() => {
        const featureTop = hasAntenna ? -45 : hasEars ? -36 : -32;
        const bubbleGap = 2;
        const bubbleH = 11;
        const bubbleY = featureTop - bubbleGap - bubbleH;
        const tailY = featureTop - bubbleGap;
        const bubbleW = Math.min(90, (icon ? shortName.length + 2 : shortName.length) * 6 + 16);
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={-bubbleW / 2} y={bubbleY} width={bubbleW} height={bubbleH}
              rx={4} ry={4} fill="rgba(0,0,0,0.65)" stroke={accent} strokeWidth={0.5} strokeOpacity={0.3} />
            <polygon
              points={`-3,${tailY} 3,${tailY} 0,${tailY + 4}`}
              fill="rgba(0,0,0,0.65)" stroke={accent} strokeWidth={0.5} strokeOpacity={0.3}
            />
            <rect x={-4} y={tailY - 1} width={8} height={2} fill="rgba(0,0,0,0.65)" />
            <text x={0} y={bubbleY + bubbleH / 2 + 2.5} textAnchor="middle"
              fill={accent} fontSize={7} fontFamily="'SF Mono', monospace" opacity={0.9}>
              {icon ? `${icon} ${shortName}` : shortName}
            </text>
          </g>
        );
      })()}
      {/* Floating code (busy, no activity) */}
      {fx.typing && preview && !activity && (
        <foreignObject x={-65} y={-70} width={130} height={20} style={{ pointerEvents: "none" }}>
          <div style={{
            animation: "float-code 3s ease-in-out infinite",
            fontSize: "7px", color: accent, fontFamily: "'Courier New', monospace",
            textAlign: "center", whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis", opacity: 0.7,
            textShadow: `0 0 4px ${accent}`,
          }}>{preview.slice(0, 45)}</div>
        </foreignObject>
      )}

      {/* Tooltip rendered as HTML in AgentCard */}
    </g>
  );
});

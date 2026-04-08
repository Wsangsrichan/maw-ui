export const SVG_WIDTH = 1280;
export const SVG_HEIGHT = 900;

// Session group → room mapping (Cyber Security palette — neon over deep navy)
export const ROOM_COLORS: Record<string, { accent: string; floor: string; wall: string; label: string }> = {
  "0":              { accent: "#00f0ff", floor: "#08111c", wall: "#040a14", label: "Main" },
  "01-pulse":       { accent: "#ff2e88", floor: "#1a0814", wall: "#10040a", label: "Pulse" },
  "02-hermes":      { accent: "#00ffd1", floor: "#08181a", wall: "#040e10", label: "Hermes" },
  "03-neo":         { accent: "#39ff14", floor: "#0a1a0e", wall: "#041008", label: "Neo" },
  "04-homekeeper":  { accent: "#3d9bff", floor: "#08121f", wall: "#040814", label: "Homekeeper" },
  "05-volt":        { accent: "#ffeb3b", floor: "#1a1808", wall: "#100e04", label: "Volt" },
  "06-floodboy":    { accent: "#22d3ee", floor: "#08141f", wall: "#040a14", label: "FloodBoy" },
  "07-fireman":     { accent: "#ff3344", floor: "#1a0810", wall: "#10040a", label: "FireMan" },
  "08-dustboy":     { accent: "#ffb800", floor: "#1a1208", wall: "#100a04", label: "DustBoy" },
  "09-dustboychain": { accent: "#ff7a00", floor: "#1a1008", wall: "#100804", label: "DustBoyChain" },
  "10-arthur":      { accent: "#b14bff", floor: "#10081a", wall: "#0a0410", label: "Arthur" },
  "11-calliope":    { accent: "#00ff9d", floor: "#08181a", wall: "#04100e", label: "Calliope" },
  "12-odin":        { accent: "#c724ff", floor: "#10081a", wall: "#0a0410", label: "Odin" },
  "13-mother":      { accent: "#ff2e88", floor: "#1a0814", wall: "#10040a", label: "Mother" },
  "14-nexus":       { accent: "#00f0ff", floor: "#08111c", wall: "#040a14", label: "Nexus" },
  "15-xiaoer":      { accent: "#d4a373", floor: "#1a1208", wall: "#100a04", label: "XiaoEr" },
  "16-pigment":     { accent: "#ff5cf6", floor: "#1a0820", wall: "#100410", label: "Pigment" },
  "99-overview":    { accent: "#7a8ca0", floor: "#0a0e16", wall: "#06080e", label: "Overview" },
};

const FALLBACK_ACCENTS = [
  "#00f0ff", "#39ff14", "#ff2e88", "#b14bff", "#ffb800", "#00ffd1",
  "#ff3344", "#22d3ee", "#c724ff", "#00ff9d", "#ff7a00", "#ff5cf6",
];

export function roomStyle(sessionName: string) {
  if (ROOM_COLORS[sessionName]) return ROOM_COLORS[sessionName];
  // Generate deterministic style with session name as label
  let h = 0;
  for (let i = 0; i < sessionName.length; i++) h = ((h << 5) - h + sessionName.charCodeAt(i)) | 0;
  const accent = FALLBACK_ACCENTS[Math.abs(h) % FALLBACK_ACCENTS.length];
  const label = sessionName.replace(/^\d+-/, ""); // strip number prefix
  return { accent, floor: "#1a1a20", wall: "#121218", label: label.charAt(0).toUpperCase() + label.slice(1) };
}

// Preferred agent display order (lower = first, unlisted = 999)
export const AGENT_ORDER: Record<string, number> = {
  "neo-oracle": 0,
  "nexus-oracle": 1,
  "hermes-oracle": 2,
  "pulse-oracle": 3,
};

export function agentSortKey(name: string): number {
  return AGENT_ORDER[name] ?? 999;
}

// Oracle-specific icons (unique emoji per oracle)
export const ORACLE_ICONS: Record<string, string> = {
  neo: "🟢",
  pulse: "💓",
  hermes: "📡",
  mother: "🔮",
  odin: "👁️",
  pigment: "🎨",
  calliope: "📖",
  volt: "⚡",
  homekeeper: "🏠",
  floodboy: "🌊",
  fireman: "🔥",
  dustboychain: "💨",
  dustboy: "💨",
  arthur: "🗡️",
  phukhao: "⛰️",
  athena: "🦉",
  thor: "⚡",
  mycelium: "🍄",
  apollo: "☀️",
  nexus: "🔍",
  xiaoer: "🍵",
};

export function agentIcon(name: string): string | undefined {
  const key = name.replace(/-oracle$/, "").replace(/-/g, "").toLowerCase();
  return ORACLE_ICONS[key];
}

// Agent capsule colors (deterministic by name hash)
export const AGENT_COLORS = [
  "#00f0ff", "#39ff14", "#ff2e88", "#b14bff", "#ffb800", "#00ffd1",
  "#22d3ee", "#c724ff", "#00ff9d", "#ff5cf6", "#ff7a00", "#3d9bff",
];

export function agentColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AGENT_COLORS[Math.abs(h) % AGENT_COLORS.length];
}

// Desk grid within each room
export const DESK = {
  cols: 4,
  cellW: 200,
  cellH: 160,
  offsetX: 30,
  offsetY: 60,
} as const;

// Room layout grid
export const ROOM_GRID = {
  cols: 3,
  roomW: 400,
  roomH: 400,
  gapX: 20,
  gapY: 20,
  startX: 20,
  startY: 70,
} as const;

export const AVATAR = {
  radius: 20,
  strokeWidth: 3,
  nameLabelMaxChars: 12,
} as const;

// Preview card dimensions
export const PREVIEW_CARD = {
  width: 520,
  maxHeight: 860,
} as const;

/** Client-side fallback — server resolves the real command from maw.config.json via buildCommand().
 *  When empty string is sent, the server handler uses buildCommand() automatically. */
export function guessCommand(_agentName: string): string {
  return ""; // empty = let server resolve from maw.config.json
}

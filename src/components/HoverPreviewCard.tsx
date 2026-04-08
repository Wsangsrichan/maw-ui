import { useState, useEffect, useRef, useCallback, memo } from "react";
import { ansiToHtml, processCapture } from "../lib/ansi";
import { agentColor, PREVIEW_CARD } from "../lib/constants";
import { apiUrl } from "../lib/api";
import { AgentAvatar } from "./AgentAvatar";
import type { AgentState, AgentEvent } from "../lib/types";

interface HoverPreviewCardProps {
  agent: AgentState;
  roomLabel: string;
  accent: string;
  pinned?: boolean;
  compact?: boolean;
  send?: (msg: object) => void;
  onFullscreen?: () => void;
  onClose?: () => void;
  eventLog?: AgentEvent[];
  addEvent?: (target: string, type: AgentEvent["type"], detail: string) => void;
  externalInputBuf?: string;
  onInputBufChange?: (val: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  busy: "#fdd835",
  ready: "#4caf50",
  idle: "#666",
  crashed: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  busy: "BUSY",
  ready: "READY",
  idle: "IDLE",
  crashed: "CRASHED",
};

// trimCapture replaced by shared processCapture from ansi.ts

export const HoverPreviewCard = memo(function HoverPreviewCard({
  agent,
  roomLabel,
  accent,
  pinned = false,
  compact = false,
  send,
  onFullscreen,
  onClose,
  eventLog,
  addEvent,
  externalInputBuf,
  onInputBufChange,
}: HoverPreviewCardProps) {
  const [content, setContent] = useState("");
  const [localInputBuf, setLocalInputBuf] = useState("");
  const inputBuf = externalInputBuf ?? localInputBuf;
  const setInputBuf = useCallback((val: string) => {
    setLocalInputBuf(val);
    onInputBufChange?.(val);
  }, [onInputBufChange]);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const color = agentColor(agent.name);
  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
  const statusColor = STATUS_COLORS[agent.status] || "#666";

  // Sync prevInputRef when external buffer initializes
  useEffect(() => {
    if (externalInputBuf !== undefined) prevInputRef.current = externalInputBuf;
  }, []);

  // Auto-focus input when pinned (double-tap focus for mobile keyboard)
  useEffect(() => {
    if (pinned) {
      inputRef.current?.focus();
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.click();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [pinned, agent.target]);

  // Slash streaming: track whether we're in streaming mode
  const streamingRef = useRef(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose?.(); return; }
    // F11 or Cmd+Enter for fullscreen
    if (e.key === "F11" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      onFullscreen?.();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (streamingRef.current) {
        // In streaming mode: just send Enter, chars already sent
        addEvent?.(agent.target, "command", inputBuf);
        send?.({ type: "send", target: agent.target, text: "\r" });
        streamingRef.current = false;
      } else if (inputBuf && send) {
        addEvent?.(agent.target, "command", inputBuf);
        send({ type: "send", target: agent.target, text: inputBuf });
      }
      setInputBuf("");
      prevInputRef.current = "";
      return;
    }
    // Backspace in streaming mode: send to tmux
    if (e.key === "Backspace" && streamingRef.current && send) {
      send({ type: "send", target: agent.target, text: "\b" });
      return; // let default input handling remove the char
    }
  }, [inputBuf, agent.target, send, onClose, onFullscreen]);

  // Track previous input value with ref (avoids stale closure)
  const prevInputRef = useRef("");

  // Stream chars to tmux when input starts with /
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const prev = prevInputRef.current;
    prevInputRef.current = val;
    setInputBuf(val);

    if (!send) return;

    // Entering slash mode: first / typed
    if (val === "/" && prev === "") {
      streamingRef.current = true;
      send({ type: "send", target: agent.target, text: "/" });
      return;
    }

    // In streaming mode: send new chars
    if (streamingRef.current && val.length > prev.length) {
      const newChars = val.slice(prev.length);
      for (const ch of newChars) {
        send({ type: "send", target: agent.target, text: ch });
      }
    }

    // Left streaming mode (user cleared or removed /)
    if (streamingRef.current && !val.startsWith("/")) {
      streamingRef.current = false;
    }
  }, [agent.target, send]);

  // Poll terminal capture
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(apiUrl(`/api/capture?target=${encodeURIComponent(agent.target)}`));
        const data = await res.json();
        if (active) setContent(data.content || "");
      } catch {}
      if (active) setTimeout(poll, 500);
    }
    poll();
    return () => { active = false; };
  }, [agent.target]);

  // Auto-scroll to bottom — smooth when pinned, instant on hover
  const userScrolledRef = useRef(false);
  useEffect(() => {
    const el = termRef.current;
    if (!el) return;
    // If user scrolled up in pinned mode, don't force scroll
    if (pinned && userScrolledRef.current) return;
    if (pinned) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [content, pinned]);

  // Detect user scroll-up to pause auto-scroll (re-enable when near bottom)
  useEffect(() => {
    const el = termRef.current;
    if (!el || !pinned) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      userScrolledRef.current = !nearBottom;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [pinned]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] shadow-2xl"
      style={{
        background: "#0a0a0f",
        width: compact ? "100%" : PREVIEW_CARD.width,
        height: compact ? "100%" : "calc(100vh - 120px)",
        maxHeight: compact ? "100%" : PREVIEW_CARD.maxHeight,
      }}
      onMouseDown={(e) => {
        if (pinned && e.target !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      {/* Header — compact (inline) or full (big avatar) */}
      {compact ? (
        <div
          className="flex items-center gap-2.5 px-3 py-2"
          style={{
            background: `linear-gradient(90deg, ${accent}15 0%, transparent 100%)`,
            borderBottom: `1px solid ${accent}20`,
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: statusColor,
              boxShadow: agent.status !== "idle" ? `0 0 6px ${statusColor}` : undefined,
            }}
          />
          <span className="text-xs font-bold tracking-[2px] uppercase truncate" style={{ color: accent }}>
            {displayName}
          </span>
          <span className="text-[9px] font-mono shrink-0" style={{ color: statusColor }}>
            {STATUS_LABELS[agent.status]}
          </span>
          <span className="text-[8px] text-white/25 font-mono shrink-0 ml-auto">{agent.target}</span>
          {pinned && onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white/30 hover:text-white/70 hover:bg-red-500/15 active:scale-90 cursor-pointer transition-all shrink-0"
              title="Close (Esc)"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
      <div
        className="relative flex flex-col items-center pt-6 pb-4 px-4"
        style={{
          background: `linear-gradient(180deg, ${accent}15 0%, transparent 100%)`,
          borderBottom: `1px solid ${accent}20`,
        }}
      >
        {/* LEGO tactical minifig avatar */}
        <svg width={100} height={90} viewBox="-40 -55 80 85">
          <AgentAvatar
            name={agent.name}
            target={agent.target}
            status={agent.status}
            preview={agent.preview || ""}
            accent={accent}
            onClick={() => {}}
          />
        </svg>

        {/* Name + status */}
        <h2
          className="mt-2 text-base font-bold tracking-[3px] uppercase"
          style={{ color: accent }}
        >
          {displayName}
        </h2>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: statusColor,
                boxShadow: agent.status !== "idle" ? `0 0 6px ${statusColor}` : undefined,
              }}
            />
            <span className="text-[10px] font-mono" style={{ color: statusColor }}>
              {STATUS_LABELS[agent.status]}
            </span>
          </span>
          <span className="text-[10px] text-white/40 font-mono">{roomLabel}</span>
        </div>

        <span className="mt-1 text-[9px] text-white/25 font-mono">{agent.target}</span>
      </div>
      )}

      {/* Event timeline badges — pinned only, hidden in compact */}
      {pinned && !compact && eventLog && (() => {
        const events = eventLog.filter(e => e.target === agent.target).slice(-20);
        if (events.length === 0) return null;
        const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
          "status": { bg: "rgba(255,255,255,0.06)", text: "#aaa" },
          "command": { bg: "rgba(34,211,238,0.15)", text: "#22d3ee" },
        };
        return (
          <div className="flex flex-wrap gap-1 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04] overflow-hidden max-h-[52px]">
            {events.map((ev, i) => {
              const badge = STATUS_BADGE[ev.type] || STATUS_BADGE.status;
              const t = new Date(ev.time);
              const ts = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}:${t.getSeconds().toString().padStart(2, "0")}`;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap"
                  style={{ background: badge.bg, color: badge.text }}
                  title={`${ts} — ${ev.detail}`}
                >
                  <span className="text-white/30">{ts.slice(3)}</span>
                  {ev.detail}
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* Terminal header with fullscreen button */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
        <span className="text-[9px] text-white/30 tracking-[2px] uppercase font-mono">Live Terminal</span>
        <span
          className="w-1.5 h-1.5 rounded-full ml-auto"
          style={{
            background: "#4caf50",
            boxShadow: "0 0 4px #4caf50",
            animation: "agent-pulse 2s ease-in-out infinite",
          }}
        />
        {pinned && onFullscreen && (
          <button
            onClick={onFullscreen}
            className="ml-1 px-2 py-0.5 rounded text-[9px] text-white/40 hover:text-white/80 hover:bg-white/[0.06] cursor-pointer font-mono transition-colors"
            title="Fullscreen (Ctrl+Enter)"
          >
            ⛶
          </button>
        )}
        {pinned && onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-white/30 hover:text-white/70 hover:bg-red-500/15 active:scale-90 cursor-pointer transition-all"
            title="Close (Esc)"
          >
            ✕
          </button>
        )}
      </div>

      <div className="relative flex-1" style={{ background: "#08080c" }}>
        <div
          ref={termRef}
          className="absolute inset-0 px-3 py-2 overflow-y-auto overflow-x-auto font-mono text-[10px] leading-[1.4] text-[#cdd6f4] whitespace-pre break-normal"
          dangerouslySetInnerHTML={{ __html: ansiToHtml(processCapture(content)) }}
        />
        {pinned && send && (
          <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); send({ type: "send", target: agent.target, text: "\x1b[A" }); inputRef.current?.focus(); }}
              className="w-9 h-8 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-white/50 hover:text-white hover:bg-white/10 cursor-pointer flex items-center justify-center transition-colors"
              title="Up → tmux"
            >
              <svg width={12} height={8} viewBox="0 0 12 8"><path d="M1 7L6 1L11 7" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" /></svg>
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); send({ type: "send", target: agent.target, text: "\x1b[B" }); inputRef.current?.focus(); }}
              className="w-9 h-8 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-white/50 hover:text-white hover:bg-white/10 cursor-pointer flex items-center justify-center transition-colors"
              title="Down → tmux"
            >
              <svg width={12} height={8} viewBox="0 0 12 8"><path d="M1 1L6 7L11 1" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Bottom: input when pinned, preview text when hovering */}
      {pinned && send ? (
        <div
          className="flex items-center gap-2 px-3 py-2 bg-[#0e0e18] border-t border-white/[0.06] font-mono text-xs cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <span className="text-cyan-400 font-semibold shrink-0">&#x276f;</span>
          <input
            ref={inputRef}
            type="text"
            value={inputBuf}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white/90 outline-none caret-cyan-400 font-mono text-xs [&::-webkit-search-cancel-button]:hidden [&::-webkit-clear-button]:hidden [&::-ms-clear]:hidden"
            style={{ caretColor: "#22d3ee", WebkitAppearance: "none" }}
            inputMode="text"
            enterKeyHint="send"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            placeholder="type command..."
          />
          {inputBuf && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setInputBuf("");
                prevInputRef.current = "";
                if (streamingRef.current) {
                  // Clear what was streamed to tmux
                  send?.({ type: "send", target: agent.target, text: "\x15" }); // Ctrl+U clears line
                  streamingRef.current = false;
                }
                inputRef.current?.focus();
              }}
              className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/10 cursor-pointer flex items-center justify-center text-[10px] transition-colors"
              title="Clear"
            >
              ✕
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!send) return;
              if (streamingRef.current) {
                addEvent?.(agent.target, "command", inputBuf);
                send({ type: "send", target: agent.target, text: "\r" });
                streamingRef.current = false;
              } else if (inputBuf) {
                addEvent?.(agent.target, "command", inputBuf);
                send({ type: "send", target: agent.target, text: inputBuf });
              } else {
                send({ type: "send", target: agent.target, text: "\r" });
              }
              setInputBuf("");
              prevInputRef.current = "";
              inputRef.current?.focus();
            }}
            className="shrink-0 px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold cursor-pointer hover:bg-cyan-400 active:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20"
          >
            SEND
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 bg-[#0e0e18] border-t border-white/[0.06] font-mono text-[9px] text-white/30 truncate">
          {agent.preview || "..."}
        </div>
      )}

      {/* Quick command shortcuts */}
      {pinned && send && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a14] border-t border-white/[0.04] overflow-x-auto">
          {[
            { label: "y", text: "y\r", color: "#22C55E" },
            { label: "n", text: "n\r", color: "#ef5350" },
            { label: "↵", text: "\r", color: "#64748B" },
            { label: "Tab", text: "\t", color: "#a78bfa" },
            { label: "/recap", text: "/recap\r", color: "#fbbf24" },
            { label: "/help", text: "/help\r", color: "#42a5f5" },
            { label: "Ctrl+C", text: "\x03", color: "#ef5350" },
            { label: "Ctrl+Z", text: "\x1a", color: "#ffa726" },
            { label: "exit", text: "exit\r", color: "#94A3B8" },
          ].map(cmd => (
            <button
              key={cmd.label}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                send({ type: "send", target: agent.target, text: cmd.text });
                addEvent?.(agent.target, "command", cmd.label);
                inputRef.current?.focus();
              }}
              className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-mono cursor-pointer active:scale-90 transition-all"
              style={{ background: `${cmd.color}15`, color: cmd.color, border: `1px solid ${cmd.color}25` }}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}

      {/* Shortcut hints — pinned only, hidden in compact */}
      {pinned && !compact && (
        <div className="flex items-center justify-center gap-3 px-3 py-1.5 bg-[#08080c] border-t border-white/[0.04] font-mono text-[8px] text-white/20">
          <span><kbd className="text-white/30">Enter</kbd> send</span>
          <span><kbd className="text-white/30">⌃Enter</kbd> fullscreen</span>
          <span><kbd className="text-white/30">Esc</kbd> close</span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              send?.({ type: "send", target: agent.target, text: "\x1b" });
              inputRef.current?.focus();
            }}
            className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] text-white/40 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
          >
            Esc→tmux
          </button>
        </div>
      )}
    </div>
  );
});

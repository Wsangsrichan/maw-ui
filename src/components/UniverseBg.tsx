import { useEffect, useRef } from "react";

/**
 * Cyber Security background:
 * - Hex grid (canvas, animated pulse)
 * - Matrix-style binary rain
 * - Subtle vignette
 * Replaces previous three.js nebula scene for a tactical HUD feel.
 */
export function UniverseBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = window.innerWidth;
    let h = window.innerHeight;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // --- Hex grid ---
    const hexSize = 28;
    const hexW = Math.sqrt(3) * hexSize;
    const hexH = 2 * hexSize;
    const vert = hexH * 0.75;

    function drawHex(cx: number, cy: number, r: number, alpha: number) {
      ctx!.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.closePath();
      ctx!.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx!.lineWidth = 0.6;
      ctx!.stroke();
    }

    // --- Matrix rain ---
    const fontSize = 13;
    const cols = Math.floor(w / fontSize);
    const drops: number[] = new Array(cols).fill(0).map(() => Math.random() * -100);
    const charSet = "01アイウエオカキクケコサシスセソタチツテト1010110100";

    let time = 0;
    let frame = 0;
    let last = 0;
    const interval = 1000 / 24;

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (now - last < interval) return;
      last = now;
      time += 0.016;

      // Background fade (creates the matrix trail effect)
      ctx!.fillStyle = "rgba(5, 9, 18, 0.18)";
      ctx!.fillRect(0, 0, w, h);

      // Hex grid
      const cols2 = Math.ceil(w / hexW) + 2;
      const rows2 = Math.ceil(h / vert) + 2;
      for (let row = -1; row < rows2; row++) {
        for (let col = -1; col < cols2; col++) {
          const cx = col * hexW + (row % 2 === 0 ? 0 : hexW / 2);
          const cy = row * vert;
          // Distance-based alpha pulse
          const dx = cx - w / 2;
          const dy = cy - h / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pulse = Math.sin(time * 0.8 - dist * 0.008) * 0.5 + 0.5;
          const alpha = 0.04 + pulse * 0.05;
          drawHex(cx, cy, hexSize - 2, alpha);
        }
      }

      // Matrix rain
      ctx!.font = `${fontSize}px 'JetBrains Mono', monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = charSet[Math.floor(Math.random() * charSet.length)];
        const y = drops[i] * fontSize;
        // Head — bright cyan
        ctx!.fillStyle = "rgba(0, 240, 255, 0.8)";
        ctx!.fillText(ch, i * fontSize, y);
        // Tail — matrix green
        ctx!.fillStyle = "rgba(57, 255, 20, 0.35)";
        ctx!.fillText(ch, i * fontSize, y - fontSize);

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.6;
      }
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "#050912" }}
    />
  );
}

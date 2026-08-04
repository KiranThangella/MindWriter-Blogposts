import { useEffect, useRef } from "react";

// Signature visual element for the 2500 redesign: a living network of nodes
// that connect when close and brighten near the pointer. It's not
// decoration — it's meant to read as "connected knowledge", which is what
// MindWriter's article graph actually is. Colors are theme-aware so it
// works in both light and dark mode without a separate implementation.
export function ConstellationCanvas({ isDarkMode }: { isDarkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(isDarkMode);
  isDarkRef.current = isDarkMode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    let nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    let mouse = { x: -9999, y: -9999 };
    let rafId = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      w = canvas!.width = parent.clientWidth;
      h = canvas!.height = parent.clientHeight;
      const count = Math.max(18, Math.floor((w * h) / 15000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.5 + 0.8,
      }));
    }

    function colors() {
      // dark: bioluminescent teal + soft gold. light: ink-violet + amber,
      // kept dark enough to hold contrast on a pale surface.
      return isDarkRef.current
        ? { line: "79,216,196", node: "232,181,99", lineBase: 0.22, lineBoost: 0.35 }
        : { line: "40,34,58", node: "168,110,20", lineBase: 0.14, lineBoost: 0.28 };
    }

    function step() {
      const c = colors();
      ctx!.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const mDist = Math.min(Math.hypot(a.x - mouse.x, a.y - mouse.y), Math.hypot(b.x - mouse.x, b.y - mouse.y));
            const boost = mDist < 160 ? 1 - mDist / 160 : 0;
            ctx!.strokeStyle = `rgba(${c.line},${(1 - dist / 130) * c.lineBase + boost * c.lineBoost})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
      for (const n of nodes) {
        const mDist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const boost = mDist < 160 ? 1 - mDist / 160 : 0;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + boost * 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${c.node},${0.5 + boost * 0.5})`;
        ctx!.fill();
      }
      rafId = requestAnimationFrame(step);
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }

    resize();
    step();
    window.addEventListener("resize", resize);
    canvas.parentElement?.addEventListener("mousemove", onMove);
    canvas.parentElement?.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      canvas.parentElement?.removeEventListener("mousemove", onMove);
      canvas.parentElement?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

import { useEffect, useRef } from "react";

// Sitewide ambient backdrop — richer and more colorful than
// ConstellationCanvas (which is the "connected knowledge" signature used
// specifically in the Hero/reader). This one is pure atmosphere: a
// multi-color starfield + nebula wash behind every section of the site,
// fixed so it doesn't repeat/tile awkwardly as the page scrolls.
//
// Deliberately kept BEHIND all content (z-index handled by the mount
// point in App.tsx) and at moderate opacity — strong enough to read as
// "galaxy", not so strong it fights with article text contrast.
export function GalaxyBackground({ isDarkMode }: { isDarkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(isDarkMode);
  isDarkRef.current = isDarkMode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    let stars: { x: number; y: number; r: number; a: number; s: number; c: string }[] = [];
    let rafId = 0;

    // Real category palette (see src/lib/categoryTheme.ts) — reused here
    // rather than inventing new colors, so the ambient background and the
    // actual category badges/accents feel like one coherent system.
    const tintsDark = ["241,239,247", "124,58,237", "20,184,166", "236,72,153", "212,160,23"];
    const tintsLight = ["36,31,51", "124,58,237", "20,184,166", "236,72,153"];

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = document.body.scrollHeight;
      const tints = isDarkRef.current ? tintsDark : tintsLight;
      const count = Math.floor((w * h) / 10000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random(),
        s: Math.random() * 0.012 + 0.003,
        c: tints[Math.floor(Math.random() * tints.length)],
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const maxOpacity = isDarkRef.current ? 0.9 : 0.55;
      for (const st of stars) {
        st.a += st.s;
        const op = Math.abs(Math.sin(st.a));
        ctx!.beginPath();
        ctx!.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${st.c},${op * maxOpacity})`;
        ctx!.fill();
      }
      rafId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    // Document height can grow as posts load in (infinite scroll / load
    // more) without a window resize firing — recheck periodically rather
    // than wiring into every place content height could change.
    const heightWatcher = setInterval(() => {
      if (Math.abs(document.body.scrollHeight - h) > 200) resize();
    }, 2000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(heightWatcher);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -1 }}
      />
      {/* CSS nebula wash — same 4-color category palette, layered as soft
          radial blobs. mix-blend differs per theme: screen (additive,
          glows) reads right on the near-black dark background; multiply
          (subtractive, tints) reads right on the light background instead
          of just looking washed-out/grey. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none ${isDarkMode ? "opacity-75" : "opacity-50"}`}
        style={{
          zIndex: -1,
          mixBlendMode: isDarkMode ? "screen" : "multiply",
          background: isDarkMode
            ? "radial-gradient(ellipse 950px 650px at 10% 0%, rgba(124,58,237,0.28), transparent 62%), radial-gradient(ellipse 750px 550px at 92% 15%, rgba(20,184,166,0.20), transparent 60%), radial-gradient(ellipse 700px 550px at 45% 95%, rgba(236,72,153,0.16), transparent 60%), radial-gradient(ellipse 600px 500px at 75% 70%, rgba(212,160,23,0.14), transparent 60%)"
            : "radial-gradient(ellipse 950px 650px at 10% 0%, rgba(124,58,237,0.14), transparent 62%), radial-gradient(ellipse 750px 550px at 92% 15%, rgba(20,184,166,0.10), transparent 60%), radial-gradient(ellipse 700px 550px at 45% 95%, rgba(236,72,153,0.08), transparent 60%)",
        }}
      />
    </>
  );
}

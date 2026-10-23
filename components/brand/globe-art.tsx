// Decorative dotted globe with animated export routes out of Taiwan and a red growth arrow.
const dots = (() => {
  const out: string[] = [];
  const cx = 300, cy = 300, r = 228, step = 15;
  for (let y = cy - r; y <= cy + r; y += step) {
    for (let x = cx - r; x <= cx + r; x += step) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) out.push(`M${x} ${y}h0`);
    }
  }
  return out.join("");
})();

const routes = [
  { d: "M400 252 C 330 150, 200 150, 130 250", to: [130, 250] }, // Middle East
  { d: "M400 252 C 330 330, 200 400, 115 380", to: [115, 380] }, // Africa
  { d: "M400 252 C 440 330, 400 380, 350 420", to: [350, 420] }, // SE Asia / Oceania
];

export function GlobeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#E7E9EC" />
        </radialGradient>
        <linearGradient id="arrow-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="rgb(var(--brand-rgb))" stopOpacity="0" />
          <stop offset="0.5" stopColor="rgb(var(--brand-rgb))" />
          <stop offset="1" stopColor="rgb(var(--brand-deep-rgb))" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="300" r="240" fill="url(#glow)" stroke="#C9CDD2" strokeWidth="2" />
      <g stroke="#C9CDD2" strokeWidth="1" opacity="0.7">
        <ellipse cx="300" cy="300" rx="110" ry="240" />
        <ellipse cx="300" cy="300" rx="190" ry="240" />
        <path d="M60 300h480M82 200h436M82 400h436M130 130h340M130 470h340" />
      </g>
      <path d={dots} stroke="#9AA0A8" strokeWidth="3.2" strokeLinecap="round" opacity="0.55" />

      {routes.map((r, i) => (
        <g key={i}>
          <path d={r.d} stroke="rgb(var(--brand-rgb))" strokeWidth="2" strokeDasharray="6 6" className="animate-dash" opacity="0.85" />
          <circle cx={r.to[0]} cy={r.to[1]} r="5" fill="#1F2124" />
        </g>
      ))}

      {/* Taiwan */}
      <circle cx="400" cy="252" r="8" fill="rgb(var(--brand-rgb))" className="origin-center animate-pulse-ring" style={{ transformBox: "fill-box" }} />
      <circle cx="400" cy="252" r="7" fill="rgb(var(--brand-rgb))" stroke="#fff" strokeWidth="2.5" />

      {/* Growth arrow sweeping around the globe */}
      <path d="M120 520 C 280 590, 470 520, 560 330" stroke="url(#arrow-g)" strokeWidth="9" strokeLinecap="round" />
      <path d="M520 352 L566 300 L578 372 Z" fill="rgb(var(--brand-rgb))" />
    </svg>
  );
}

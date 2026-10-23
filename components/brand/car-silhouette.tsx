export function CarSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 200" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="car-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1F2124" />
          <stop offset="0.75" stopColor="#3A3D42" />
          <stop offset="1" stopColor="#7C828A" />
        </linearGradient>
      </defs>
      <path
        d="M14 148c6-18 38-26 88-32 34-4 54-14 86-38 30-22 74-34 128-34 66 0 106 22 146 56 32 4 70 10 100 22 40 16 58 26 62 46v10H14z"
        fill="url(#car-g)"
      />
      <path d="M214 82c28-20 70-30 116-30 48 0 82 18 114 46H200c4-8 8-12 14-16z" fill="#fff" opacity="0.14" />
      <path d="M14 148c70-6 180-14 300-14s230 8 330 14" stroke="rgb(var(--brand-rgb))" strokeWidth="2" opacity="0.8" />
      <circle cx="170" cy="158" r="30" fill="#1F2124" />
      <circle cx="170" cy="158" r="14" fill="#C9CDD2" />
      <circle cx="486" cy="158" r="30" fill="#1F2124" />
      <circle cx="486" cy="158" r="14" fill="#C9CDD2" />
    </svg>
  );
}

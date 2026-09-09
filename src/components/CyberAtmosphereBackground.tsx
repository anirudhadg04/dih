import React from 'react';

export const CyberAtmosphereBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-[var(--atmos-base)]" />
      <div className="absolute inset-0 opacity-35 bg-[linear-gradient(to_right,#38bdf825_1px,transparent_1px),linear-gradient(to_bottom,#38bdf825_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_85%_85%_at_50%_40%,#000_50%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ec489918_1px,transparent_1px),linear-gradient(to_bottom,#ec489918_1px,transparent_1px)] bg-[size:96px_96px]" />
      <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-cyan-500/12 via-blue-600/8 to-transparent blur-[140px]" />
      <div className="absolute top-1/4 -right-40 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-violet-600/10 via-blue-600/8 to-transparent blur-[150px]" />
      <div className="absolute top-2/3 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-500/8 via-sky-600/8 to-transparent blur-[130px]" />
      <div className="absolute -bottom-32 left-1/3 w-[750px] h-[550px] rounded-full bg-gradient-to-t from-violet-600/10 via-cyan-500/8 to-transparent blur-[160px]" />
      <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tech-circuit" width="280" height="280" patternUnits="userSpaceOnUse">
            <path d="M0 60 H100 L140 100 H240 L280 40 M140 0 V50 L170 80 V200 L190 220 H280 M60 190 H150 L190 230 H280 M0 210 H50 L80 240 V280" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 6" />
            <circle cx="100" cy="60" r="3.5" fill="#38bdf8" />
            <circle cx="240" cy="100" r="3.5" fill="#ec4899" />
            <circle cx="170" cy="80" r="3.5" fill="#a855f7" />
            <circle cx="150" cy="190" r="3.5" fill="#34d399" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tech-circuit)" />
      </svg>
      <div className="absolute top-16 left-[6%] text-cyan-400/50 text-[11px] font-mono select-none tracking-widest flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>[SYS_CORE: 0x4B_ONLINE]</span>
      </div>
      <div className="absolute top-[58%] left-[4%] text-purple-400/45 text-[11px] font-mono select-none tracking-widest">[PACKET_STREAM: 256_BIT_AES]</div>
      <div className="absolute top-[82%] right-[6%] text-emerald-400/50 text-[11px] font-mono select-none tracking-widest flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>[PORT: 3000 // HACKATHON_LIVE]</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--atmos-base)]/75 pointer-events-none" />
    </div>
  );
};

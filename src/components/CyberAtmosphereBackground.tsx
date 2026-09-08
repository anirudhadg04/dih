import React, { useEffect, useRef } from 'react';

export const CyberAtmosphereBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Matrix falling code stream
    interface MatrixStream {
      x: number;
      y: number;
      speed: number;
      chars: string[];
      fontSize: number;
      color: string;
      alpha: number;
      updateInterval: number;
      lastUpdate: number;
    }

    // Tech node in circuit grid
    interface TechNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      glowColor: string;
      alpha: number;
      type: 'dot' | 'cross' | 'hex' | 'bracket';
      label?: string;
      pulseVal: number;
      pulseSpeed: number;
    }

    // Data packet traveling along connections
    interface DataPacket {
      fromIndex: number;
      toIndex: number;
      progress: number;
      speed: number;
      color: string;
    }

    const techKeywords = [
      '01', '10', '0x7F', '0x3C', '0xFF', 'SYS_OK', 'ACK', 'SYNC', 
      'PING', '<DEV/>', '{...}', 'PORT:3000', 'IPv6', 'CSE_NET', '256_BIT', 'BIT_STREAM',
      'ASYNC', 'gRPC', 'NODE_OK', 'KERNEL', '0x9A', 'TLS_v1.3'
    ];

    const matrixColors = ['#00f2ff', '#00c3ff', '#38bdf8', '#818cf8', '#a855f7', '#c084fc', '#fbbf24'];
    const streamCount = Math.min(Math.floor(width / 60), 32);
    const matrixStreams: MatrixStream[] = [];

    for (let i = 0; i < streamCount; i++) {
      const streamLen = Math.floor(Math.random() * 10) + 5;
      const chars: string[] = [];
      for (let j = 0; j < streamLen; j++) {
        chars.push(techKeywords[Math.floor(Math.random() * techKeywords.length)]);
      }
      matrixStreams.push({
        x: (i * (width / streamCount)) + (Math.random() * 15),
        y: Math.random() * height,
        speed: Math.random() * 0.9 + 0.45,
        chars,
        fontSize: Math.floor(Math.random() * 3) + 11,
        color: matrixColors[Math.floor(Math.random() * matrixColors.length)],
        alpha: Math.random() * 0.35 + 0.18,
        updateInterval: Math.floor(Math.random() * 25) + 12,
        lastUpdate: 0
      });
    }

    const nodeCount = Math.min(Math.floor((width * height) / 18000), 55);
    const nodes: TechNode[] = [];
    const types: ('dot' | 'cross' | 'hex' | 'bracket')[] = ['dot', 'cross', 'hex', 'bracket'];

    for (let i = 0; i < nodeCount; i++) {
      const color = matrixColors[Math.floor(Math.random() * matrixColors.length)];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        size: Math.random() * 2.5 + 2.5,
        color,
        glowColor: color,
        alpha: Math.random() * 0.6 + 0.35,
        type: types[Math.floor(Math.random() * types.length)],
        label: Math.random() > 0.55 ? techKeywords[Math.floor(Math.random() * techKeywords.length)] : undefined,
        pulseVal: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015
      });
    }

    const dataPackets: DataPacket[] = [];
    const maxPackets = 18;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Render Matrix Tech Code Streams (Falling Data Snippets)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      for (let i = 0; i < matrixStreams.length; i++) {
        const stream = matrixStreams[i];
        stream.y += stream.speed;
        if (stream.y > height + 100) {
          stream.y = -100;
          stream.x = Math.random() * width;
        }

        stream.lastUpdate++;
        if (stream.lastUpdate > stream.updateInterval) {
          stream.chars[Math.floor(Math.random() * stream.chars.length)] = 
            techKeywords[Math.floor(Math.random() * techKeywords.length)];
          stream.lastUpdate = 0;
        }

        ctx.font = `bold ${stream.fontSize}px 'Courier New', monospace`;
        for (let j = 0; j < stream.chars.length; j++) {
          const charY = stream.y + (j * (stream.fontSize + 6));
          if (charY >= 0 && charY <= height) {
            const isHead = j === stream.chars.length - 1;
            ctx.fillStyle = isHead ? '#ffffff' : stream.color;
            ctx.globalAlpha = isHead ? stream.alpha * 1.5 : (j / stream.chars.length) * stream.alpha;
            ctx.fillText(stream.chars[j], stream.x, charY);
          }
        }
      }

      // 2. Update Node Positions with subtle boundary bounce
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.pulseVal += n.pulseSpeed;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Subtle, smooth ambient mouse repulsion (only when mouse is on screen, very calm)
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        if (mx > 0 && my > 0) {
          const dx = mx - n.x;
          const dy = my - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120;
            n.x -= (dx / dist) * force * 0.4;
            n.y -= (dy / dist) * force * 0.4;
          }
        }
      }

      // 3. Render Circuit Traces (Connections between close nodes)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 160;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.38;
            ctx.strokeStyle = n1.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Draw stylized orthogonal or direct circuit track
            if (dist < 80) {
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);
            } else {
              const midX = (n1.x + n2.x) / 2;
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(midX, n1.y);
              ctx.lineTo(midX, n2.y);
              ctx.lineTo(n2.x, n2.y);
            }

            ctx.globalAlpha = lineAlpha;
            ctx.stroke();

            // Spawn data packet along this connection
            if (dataPackets.length < maxPackets && Math.random() < 0.005) {
              dataPackets.push({
                fromIndex: i,
                toIndex: j,
                progress: 0,
                speed: 0.018 + Math.random() * 0.025,
                color: n1.color
              });
            }
          }
        }
      }

      // 4. Render Data Packets (Glowing traveling pulses)
      for (let i = dataPackets.length - 1; i >= 0; i--) {
        const dp = dataPackets[i];
        dp.progress += dp.speed;
        if (dp.progress >= 1) {
          dataPackets.splice(i, 1);
          continue;
        }

        const p1 = nodes[dp.fromIndex];
        const p2 = nodes[dp.toIndex];
        if (!p1 || !p2) {
          dataPackets.splice(i, 1);
          continue;
        }

        const px = p1.x + (p2.x - p1.x) * dp.progress;
        const py = p1.y + (p2.y - p1.y) * dp.progress;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.95;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = dp.color;
        ctx.globalAlpha = 0.55;
        ctx.fill();
      }

      // 5. Render Tech Nodes (Crosshairs, Hexagonals, Telemetry tags)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = 1 + Math.sin(n.pulseVal) * 0.25;
        const currentSize = n.size * pulse;

        ctx.globalAlpha = n.alpha;

        if (n.type === 'cross') {
          // Crosshair node
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(n.x - currentSize * 2, n.y);
          ctx.lineTo(n.x + currentSize * 2, n.y);
          ctx.moveTo(n.x, n.y - currentSize * 2);
          ctx.lineTo(n.x, n.y + currentSize * 2);
          ctx.stroke();
        } else if (n.type === 'hex') {
          // Diamond node
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(n.x - currentSize, n.y - currentSize, currentSize * 2, currentSize * 2);
        } else if (n.type === 'bracket') {
          // Bracket marker
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = n.color;
          ctx.fillText('⟨+⟩', n.x - 8, n.y - 6);
        } else {
          // High-tech circular beacon with concentric ring
          ctx.beginPath();
          ctx.arc(n.x, n.y, currentSize * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = n.glowColor;
          ctx.globalAlpha = 0.25;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(n.x, n.y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.globalAlpha = n.alpha;
          ctx.fill();
        }

        // Draw node telemetry label if assigned
        if (n.label) {
          ctx.font = "9px 'Courier New', monospace";
          ctx.fillStyle = '#cbd5e1';
          ctx.globalAlpha = 0.5;
          ctx.fillText(n.label, n.x + 8, n.y + 4);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Deep Cyber Matrix Dark Base */}
      <div className="absolute inset-0 bg-[var(--atmos-base)]" />

      {/* Cyber Isometric Grid Matrix with Radial Mask */}
      <div 
        className="absolute inset-0 opacity-35 bg-[linear-gradient(to_right,#38bdf825_1px,transparent_1px),linear-gradient(to_bottom,#38bdf825_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_85%_85%_at_50%_40%,#000_50%,transparent_100%)]"
      />

      {/* Secondary Tech Micro-Grid */}
      <div 
        className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ec489918_1px,transparent_1px),linear-gradient(to_bottom,#ec489918_1px,transparent_1px)] bg-[size:96px_96px]"
      />

      {/* Atmospheric Aurora Plasma Clouds with Enhanced Vibrancy */}
      <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-cyan-500/25 via-blue-600/18 to-transparent blur-[140px] animate-aurora-1" />
      <div className="absolute top-1/4 -right-40 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-violet-600/24 via-blue-600/18 to-transparent blur-[150px] animate-aurora-2" />
      <div className="absolute top-2/3 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-500/12 via-sky-600/16 to-transparent blur-[130px] animate-aurora-3" />
      <div className="absolute -bottom-32 left-1/3 w-[750px] h-[550px] rounded-full bg-gradient-to-t from-violet-600/24 via-cyan-500/18 to-transparent blur-[160px] animate-aurora-4" />

      {/* Interactive Tech Matrix & Circuit Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-95" />

      {/* Cyber Circuit Vector Overlays */}
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

      {/* Floating Monospace Tech Telemetry Coordinates and HUD Badges */}
      <div className="absolute top-16 left-[6%] text-cyan-400/50 text-[11px] font-mono select-none tracking-widest flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span>[SYS_CORE: 0x4B_ONLINE]</span>
      </div>
      <div className="absolute top-[58%] left-[4%] text-purple-400/45 text-[11px] font-mono select-none tracking-widest">
        [PACKET_STREAM: 256_BIT_AES]
      </div>
      <div className="absolute top-[82%] right-[6%] text-emerald-400/50 text-[11px] font-mono select-none tracking-widest flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>[PORT: 3000 // HACKATHON_LIVE]</span>
      </div>

      {/* Subtle Bottom Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--atmos-base)]/75 pointer-events-none" />
    </div>
  );
};

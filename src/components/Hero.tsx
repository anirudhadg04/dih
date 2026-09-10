import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Trophy, Users, Building, Flame, ChevronDown, CheckCircle2, Calendar, MapPin, Award, Lightbulb, UserCheck, BrainCircuit, ExternalLink, Cpu, Shield, Activity, Sprout, BarChart3, Radio, Terminal, Code2, Zap, Check } from 'lucide-react';
import { COLLEGE_INFO } from '../data/mockData';
import campusBgImage from '../assets/images/kssem_campus_real_1788194089427.jpg';


interface HeroProps {
  onOpenRegister: () => void;
  onOpenRulebook: () => void;
  liveStats?: {
    registeredCount: number;
    collegesCount: number;
    seatsLeft: number;
    totalSeats: number;
  };
}

export const Hero: React.FC<HeroProps> = ({ liveStats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live CMS State
  const [cms, setCms] = useState({
    eventName: "ANVATION 2026",
    eventSubName: "explore, innovate, transform",
    collegeName: "K. S. SCHOOL OF ENGINEERING AND MANAGEMENT",
    departmentName: "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING",
    eventDates: "8TH - 9TH OCTOBER 2026",
    venueLocation: "KSSEM Campus, Kanakapura Road, Bengaluru",
    totalPrizePool: "₹50,000",
    registrationOpen: true
  });

  const requirementItems = [
    { title: 'TEAM SIZE', text: '2–4 members per team', accent: 'cyan' },
    { title: 'REGISTRATION COST', text: '₹250 per member', accent: 'sky' },
    { title: 'SUBMISSION', text: 'Working prototype + demo + presentation', accent: 'emerald' }
  ];

  // Dynamic Countdown Timer targeted precisely to October 8, 2026 09:30:00 AM IST
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 37,
    hours: 23,
    minutes: 42,
    seconds: 15
  });

  useEffect(() => {
    // Fetch live CMS configuration
    fetch('/api/cms-config')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setCms(data.config);
        }
      })
      .catch(err => console.error(err));

    // Target Date: October 8, 2026 09:30:00 IST
    const targetDate = new Date('2026-10-08T09:30:00+05:30').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    // Canvas Particle Overlay with Cyber Palette
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 700);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 700;
    };
    window.addEventListener('resize', handleResize);

    const particles: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
    const colors = ['#22d3ee', '#38bdf8', '#a7f3d0', '#818cf8', '#67e8f9', '#f43f5e'];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#06b6d4';
            ctx.globalAlpha = (1 - dist / 100) * 0.2;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearInterval(timer);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-between items-center overflow-hidden pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-transparent">
      {/* Background Campus Image Layer with Holographic Blending */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 scale-105 filter contrast-125 saturate-150 pointer-events-none mix-blend-screen"
        style={{ backgroundImage: `url(${campusBgImage})` }}
      />

      {/* Cyber Matrix Luminous Center Aura — rich multi-hue plasma */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[620px] bg-gradient-to-r from-cyan-400/25 via-sky-500/15 to-fuchsia-500/25 rounded-full blur-[170px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/3 right-5 w-[480px] h-[480px] bg-gradient-to-br from-emerald-400/20 via-teal-500/10 to-sky-400/15 rounded-full blur-[150px] pointer-events-none animate-aurora-1" />
      <div className="absolute top-1/2 left-5 w-[480px] h-[480px] bg-gradient-to-bl from-fuchsia-500/20 via-purple-500/10 to-amber-400/15 rounded-full blur-[150px] pointer-events-none animate-aurora-2" />
      {/* Ambient rotating glow beam */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] bg-[conic-gradient(from_0deg,rgba(34,211,238,0),rgba(168,85,247,0.12),rgba(244,114,182,0),rgba(52,211,153,0.1),rgba(34,211,238,0))] rounded-full blur-[90px] pointer-events-none animate-spin-slow" />

      {/* Interactive Particle Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-80" />

      {/* Main Hero Grid Layout */}
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 pt-2">
        
        {/* Top Badge Pill */}
      

        {/* Content & 3D Interactive Hub Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Content Area (Left 7 cols) */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            
            {/* Host Institution Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest text-cyan-300 uppercase px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>{COLLEGE_INFO.trust}</span>
              </div>
            </div>

            {/* Event Title Banner - Lighter, Radiant Holographic Aesthetic */}
            <div className="space-y-4 relative p-6 sm:p-8 lg:h-[450px] rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/85 to-slate-950/90 backdrop-blur-2xl overflow-hidden group transition-all duration-500 card-gradient-border force-dark">
              {/* Corner Cyber Accents */}
              <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-300 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-300 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

              

             

              

              {/* Glowing Lighter Hackathon Title */}
              <div className="relative py-2">
                <h2 className="relative text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none font-['Orbitron',sans-serif]">
                  <span aria-hidden="true" className="absolute inset-0 select-none text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 uppercase blur-[12px] opacity-70">
                    {cms.eventName}
                  </span>
                  <span className="relative text-transparent bg-clip-text bg-[length:200%_auto] animate-gradient-flow bg-gradient-to-r from-cyan-200 via-sky-100 via-fuchsia-200 via-rose-200 to-amber-200 drop-shadow-[0_0_30px_rgba(56,189,248,0.45)] uppercase">
                    {cms.eventName}
                  </span>
                </h2>
              </div>

              <p className="max-w-2xl text-xs sm:text-base text-slate-200 leading-relaxed font-semibold">
                Organized by the <strong>Department of Computer Science and Engineering</strong>, KSSEM, in association with the Departments of Artificial Intelligence and Data Science and Computer Science and Business Studies, in collaboration with PyGenicArc Pvt. Ltd.
              </p>

              {/* Key Badges Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                

              

               
              </div>
            </div>

          </div>

          {/* Right Column: Key Event Highlights & Live Operational Badges (5 cols) */}
          <div className="lg:col-span-5 space-y-4 lg:pt-13">

            {/* Quick Hackathon Key Highlights Card */}
            <div className="p-5 sm:p-6 lg:h-[453px] rounded-3xl bg-gradient-to-b from-slate-950/95 to-slate-950/90 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.2)] space-y-4 card-gradient-border force-dark">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  
                  <span className="font-mono text-[14px] font-black text-white tracking-wider uppercase">EVENT DETAILS</span>
                </div>
      
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-cyan-950/50 border border-cyan-500/25 flex items-center gap-3 hover:border-cyan-400/50 hover:shadow-[0_0_16px_rgba(34,211,238,0.18)] transition-all">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-white">OCT 8–9, 2026</div>
                    <div className="text-[12px] text-cyan-200/80 font-semibold">24-Hour Non-stop</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-emerald-950/50 border border-emerald-500/25 flex items-center gap-3 hover:border-emerald-400/50 hover:shadow-[0_0_16px_rgba(52,211,153,0.18)] transition-all">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-white">₹50,000</div>
                    <div className="text-[12px] text-emerald-200/80 font-semibold">Total Prize Pool</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-sky-950/50 border border-sky-500/25 flex items-center gap-3 hover:border-sky-400/50 hover:shadow-[0_0_16px_rgba(56,189,248,0.18)] transition-all">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-white">KSSEM Bengaluru</div>
                    <div className="text-[12px] text-sky-200/80 font-semibold">Campus Tech Labs</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-amber-950/50 border border-amber-500/25 flex items-center gap-3 hover:border-amber-400/50 hover:shadow-[0_0_16px_rgba(251,191,36,0.18)] transition-all">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-white">Free Food & Stay</div>
                    <div className="text-[12px] text-slate-400 font-semibold">4 Meals Included</div>
                  </div>
                </div>
              </div>

              {/* Event Benefits Checklist */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  PARTICIPANT ADVANTAGES
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Connect With Industry Mentors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Free WiFi & Labs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Verified E-Certificates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Networking & Collaboration</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Countdown and requirements panel aligned below the hero cards without resizing the existing windows */}
        <div className="flex justify-center">
          <div className="grid w-full max-w-[1280px] grid-cols-1 gap-4 justify-center lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="p-4 h-[180px] w-full rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-widest mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-['Orbitron',sans-serif]">HACKATHON LAUNCH COUNTDOWN</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">OCT 8, 2026 • 09:30 AM IST</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="relative overflow-hidden p-2 h-[90px] sm:p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-cyan-950/60 border border-cyan-500/40 shadow-[inset_0_0_18px_rgba(34,211,238,0.14)]">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-300 to-sky-400" />
                  <div className="relative text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-400 ">{String(timeLeft.days).padStart(2, '0')}</div>
                  <div className="text-[10px] text-cyan-300/80 font-bold uppercase tracking-wider mt-0.5">DAYS</div>
                </div>
                <div className="relative overflow-hidden p-2 h-[90px] sm:p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-sky-950/60 border border-sky-500/40 shadow-[inset_0_0_18px_rgba(56,189,248,0.14)]">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-300 to-indigo-400" />
                  <div className="relative text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-sky-200 to-sky-400">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-[10px] text-sky-300/80 font-bold uppercase tracking-wider mt-0.5">HOURS</div>
                </div>
                <div className="relative overflow-hidden p-2 h-[90px] sm:p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-emerald-950/60 border border-emerald-500/40 shadow-[inset_0_0_18px_rgba(52,211,153,0.14)]">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-300 to-teal-400" />
                  <div className="relative text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 to-emerald-400">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider mt-0.5">MINUTES</div>
                </div>
                <div className="relative overflow-hidden p-2 h-[90px] sm:p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-rose-950/60 border border-amber-500/40 shadow-[inset_0_0_18px_rgba(251,191,36,0.14)] animate-pulse">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 to-rose-400" />
                  <div className="relative text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-rose-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider mt-0.5">SECONDS</div>
                </div>
              </div>
            </div>

            <div className="p-4 h-[180px] w-full rounded-2xl bg-gradient-to-b from-slate-950/95 to-slate-950/90 backdrop-blur-xl border border-violet-500/35 shadow-[0_0_24px_rgba(168,85,247,0.18)]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  <span className="font-mono text-[14px] font-black text-white tracking-wider uppercase">REQUIREMENTS</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 h-[calc(100%-52px)]">
                {requirementItems.map((item) => (
                  <div
                    key={item.title}
                    className={`p-2 rounded-xl border bg-gradient-to-br from-slate-900/90 to-${item.accent === 'cyan' ? 'cyan-950/50' : item.accent === 'sky' ? 'sky-950/50' : 'emerald-950/50'} border-${item.accent === 'cyan' ? 'cyan-500/25' : item.accent === 'sky' ? 'sky-500/25' : 'emerald-500/25'} flex flex-col justify-center gap-2`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${item.accent}-500/10 border border-${item.accent}-500/30 text-${item.accent}-400`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-white uppercase tracking-wider leading-tight">{item.title}</div>
                      <div className="mt-1 text-[10px] text-slate-300 leading-snug">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 4 Feature Cards Bar */}
        <div className="p-4 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">EXPLORE</div>
                <div className="text-[11px] text-slate-400">Discover breakthrough technology frontiers</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">INNOVATE</div>
                <div className="text-[11px] text-slate-400">Build high-impact functional solutions in 24 hours</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">TRANSFORM</div>
                <div className="text-[11px] text-slate-400">Turn ideas into scalable, real-world products</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">WIN ₹50,000</div>
                <div className="text-[11px] text-slate-400">Cash awards, trophies & national glory</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
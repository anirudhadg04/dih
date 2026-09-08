import React from 'react';
import { Trophy, Award, Gift, Sparkles, Medal, Briefcase, Zap, Star } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export const PrizesSection: React.FC = () => {
  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  return (
    <section id="prizes" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#040814] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <button
            onClick={triggerConfetti}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-105 btn-tactile cursor-pointer"
            id="prizes-confetti-btn"
          >
            <span className="text-emerald-400 font-mono">06 //</span>
            <span>₹50,000 TOTAL PRIZE POOL & TROPHIES</span>
          </button>
          <h2 className="text-3xl sm:text-6xl font-black text-white tracking-tight font-['Orbitron',sans-serif]">
            Prizes & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300">Accolades</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-medium">
            Rewarding innovation, technical brilliance, and product execution across the 24-hour hackathon.
          </p>
        </motion.div>

        {/* Podium Top 3 - Exactly ₹50,000 (₹25k + ₹15k + ₹10k) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-end max-w-5xl mx-auto">
          {/* Runner Up 2nd Place */}
          <div className="order-2 md:order-1 p-6 rounded-3xl bg-slate-950/80 border border-slate-700 backdrop-blur-md shadow-xl text-center space-y-4 relative transform hover:-translate-y-2 transition-transform">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-200">
              <Medal className="w-8 h-8 text-sky-300" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase text-sky-400 tracking-wider font-mono">1st Runner Up</span>
              <h3 className="text-3xl font-black text-white mt-1 font-['Orbitron',sans-serif]">₹15,000</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">Prize Money+ Trophy + Winner Certificate</p>
          </div>

          {/* Winner 1st Place */}
          <div className="order-1 md:order-2 p-8 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-slate-950 to-slate-950 border-2 border-cyan-400 backdrop-blur-md shadow-[0_0_50px_rgba(6,182,212,0.3)] text-center space-y-4 relative transform hover:-translate-y-3 transition-transform scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-md font-['Orbitron',sans-serif]">
              GRAND CHAMPION
            </div>
            <div className="w-20 h-20 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Trophy className="w-10 h-10 animate-pulse text-yellow-300" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase text-cyan-300 tracking-wider font-mono">OVERALL WINNER</span>
              <h3 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-emerald-300 mt-1 font-['Orbitron',sans-serif]">
                ₹25,000
              </h3>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              Prize Money+ Trophy + Winner Certificate
            </p>
          </div>

          {/* 2nd Runner Up 3rd Place */}
          <div className="order-3 p-6 rounded-3xl bg-slate-950/80 border border-slate-700 backdrop-blur-md shadow-xl text-center space-y-4 relative transform hover:-translate-y-2 transition-transform">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-950/40 border border-amber-700 flex items-center justify-center text-amber-400">
              <Medal className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase text-amber-400 tracking-wider font-mono">2nd Runner Up</span>
              <h3 className="text-3xl font-black text-white mt-1 font-['Orbitron',sans-serif]">₹10,000</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">Prize Money + Winner Certificate</p>
          </div>
        </div>
      </div>
    </section>
  );
};


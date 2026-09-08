import React from 'react';
import { HACKATHON_TRACKS } from '../data/mockData';
import { Brain, ShieldAlert, Activity, Sprout, Coins, BookOpen, Building2, Leaf, Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ThemesSectionProps {
  onOpenRegister?: () => void;
}

export const ThemesSection: React.FC<ThemesSectionProps> = ({ onOpenRegister }) => {
  const getTrackIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-6 h-6 text-cyan-300" />;
      case 'Activity': return <Activity className="w-6 h-6 text-rose-300" />;
      case 'BookOpen': return <BookOpen className="w-6 h-6 text-amber-300" />;
      case 'Sprout': return <Sprout className="w-6 h-6 text-emerald-300" />;
      case 'Coins': return <Coins className="w-6 h-6 text-purple-300" />;
      case 'ShieldAlert': return <ShieldAlert className="w-6 h-6 text-sky-300" />;
      case 'Building2': return <Building2 className="w-6 h-6 text-blue-300" />;
      case 'Leaf': return <Leaf className="w-6 h-6 text-emerald-300" />;
      default: return <Rocket className="w-6 h-6 text-cyan-300" />;
    }
  };

  return (
    <section id="tracks" className="py-24 px-4 sm:px-6 lg:px-8 bg-transparent relative overflow-hidden">
      {/* Background cyber accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-cyan-500/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-14 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>08 INNOVATION DOMAINS</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-['Space_Grotesk',sans-serif]">
            Domains & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">Innovation Tracks</span>
          </h2>
          
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Choose from 8 cutting-edge technology domains to build breakthrough solutions during the 24-hour national hackathon.
          </p>
        </motion.div>

        {/* Tracks Grid - 8 Clean Domains */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HACKATHON_TRACKS.map((track) => (
            <div
              key={track.id}
              className="group relative rounded-3xl bg-slate-950/80 border border-slate-800/90 p-6 backdrop-blur-xl hover:border-cyan-500/60 hover:bg-slate-900/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-10px_rgba(6,182,212,0.3)] flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle top corner gradient accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-cyan-500/25 transition-all" />

              <div className="space-y-4 relative z-10">
                {/* Header: Icon & Track Tag */}
                <div className="flex items-center justify-between gap-3">
                  <div className={`p-3.5 rounded-2xl bg-gradient-to-tr ${track.color} text-white shadow-lg shadow-cyan-950/50 ring-1 ring-white/10 group-hover:scale-105 transition-transform`}>
                    {getTrackIcon(track.iconName)}
                  </div>
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest px-2.5 py-1 bg-slate-950 rounded-full border border-cyan-500/40 font-mono shadow-inner">
                    TRACK #{track.id}
                  </span>
                </div>

                {/* Track Title */}
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug tracking-tight font-['Space_Grotesk',sans-serif]">
                    {track.title}
                  </h3>
                </div>

                {/* Domain Scope Description */}
                <p className="text-xs text-slate-300/90 leading-relaxed">
                  {track.description}
                </p>
              </div>

              {/* Action Button Footer */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-800/80 mt-5 relative z-10">
                {onOpenRegister ? (
                  <button
                    onClick={onOpenRegister}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 group-hover:border-cyan-400 transition-all shadow-sm"
                    id={`track-register-${track.id}-btn`}
                  >
                    <span>Register in this Track</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">Available for 24-Hour Hack</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

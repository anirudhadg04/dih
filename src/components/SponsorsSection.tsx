import React, { useState, useEffect } from 'react';
import { Handshake, Medal, Sparkles, ExternalLink, HeartHandshake } from 'lucide-react';
import { Sponsor } from '../types';

const categoryOrder = ['Title', 'Gold', 'Silver', 'Technology', 'Community', 'Media', 'Hiring'];

const categoryColor: Record<string, string> = {
  Title: 'text-amber-300 border-amber-700 bg-amber-950/70',
  Gold: 'text-yellow-300 border-yellow-700 bg-yellow-950/70',
  Silver: 'text-slate-300 border-slate-600 bg-slate-800/70',
  Technology: 'text-cyan-300 border-cyan-700 bg-cyan-950/70',
  Community: 'text-emerald-300 border-emerald-700 bg-emerald-950/70',
  Media: 'text-pink-300 border-pink-700 bg-pink-950/70',
  Hiring: 'text-purple-300 border-purple-700 bg-purple-950/70',
};

export const SponsorsSection: React.FC = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/sponsors');
        const data = await res.json();
        if (active && data.success && data.sponsors) setSponsors(data.sponsors);
      } catch (err) {
        // fall back to an offline copy if the API is unavailable
      }
    };
    load();
    const timer = setInterval(load, 4000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const sorted = [...sponsors].sort(
    (a, b) => (categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)) ||
      a.name.localeCompare(b.name)
  );

  return (
    <section id="sponsors" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest text-amber-300 uppercase px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30">
            <Handshake className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>Our Sponsors & Partners</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Backed by the <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-pink-400">Best in Tech</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Powering ANVATION 2026 — industry leaders, platforms and institutions enabling breakthrough innovation for 24 hours straight.
          </p>
        </div>

        {/* Sponsors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(sp => (
            <a
              key={sp.id}
              href={sp.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300 overflow-hidden force-dark"
            >
              {/* Corner Cyber Accent */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/50 pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/50 pointer-events-none" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-white text-sm sm:text-base">{sp.name}</div>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${categoryColor[sp.category] || categoryColor.Community}`}>
                    {sp.category} Sponsor
                  </span>
                </div>
                <Medal className="w-5 h-5 text-amber-400 shrink-0" />
              </div>

              {sp.description && (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{sp.description}</p>
              )}

              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200">
                Visit Website <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-10 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
          <HeartHandshake className="w-4 h-4 text-pink-400" />
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Interested in partnering? <span className="text-pink-300 font-bold">Reach out to us — let's build together.</span>
        </div>
      </div>
    </section>
  );
};
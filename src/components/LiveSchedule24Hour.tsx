import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Sparkles, AlertCircle, CheckCircle, Coffee, Code2, Users, Award, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { ScheduleItem } from '../types';

interface LiveSchedule24HourProps {
  schedule: ScheduleItem[];
}

export const LiveSchedule24Hour: React.FC<LiveSchedule24HourProps> = ({ schedule }) => {
  const [activeDay, setActiveDay] = useState<1 | 2>(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [currentHourIndex, setCurrentHourIndex] = useState<number>(3); // Simulated live hour (e.g., 11:30 AM review)

  // Auto tick live simulation index
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHourIndex((prev) => (prev + 1) % 12);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const day1Items = schedule.filter(s => s.day === 1);
  const day2Items = schedule.filter(s => s.day === 2);
  const currentItems = activeDay === 1 ? day1Items : day2Items;

  const filteredItems = currentItems.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getTypeIcon = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'keynote':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'food':
        return <Coffee className="w-4 h-4 text-emerald-400" />;
      case 'review':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'submission':
        return <Award className="w-4 h-4 text-red-400" />;
      default:
        return <Code2 className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getTypeBadgeClass = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'keynote':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'food':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'review':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'submission':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <section id="timeline" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#081220] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            <span className="text-orange-400 font-mono">05 //</span>
            <span>NON-STOP 24-HOUR TIMELINE</span>
          </div>
          <h2 className="text-3xl sm:text-6xl font-black text-white tracking-tight">
            24-Hour <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-400 to-orange-400">Event Schedule</span>
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base font-medium">
            Track every milestone, mentoring session, meal break, evaluation checkpoint, and final pitch at KSSEM Bengaluru.
          </p>
        </motion.div>

        {/* Controls: Day Selector & Category Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
          {/* Day Tabs */}
          <div className="flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveDay(1)}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeDay === 1
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Day 1 (Oct 8) • Kickoff & Night Hacking</span>
            </button>
            <button
              onClick={() => setActiveDay(2)}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeDay === 2
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Day 2 (Oct 9) • Demos & Valedictory</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'keynote', label: 'Keynotes & Talks' },
              { id: 'food', label: 'Meals & Coffee' },
              { id: 'review', label: 'Mentoring & Reviews' },
              { id: 'submission', label: 'Jury & Pitches' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  filterType === f.id
                    ? 'bg-cyan-500 text-white border-cyan-400 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Schedule Cards Grid */}
        <div className="relative border-l-2 border-slate-800 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8">
          {filteredItems.map((item, index) => {
            const isLiveNow = activeDay === 1 && index === currentHourIndex;
            return (
              <div key={item.id} className="relative group">
                {/* Timeline Node Icon */}
                <div className={`absolute -left-[31px] sm:-left-[47px] top-1.5 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform duration-300 group-hover:scale-110 ${
                  isLiveNow
                    ? 'bg-cyan-500 border-cyan-300 text-white shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse'
                    : 'bg-[#081220] border-slate-700 text-slate-400 group-hover:border-cyan-500 group-hover:text-cyan-400'
                }`}>
                  {getTypeIcon(item.type)}
                </div>

                {/* Card Container */}
                <div className={`p-6 rounded-2xl border transition-all duration-300 ${
                  isLiveNow
                    ? 'bg-slate-900/90 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Time Pill */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 font-mono text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.time}</span>
                        </div>

                        {/* Event Category Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getTypeBadgeClass(item.type)}`}>
                          {item.type}
                        </span>

                        {isLiveNow && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                            NOW LIVE
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg sm:text-xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Venue & Location Badge */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <span>{item.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

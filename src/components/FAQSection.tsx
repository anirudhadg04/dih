import React, { useState } from 'react';
import { FAQS } from '../data/mockData';
import { HelpCircle, ChevronDown, Search, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Registration', 'Eligibility', 'Rules', 'Venue & Logistics', 'Submissions'];

  const filteredFaqs = FAQS.filter(faq => {
    const matchesCat = filterCat === 'All' || faq.category === filterCat;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#070b16] relative overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            <span className="text-orange-400 font-mono">09 //</span>
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-3xl sm:text-6xl font-black text-white tracking-tight">
            Got Questions? <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-400 to-orange-400">We've Got Answers</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-medium">
            Everything you need to know about team registration, venue logistics, food, laptops, and evaluation at KSSEM Bengaluru.
          </p>
        </motion.div>

        {/* Filter & Search Bar */}
        <div className="space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-pink-500 focus:outline-none shadow-inner"
              id="faq-search-input"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all btn-tactile ${
                  filterCat === cat
                    ? 'bg-gradient-to-r from-pink-600 via-fuchsia-600 to-orange-500 text-white shadow-lg shadow-pink-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
                id={`faq-cat-${cat}-btn`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl bg-slate-950/80 border transition-all duration-300 overflow-hidden ${
                  isOpen ? 'border-pink-500/50 shadow-[0_0_25px_rgba(236,72,153,0.15)]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-white text-sm sm:text-base hover:text-pink-300 transition-colors"
                  id={`faq-item-${idx}-btn`}
                >
                  <span className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-pink-950/80 border border-pink-500/30 text-pink-400 font-mono text-xs">
                      Q{idx + 1}
                    </span>
                    <span className="font-extrabold">{faq.question}</span>
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-1.5 rounded-lg bg-slate-900 text-pink-400 shrink-0"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80 leading-relaxed bg-slate-900/40 font-medium">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


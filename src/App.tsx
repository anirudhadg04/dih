import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { ThemesSection } from './components/ThemesSection';
import { LiveSchedule24Hour } from './components/LiveSchedule24Hour';
import { PrizesSection } from './components/PrizesSection';
import { SponsorsSection } from './components/SponsorsSection';
import { FAQSection } from './components/FAQSection';
import { ContactSection } from './components/ContactSection';
import { RegistrationModal } from './components/RegistrationModal';
import { RulebookModal } from './components/RulebookModal';
import { ParticipantPortal } from './components/ParticipantPortal';
import { AdminPortal } from './components/AdminPortal';
import { CyberAtmosphereBackground } from './components/CyberAtmosphereBackground';
import { COLLEGE_INFO, HACKATHON_SCHEDULE } from './data/mockData';
import { PortalView } from './types';
import { Heart, Globe, ArrowUp } from 'lucide-react';

export default function App() {
  const getViewFromPath = (path: string): PortalView => {
    const normalizedPath = path.toLowerCase().replace(/\/+$/, '') || '/';
    if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) return 'admin';
    if (normalizedPath === '/participant' || normalizedPath.startsWith('/participant/')) return 'participant';
    return 'landing';
  };

  const [currentView, setCurrentView] = useState<PortalView>(() => getViewFromPath(window.location.pathname));
  const [adminSessionState, setAdminSessionState] = useState<'checking' | 'anonymous' | 'participant' | 'admin'>('checking');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRulebookModalOpen, setIsRulebookModalOpen] = useState(false);
  const [liveStats, setLiveStats] = useState<{ registeredCount: number; collegesCount: number; seatsLeft: number; totalSeats: number } | undefined>(undefined);
  const [homeSections, setHomeSections] = useState<{
    hero: boolean; about: boolean; themes: boolean; schedule: boolean;
    prizes: boolean; sponsors: boolean; faq: boolean; contact: boolean;
  }>({ hero: true, about: true, themes: true, schedule: true, prizes: true, sponsors: true, faq: true, contact: true });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const navigateToView = (view: PortalView) => {
    const path = view === 'admin' ? '/admin' : view === 'participant' ? '/participant' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentView(view);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentView(getViewFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentView !== 'admin') {
      setAdminSessionState('anonymous');
      return;
    }

    let cancelled = false;
    setAdminSessionState('checking');
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.authenticated) setAdminSessionState('anonymous');
        else if (data.user?.type === 'participant') setAdminSessionState('participant');
        else if (data.user?.type === 'admin') setAdminSessionState('admin');
        else setAdminSessionState('anonymous');
      })
      .catch(() => {
        if (!cancelled) setAdminSessionState('anonymous');
      });
    return () => { cancelled = true; };
  }, [currentView]);

  const fetchLiveStats = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (data.success && data.stats) {
        setLiveStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchHomeSections = async () => {
    try {
      const res = await fetch('/api/cms-config');
      const data = await res.json();
      if (data.success && data.config && data.config.homeSections) {
        const s = data.config.homeSections;
        setHomeSections({
          hero: s.hero !== false,
          about: s.about !== false,
          themes: s.themes !== false,
          schedule: s.schedule !== false,
          prizes: s.prizes !== false,
          sponsors: s.sponsors !== false,
          faq: s.faq !== false,
          contact: s.contact !== false
        });
      }
    } catch (err) {
      console.error('Failed to fetch home sections:', err);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    fetchHomeSections();
    const sectionsTimer = setInterval(() => {
      fetchHomeSections();
    }, 4000);

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(currentProgress);
      }
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(sectionsTimer);
    };
  }, []);

  const handleRegistrationSuccess = () => {
    fetchLiveStats();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRegistration = () => {
    navigateToView('participant');
    setIsRegisterModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-app text-app font-sans selection:bg-pink-500 selection:text-white relative">
      {/* Global Dynamic Cyber Atmosphere & Particle Aurora Background */}
      <CyberAtmosphereBackground />

      

      {/* Top Reading Scroll Progress Indicator Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-500 z-50 transition-all duration-150 shadow-[0_0_12px_rgba(236,72,153,0.8)]"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Top Institutional Header — removed per request */}
      {/* Primary Sticky Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={navigateToView}
        onOpenRegister={openRegistration}
        onOpenRulebook={() => setIsRulebookModalOpen(true)}
      />

      {/* VIEW RENDERER */}
      {currentView === 'landing' && (
        <main className="space-y-0 relative z-10">
          {homeSections.hero && (
            <>
              <Hero
                onOpenRegister={openRegistration}
                onOpenRulebook={() => setIsRulebookModalOpen(true)}
                liveStats={liveStats}
              />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.themes && (
            <>
              <ThemesSection onOpenRegister={openRegistration} />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.about && (
            <>
              <AboutSection />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.schedule && (
            <>
              <LiveSchedule24Hour schedule={HACKATHON_SCHEDULE} />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.prizes && (
            <>
              <PrizesSection />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.sponsors && (
            <>
              <SponsorsSection />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.faq && (
            <>
              <FAQSection />
              <div className="cyber-section-divider" />
            </>
          )}
          {homeSections.contact && <ContactSection />}
        </main>
      )}

      {currentView === 'participant' && (
        <div className="relative z-10">
          <ParticipantPortal onOpenRulebook={() => setIsRulebookModalOpen(true)} />
        </div>
      )}

      {currentView === 'admin' && (
        <div className="relative z-10">
          {adminSessionState === 'checking' ? (
            <div className="min-h-[80vh] flex items-center justify-center text-cyan-300 font-mono text-sm">Checking admin session...</div>
          ) : (
            <AdminPortal />
          )}
        </div>
      )}

      {/* Global Modals */}
      <RegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />

      <RulebookModal
        isOpen={isRulebookModalOpen}
        onClose={() => setIsRulebookModalOpen(false)}
      />

      {/* Floating CTA & Scroll-To-Top Control Group */}
      {currentView === 'landing' && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
          {/* Scroll To Top Button */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="p-3 rounded-full bg-slate-900/90 text-pink-400 hover:text-white hover:bg-pink-600 border border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.3)] btn-tactile backdrop-blur-md"
              title="Back to top"
              id="scroll-to-top-btn"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}

        </div>
      )}

      {/* Footer */}
      <footer className="bg-[var(--surface-nav-solid)] border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-black text-white text-base tracking-wide animate-gradient-flow text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-300 to-orange-400">
                KSSEM Anvation 1.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-pink-950/80 text-pink-300 border border-pink-500/40 shadow-sm">
                National Level 24-Hr Hackathon
              </span>
            </div>
            <p className="max-w-md text-slate-300 text-xs font-medium">
              {COLLEGE_INFO.name}, Kanakapura Road, Bengaluru.
            </p>
            <p className="text-[11px] text-pink-400/90 flex items-center justify-center md:justify-start gap-1 font-mono">
              <Globe className="w-3.5 h-3.5 text-orange-400" />
              <span>ಕನ್ನಡ ನೆಲದ ಹೆಮ್ಮೆಯ ತಂತ್ರಜ್ಞಾನ ಸಂಭ್ರಮ • Bengaluru Tech Innovation Hub</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
            <button onClick={() => { navigateToView('landing'); scrollToTop(); }} className="hover:text-pink-300 transition-colors">Home</button>
            <button onClick={() => setIsRulebookModalOpen(true)} className="hover:text-orange-300 transition-colors">Rulebook PDF</button>
            <button onClick={() => navigateToView('participant')} className="hover:text-fuchsia-300 transition-colors">Participant Portal</button>
          </div>

          <div className="text-[11px] text-slate-500 space-y-1">
            <p>© 2026 KSSEM CSE Department. All rights reserved.</p>
            <p className="flex items-center justify-center md:justify-end gap-1">
              Crafted with <Heart className="w-3 h-3 text-pink-500 fill-pink-500" /> for Indian Hackers
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

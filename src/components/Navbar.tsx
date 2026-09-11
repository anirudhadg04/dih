import React, { useState, useEffect } from 'react';
import anvationNavbarLogo from '../assets/branding/anvation-navbar-logo.png';
import { PortalView } from '../types';
import { useTheme } from '../theme';
import { User, FileText, Menu, X, Rocket, Sparkles, Clock } from 'lucide-react';

interface NavbarProps {
  currentView: PortalView;
  setCurrentView: (view: PortalView) => void;
  onOpenRegister: () => void;
  onOpenRulebook: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenRegister,
  onOpenRulebook,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 45 });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(timer);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (currentView !== 'landing') {
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: 'About', id: 'about' },
    { label: 'Domains', id: 'tracks' },
    { label: 'Prizes', id: 'prizes' },
    { label: 'Schedule', id: 'timeline' },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-[var(--surface-nav-solid)] backdrop-blur-md border-b border-pink-500/20 shadow-[0_4px_25px_rgba(219,39,119,0.2)]' 
        : 'bg-[var(--surface-nav)] backdrop-blur-sm border-b border-slate-800'
    }`}>
      <div className="relative max-w-[1440px] w-full mx-auto px-2 sm:px-4 lg:px-5 h-16 flex items-center justify-between gap-5">
        {/* Centered Anvation brand logo */}
        <button 
          onClick={() => setCurrentView('landing')}
          className="inline-flex shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-lg p-0 transition-transform active:scale-95"
          id="nav-brand-logo-btn"
          aria-label="Go to Anvation event home"
        >
          <img
            src={anvationNavbarLogo}
            alt="Anvation — Explore, Innovate, Transform"
            className={`block h-[68px] w-auto max-w-[300px] sm:max-w-[390px] lg:h-[76px] object-contain object-left drop-shadow-[0_0_18px_rgba(34,211,238,0.45)] ${isLight ? '' : 'mix-blend-screen'}`}
          />
        </button>

        {/* Right Portal Switcher & Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenRulebook}
            className="flex items-center gap-1.5 text-orange-300 hover:text-orange-200 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/30 transition-all hover:bg-orange-500/20"
            id="nav-rulebook-btn"
          >
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            <span>Rulebook</span>
          </button>

          <button
            onClick={() => setCurrentView('participant')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              currentView === 'participant'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            id="nav-view-participant-btn"
          >
            <User className="w-3.5 h-3.5" />
            <span>Participant Login</span>
          </button>

          {/* Primary Register CTA */}
          <button
            onClick={onOpenRegister}
            className="relative group overflow-hidden px-5 py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-pink-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(219,39,119,0.5)] hover:shadow-[0_0_30px_rgba(249,115,22,0.8)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-pink-400/40"
            id="nav-register-cta-btn"
          >
            <span className="relative z-10 flex items-center gap-2 uppercase tracking-wide">
              <Rocket className="w-4 h-4 animate-bounce text-orange-200" />
              <span>Register Now</span>
            </span>
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenRegister}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white font-bold text-xs shadow-md"
            id="mobile-register-btn"
          >
            Register
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 rounded-lg focus:outline-none"
            id="mobile-menu-toggle-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Shared Navigation Sub-bar */}
      <nav className="hidden lg:flex items-center justify-center gap-8 min-h-12 px-4 border-t border-slate-800/80 text-sm font-medium text-slate-300">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className="hover:text-pink-400 transition-colors py-2"
            id={`nav-${item.id}-btn`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--surface-drawer)] border-b border-cyan-500/30 px-4 py-6 space-y-4 animate-fadeIn">
          <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-700 text-center text-xs font-semibold">
            <button
              onClick={() => { setCurrentView('participant'); setMobileMenuOpen(false); }}
              className={`w-full py-2 rounded-lg ${currentView === 'participant' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              id="mobile-portal-participant-btn"
            >
              Participant Login
            </button>
          </div>

          <div className="flex flex-col gap-3 font-medium text-slate-200 pt-2 border-t border-slate-800">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-left py-2 hover:text-pink-400"
              >
                {item.label}
              </button>
            ))}
            <button onClick={onOpenRulebook} className="text-left py-2 text-orange-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Rulebook
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

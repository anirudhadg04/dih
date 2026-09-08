import React, { useState, useEffect } from 'react';
import anvationNavbarLogo from '../assets/branding/anvation-navbar-logo.png';
import { PortalView } from '../types';
import { useTheme } from '../theme';
import { User, ShieldCheck, FileText, Menu, X, Rocket, Sparkles, Clock, Globe, Sun, Moon } from 'lucide-react';

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
  const { theme, toggleTheme } = useTheme();
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

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-[var(--surface-nav-solid)] backdrop-blur-md border-b border-pink-500/20 shadow-[0_4px_25px_rgba(219,39,119,0.2)]' 
        : 'bg-[var(--surface-nav)] backdrop-blur-sm border-b border-slate-800'
    }`}>
      <div className="max-w-[1440px] w-full mx-auto px-2 sm:px-4 lg:px-5 h-20 flex items-center justify-between gap-5">
        {/* Anvation brand logo — positioned at the far-left of the primary nav */}
        <button 
          onClick={() => setCurrentView('landing')}
          className="text-left shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-lg -ml-1.5 p-0 transition-transform active:scale-95"
          id="nav-brand-logo-btn"
          aria-label="Go to Anvation event home"
        >
          <img
            src={anvationNavbarLogo}
            alt="Anvation — Explore, Innovate, Transform"
            className={`h-[68px] w-[300px] sm:w-[390px] lg:h-[76px] object-contain object-left drop-shadow-[0_0_18px_rgba(34,211,238,0.45)] ${isLight ? '' : 'mix-blend-screen'}`}
          />
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button 
            onClick={() => scrollToSection('about')} 
            className="hover:text-pink-400 transition-colors py-1"
            id="nav-about-btn"
          >
            About Anvation
          </button>

          <button 
            onClick={() => scrollToSection('tracks')} 
            className="hover:text-pink-400 transition-colors py-1"
            id="nav-tracks-btn"
          >
            8 Domains
          </button>

          <button 
            onClick={() => scrollToSection('prizes')} 
            className="hover:text-pink-400 transition-colors py-1"
            id="nav-prizes-btn"
          >
            Prizes
          </button>

          <button 
            onClick={() => scrollToSection('timeline')} 
            className="hover:text-pink-400 transition-colors py-1"
            id="nav-schedule-btn"
          >
            Schedule
          </button>

          <button 
            onClick={onOpenRulebook} 
            className="flex items-center gap-1.5 text-orange-300 hover:text-orange-200 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/30 transition-all hover:bg-orange-500/20"
            id="nav-rulebook-btn"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            <span>Rulebook</span>
          </button>
        </nav>

        {/* Right Portal Switcher & Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            id="theme-toggle-btn"
            className="relative w-10 h-10 rounded-xl border border-slate-700/70 bg-slate-900/70 flex items-center justify-center overflow-hidden transition-all hover:border-cyan-400/60 hover:shadow-[0_0_16px_rgba(34,211,238,0.35)] btn-tactile"
          >
            <Sun className={`w-[18px] h-[18px] text-amber-400 transition-all duration-300 ${isLight ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
            <Moon className={`w-[18px] h-[18px] text-cyan-400 absolute transition-all duration-300 ${isLight ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
          </button>

          {/* Portal Switcher Buttons */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1 text-xs">
            <button
              onClick={() => setCurrentView('landing')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'landing'
                  ? 'bg-gradient-to-r from-pink-600 via-fuchsia-600 to-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              id="nav-view-public-btn"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Event Home</span>
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
              <span>Participant Portal</span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              id="nav-view-admin-btn"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </div>

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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--surface-drawer)] border-b border-cyan-500/30 px-4 py-6 space-y-4 animate-fadeIn">
          {/* Portal Switcher Mobile */}
          <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-700 grid grid-cols-3 gap-1 text-center text-xs font-semibold">
            <button
              onClick={() => { setCurrentView('landing'); setMobileMenuOpen(false); }}
              className={`py-2 rounded-lg ${currentView === 'landing' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              id="mobile-portal-public-btn"
            >
              Event Home
            </button>
            <button
              onClick={() => { setCurrentView('participant'); setMobileMenuOpen(false); }}
              className={`py-2 rounded-lg ${currentView === 'participant' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              id="mobile-portal-participant-btn"
            >
              Participant
            </button>
            <button
              onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
              className={`py-2 rounded-lg ${currentView === 'admin' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
              id="mobile-portal-admin-btn"
            >
              Admin
            </button>
          </div>

          {/* Mobile Theme Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Theme</span>
            <button
              onClick={toggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors ${
                isLight
                  ? 'bg-white text-slate-800 border-slate-300'
                  : 'bg-slate-800 text-white border-slate-600'
              }`}
            >
              {isLight ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
              {isLight ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div className="flex flex-col gap-3 font-medium text-slate-200 pt-2 border-t border-slate-800">
            <button onClick={() => scrollToSection('about')} className="text-left py-2 hover:text-pink-400">About Anvation</button>
            <button onClick={() => scrollToSection('tracks')} className="text-left py-2 hover:text-pink-400">8 Domains</button>
            <button onClick={() => scrollToSection('prizes')} className="text-left py-2 hover:text-pink-400">Prize Pool</button>
            <button onClick={() => scrollToSection('timeline')} className="text-left py-2 hover:text-pink-400">Schedule</button>
            <button onClick={onOpenRulebook} className="text-left py-2 text-orange-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Download Rulebook
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

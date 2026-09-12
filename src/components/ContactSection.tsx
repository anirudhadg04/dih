import React, { useState } from 'react';
import { COLLEGE_INFO } from '../data/mockData';
import { Mail, Phone, MapPin, Send, CheckCircle2, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: formData.name,
          subject: formData.subject,
          message: `${formData.message} (From: ${formData.email})`,
          category: 'General'
        })
      });
      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0b192c] relative">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            <span>Organizing Team</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Contact <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">Coordinators</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300">
            Have questions regarding registration, travel guidelines, or sponsorships? Reach out to our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Contact Details & Coordinators */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-400" />
                <span>Venue Address</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {COLLEGE_INFO.name}<br />
                {COLLEGE_INFO.department}<br />
                {COLLEGE_INFO.address}
              </p>
              <div className="pt-2 flex flex-col gap-2 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span>{COLLEGE_INFO.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>{COLLEGE_INFO.email}</span>
                </div>
              </div>
            </div>

            {/* Faculty & Student Coordinators Grid */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider font-mono">Faculty Coordinators</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-1 shadow-lg">
                    <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider block">Lead Faculty</span>
                    <h5 className="font-bold text-white text-xs leading-snug">Dr. Sivasubramanyam Medasani</h5>
                    <p className="text-[11px] text-slate-400">Dept. of CSE, KSSEM</p>
                    <a href="tel:+918309763125" className="text-xs text-cyan-300 font-mono pt-1 hover:underline flex items-center gap-1 font-bold">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>+91 8309763125</span>
                    </a>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider block">Faculty Coordinator</span>
                    <h5 className="font-bold text-white text-xs leading-snug">Mr. Harshavardhan J R</h5>
                    <p className="text-[11px] text-slate-400">Dept. of CSE, KSSEM</p>
                    <a href="tel:+919448612519" className="text-xs text-slate-300 font-mono pt-1 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>+91 94486 12519</span>
                    </a>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider block">Faculty Coordinator</span>
                    <h5 className="font-bold text-white text-xs leading-snug">Ms. Vidyasre. N</h5>
                    <p className="text-[11px] text-slate-400">Dept. of CSE, KSSEM</p>
                    <a href="tel:+917975940301" className="text-xs text-slate-300 font-mono pt-1 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>+91 7975940301</span>
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider font-mono">Student Coordinators</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-1 shadow-lg">
                    <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider block">Student Coordinator</span>
                    <h5 className="font-bold text-white text-sm">Bhaskar S</h5>
                    <p className="text-xs text-slate-400">Dept. of CSE, KSSEM Bengaluru</p>
                    <a href="tel:+919663949447" className="text-xs text-amber-300 font-mono pt-1 hover:underline flex items-center gap-1 font-bold">
                      <Phone className="w-3 h-3 text-amber-400" />
                      <span>+91 9663949447</span>
                    </a>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-1 shadow-lg">
                    <span className="text-[10px] font-bold uppercase text-pink-400 tracking-wider block">Student Coordinator</span>
                    <h5 className="font-bold text-white text-sm">Karanam Vennela</h5>
                    <p className="text-xs text-slate-400">Dept. of CSE, KSSEM Bengaluru</p>
                    <a href="tel:+919019302077" className="text-xs text-pink-300 font-mono pt-1 hover:underline flex items-center gap-1 font-bold">
                      <Phone className="w-3 h-3 text-pink-400" />
                      <span>+91 9019302077</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-700 h-52 relative shadow-lg">
              <iframe
                title="KSSEM Campus Location Map"
                src="https://maps.google.com/maps?width=588&amp;height=377&amp;hl=en&amp;q=k s school of engineering and management&amp;t=&amp;z=16&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
                className="w-full h-full border-0 filter grayscale opacity-90 contrast-125 hover:grayscale-0 transition-all duration-500"
                allowFullScreen={false}
                loading="lazy"
              ></iframe>
            </div>
          </div>

          {/* Quick Support Ticket Form */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-xl font-bold text-white">Send Quick Inquiry</h3>
            <p className="text-xs text-slate-400">Submit a query directly to the KSSEM Hackathon desk.</p>

            {formSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Thank you! Your inquiry has been submitted to the organizing committee.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Your Name / Team:</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="contact-name-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Email Address:</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="contact-email-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Subject:</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="contact-subject-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Message:</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="contact-message-input"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center gap-2"
                  id="contact-submit-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

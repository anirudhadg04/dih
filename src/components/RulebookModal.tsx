import React from 'react';
import { printDocument } from '../utils/pdfGenerator';
import { FileText, Printer, ShieldAlert, CheckCircle2, Award, Download, AlertTriangle } from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrintPDF = () => {
    const rulebookHtml = `
      <h2>1. ELIGIBILITY & TEAM COMPOSITION</h2>
      <p>• Open to all undergraduate (B.E./B.Tech/BCA/B.Sc) and postgraduate (M.Tech/MCA/M.Sc) students across India.</p>
      <p>• Team size MUST be strictly 2 to 4 members.</p>
      <p>• Inter-departmental and inter-college teams are permitted.</p>

      <h2>2. CODE OF CONDUCT & ENVIRONMENT</h2>
      <p>• 24-Hour continuous hackathon at KSSEM Campus, Bengaluru.</p>
      <p>• Participants must wear their official college ID badge and Anvation wristband at all times.</p>
      <p>• High-speed Wi-Fi, food, and designated overnight resting zones are provided.</p>

      <h2>3. AI USAGE POLICY & PLAGIARISM</h2>
      <p>• Generative AI tools (Google Gemini, ChatGPT, GitHub Copilot) ARE PERMITTED for code scaffolding and research.</p>
      <p>• Entire pre-built software projects submitted without 24-hour commit progression will be DISQUALIFIED immediately.</p>
      <p>• All final code must be pushed to a public GitHub repository.</p>

      <h2>4. JUDGING & SCORE BREAKDOWN (TOTAL 105 PTS)</h2>
      <table>
        <tr><th>Criteria</th><th>Max Score</th><th>Description</th></tr>
        <tr><td>Innovation & Originality</td><td>15 Pts</td><td>Novelty of idea and solution approach</td></tr>
        <tr><td>Impact & Practical Utility</td><td>15 Pts</td><td>Real-world problem solving for societal/business impact</td></tr>
        <tr><td>Technical Complexity</td><td>20 Pts</td><td>Depth of code, APIs, database & algorithm design</td></tr>
        <tr><td>Presentation & Pitch</td><td>15 Pts</td><td>Clarity of 3-min demo & jury Q&A</td></tr>
        <tr><td>UI / UX Design</td><td>15 Pts</td><td>Accessibility, visual polish & responsiveness</td></tr>
        <tr><td>Scalability & Architecture</td><td>10 Pts</td><td>Modularity and production readiness</td></tr>
        <tr><td>Originality</td><td>10 Pts</td><td>Authenticity of implementation</td></tr>
        <tr><td>Bonus Points</td><td>5 Pts</td><td>Edge device or Kannada localization integration</td></tr>
      </table>

      <h2>5. DISQUALIFICATION & DISPUTES</h2>
      <p>• Any misconduct, property damage, or plagiarism will lead to immediate disqualification and reporting to host institution.</p>
      <p>• Decision of the Jury Panel and Organizing Committee at KSSEM is final and binding.</p>
    `;

    printDocument('Official_Rulebook_KSSEM_CodeAThon_2026', rulebookHtml);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b192c] border border-amber-500/40 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Anvation 2026 Official Rulebook</h3>
              <p className="text-xs text-amber-300 font-semibold">KS School of Engineering & Management, Bengaluru</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              1. Team Eligibility & Size
            </h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Open to all full-time undergraduate and postgraduate engineering & computer science students in India. Teams must consist of 2 to 4 members. Inter-college cross-teams are allowed.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              2. Generative AI & Plagiarism Policy
            </h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Participants are allowed to use Gemini, Copilot, or ChatGPT for boilerplate code, debugging, and API setup. However, submitting pre-existing full projects created before the 24-hour start window is strictly prohibited. Automated git commit logs will be audited during final evaluation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              3. Evaluation Matrix (Total 105 Points)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-cyan-400 block">15 Pts</span> Innovation</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-cyan-400 block">15 Pts</span> Impact</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-amber-400 block">20 Pts</span> Tech Depth</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-cyan-400 block">15 Pts</span> Presentation</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-cyan-400 block">15 Pts</span> UI / UX</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-cyan-400 block">10 Pts</span> Scalability</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-cyan-400 block">10 Pts</span> Originality</div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-200"><span className="font-bold text-emerald-400 block">5 Pts</span> Bonus</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-1">
            <span className="font-bold flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-4 h-4" /> Disqualification Warning:
            </span>
            <p>Smoking, alcohol, vandalism, or any disrespectful conduct towards mentors/volunteers will result in immediate disqualification and notification to the respective institute's principal.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handlePrintPDF}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold text-xs flex items-center justify-center gap-2 shadow"
            id="rulebook-pdf-download-btn"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save Printable Rulebook PDF</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            id="rulebook-close-btn"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
};

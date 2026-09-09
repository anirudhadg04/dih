import React, { useState, useEffect, useRef } from 'react';
import { SEED_TEAMS, HACKATHON_TRACKS } from '../data/mockData';
import { Team, ProjectSubmission, Announcement, SupportTicket, MilestoneReport, Participant, Checkpoint } from '../types';
import { generateCertificate } from '../utils/certificate';
import { printDocument } from '../utils/pdfGenerator';
import { drawQRCode, gateQrDataUrl } from '../utils/qr';
import { 
  User, Users, FileText, Upload, CheckCircle2, AlertCircle, 
  Clock, Sparkles, LogOut, Check, Shield, 
  CheckSquare, Bell, Download, Cpu, MapPin, Radio, Lock, Eye, EyeOff, Key, Terminal, ExternalLink, MessageSquare, Mail, Edit3, Save, Plus, Trash2, X
} from 'lucide-react';

interface ParticipantPortalProps {
  onOpenRulebook: () => void;
}

// Rendered inside a participant tab while the matching event-flow module is
// disabled by the admin. Once the admin enables it, the real module appears.
const ComingSoonPanel: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-amber-500/30 text-center space-y-4">
    <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-amber-500/40 flex items-center justify-center shadow-inner">
      <Clock className="w-8 h-8 text-amber-300" />
    </div>
    <h3 className="text-xl font-black text-white">Coming Soon</h3>
    <p className="text-sm text-slate-300 max-w-md mx-auto">{subtitle}</p>
    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-950/40 text-amber-300 border border-amber-600/50">
      {title}
    </span>
    <p className="text-[11px] text-slate-500">
      The organizing committee will unlock this module when the event goes live.
    </p>
  </div>
);

export const ParticipantPortal: React.FC<ParticipantPortalProps> = ({ onOpenRulebook }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginTeamId, setLoginTeamId] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'submit' | 'announcements' | 'certificate' | 'support'>('overview');

  const [allTeams, setAllTeams] = useState<Team[]>(SEED_TEAMS);
  const [authenticatedTeamId, setAuthenticatedTeamId] = useState<string>('AN-001');
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [milestoneReports, setMilestoneReports] = useState<MilestoneReport[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    { id: 'cp-1', number: 1, title: 'Ideation & System Design', description: 'Architecture, DB schema, UI wireframes, and API selection.', time: '02:00 PM (Day 1)', status: 'Open' },
    { id: 'cp-2', number: 2, title: 'Core Prototype & API Integration', description: 'Working code MVP, API endpoints, backend logic.', time: '10:00 PM (Day 1)', status: 'Open' },
    { id: 'cp-3', number: 3, title: 'Final Pitch Deck & Live Demo', description: 'Completed Github repo, video recording, and slides.', time: '07:00 AM (Day 2)', status: 'Open' }
  ]);

  // Certificate download gating (admin-controlled via /api/certificate-issue)
  const [certificatesEnabled, setCertificatesEnabled] = useState(false);

  // Final Project Submission gating (admin-controlled via /api/submission-status).
  // When disabled, the "Final Project Submission" tab is hidden entirely.
  const [submissionsEnabled, setSubmissionsEnabled] = useState(false);

  // Event-flow feature flags coming from the Admin "Event Flow" control panel.
  // While a module is disabled the participant portal shows a "Coming Soon" state.
  const [featureFlags, setFeatureFlags] = useState<{
    milestones: boolean;
    announcements: boolean;
    support: boolean;
  }>({ milestones: false, announcements: false, support: false });

  // Milestone Progress Report Form State
  const [checkpointNumber, setCheckpointNumber] = useState<number>(1);
  const [reportSummary, setReportSummary] = useState('');
  const [reportRepo, setReportRepo] = useState('https://github.com/anvation/team-repo');
  const [reportBlockers, setReportBlockers] = useState('None');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Project Submission Form State — starts empty so participants enter their own
  // project details (no pre-filled example text in any box).
  const [subForm, setSubForm] = useState({
    projectTitle: '',
    problemStatement: '',
    technologyStack: '',
    architectureOverview: '',
    githubLink: '',
    demoVideoUrl: '',
    pptUrl: '',
    pdfDocUrl: '',
    futureScope: ''
  });
  const [subSuccess, setSubSuccess] = useState(false);

  // Support Ticket State
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'Tech' as any, message: '' });
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Super Admin Emergency Broadcast Alert
  const [broadcastAlert, setBroadcastAlert] = useState({ active: false, message: '', type: 'info' });

  // Registration Slip Edit State
  const [isEditSlipOpen, setIsEditSlipOpen] = useState(false);
  const [editingSlipData, setEditingSlipData] = useState<Team | null>(null);
  const [slipSuccessToast, setSlipSuccessToast] = useState<string | null>(null);
  const [savingSlip, setSavingSlip] = useState(false);

  // Persistent Gate Entry Pass QR — shown on the dashboard so participants can
  // always re-open their scannable gate pass after closing the registration modal.
  const gateQrRef = useRef<HTMLCanvasElement | null>(null);
  const [gateQrReady, setGateQrReady] = useState(false);

  const currentTeam = allTeams.find(t => t.id === authenticatedTeamId) || allTeams[0] || SEED_TEAMS[0];
  const recoveryIdentifier = loginTeamId.trim().toLowerCase();
  const recoveryTeam = recoveryIdentifier
    ? allTeams.find((team) => [team.id, team.regNumber, team.teamName, team.leaderEmail]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === recoveryIdentifier))
    : undefined;
  const leaderRecoveryEmail = recoveryTeam?.leaderEmail;
  const recoveryMailto = leaderRecoveryEmail
    ? `mailto:${leaderRecoveryEmail}?subject=${encodeURIComponent(`ANVATION 2026 portal password reset - ${recoveryTeam.id}`)}&body=${encodeURIComponent(`Hello ${recoveryTeam.teamName} team leader,\n\nPlease contact the event administrator to reset the Participant Portal password for team ${recoveryTeam.id} (${recoveryTeam.regNumber}).\n\nDo not send the current password by email.`)}`
    : undefined;

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Draw the persistent Gate Entry Pass QR once its canvas exists and a team is
  // authenticated, so the gate pass is always visible after login. Redraws when
  // the authenticated team changes (e.g. after editing the slip).
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!currentTeam || !gateQrRef.current) return;
    setGateQrReady(false);
    drawQRCode(gateQrRef.current, currentTeam.id, 220).then(() => setGateQrReady(true));
  }, [isLoggedIn, authenticatedTeamId, currentTeam?.id]);

  const fetchData = async () => {
    try {
      const [tRes, sRes, aRes, tkRes, mRes, bcRes, certRes, cpRes, subRes, featRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/submissions'),
        fetch('/api/announcements'),
        fetch('/api/tickets'),
        fetch('/api/milestone-reports'),
        fetch('/api/broadcast-alert'),
        fetch('/api/certificate-status'),
        fetch('/api/checkpoints'),
        fetch('/api/submission-status'),
        fetch('/api/feature-status')
      ]);

      const tData = await tRes.json();
      const sData = await sRes.json();
      const aData = await aRes.json();
      const tkData = await tkRes.json();
      const mData = await mRes.json();
      const bcData = await bcRes.json();
      const certData = await certRes.json();
      const cpData = await cpRes.json();
      const subData = await subRes.json();
      const featData = await featRes.json();

      if (tData.teams) setAllTeams(tData.teams);
      if (sData.submissions) setSubmissions(sData.submissions);
      if (aData.announcements) setAnnouncements(aData.announcements);
      if (tkData.tickets) setTickets(tkData.tickets);
      if (mData.reports) setMilestoneReports(mData.reports);
      if (bcData.alert) setBroadcastAlert(bcData.alert);
      if (typeof certData.enabled === 'boolean') setCertificatesEnabled(certData.enabled);
      if (cpData.checkpoints) setCheckpoints(cpData.checkpoints);
      if (typeof subData.enabled === 'boolean') setSubmissionsEnabled(subData.enabled);
      if (typeof featData.milestones === 'boolean' || typeof featData.announcements === 'boolean' || typeof featData.support === 'boolean') {
        setFeatureFlags({
          milestones: !!featData.milestones,
          announcements: !!featData.announcements,
          support: !!featData.support
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeCp = checkpoints.find(c => c.number === Number(checkpointNumber));
      const res = await fetch('/api/milestone-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeam.id,
          checkpointNumber,
          checkpointName: activeCp?.title || `Checkpoint ${checkpointNumber}`,
          summary: reportSummary,
          repoBranchOrLink: reportRepo,
          blockers: reportBlockers
        })
      });

      const data = await res.json();
      if (data.success) {
        setReportSuccess(true);
        fetchData();
        setReportSummary('');
        setTimeout(() => setReportSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/submit-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeam.id,
          track: currentTeam.preferredTrack,
          ...subForm
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubSuccess(true);
        fetchData();
        setTimeout(() => setSubSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeam.id,
          teamName: currentTeam.teamName,
          ...newTicket
        })
      });

      const data = await res.json();
      if (data.success) {
        setTicketSuccess(true);
        fetchData();
        setNewTicket({ subject: '', category: 'Tech', message: '' });
        setTimeout(() => setTicketSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCertificate = () => {
    if (!certificatesEnabled) {
      alert("Certificates have not been released yet. The organizing committee will enable downloads once evaluation concludes.");
      return;
    }
    generateCertificate({
      participantName: currentTeam.members[0]?.fullName || 'Participant',
      teamName: currentTeam.teamName,
      trackName: currentTeam.preferredTrack,
      awardType: 'Participation Certificate',
      regId: currentTeam.id
    });
  };

  const handleStartEditSlip = () => {
    if (!currentTeam) return;
    setEditingSlipData(JSON.parse(JSON.stringify(currentTeam)));
    setIsEditSlipOpen(true);
  };

  const handleSaveParticipantTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlipData) return;
    setSavingSlip(true);

    try {
      const res = await fetch(`/api/teams/${editingSlipData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSlipData)
      });

      const data = await res.json();
      if (data.success) {
        setSlipSuccessToast('✓ Registration slip & team details updated successfully!');
        setIsEditSlipOpen(false);
        setEditingSlipData(null);
        fetchData();
        setTimeout(() => setSlipSuccessToast(null), 4000);
      } else {
        alert(data.error || 'Failed to update team details');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating team details');
    } finally {
      setSavingSlip(false);
    }
  };

  const handlePrintSlip = async () => {
    if (!currentTeam) return;
    const gateQrDataUrlStr = await gateQrDataUrl(currentTeam.id, 220).catch(() => '');
    const slipHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0b192c; font-family: sans-serif;">ANVATION 2026 PARTICIPANT REGISTRATION SLIP</h2>
        <div style="background: #0284c7; color: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-family: monospace; margin-right: 8px;">
          AUTO-ASSIGNED TEAM ID: ${currentTeam.id}
        </div>
        <div style="background: #7e22ce; color: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-family: monospace;">
          ACCESS PASSWORD: Stored securely; use the password from your registration confirmation.
        </div>
      </div>

      <table>
        <tr><th>Registration No</th><td>${currentTeam.regNumber}</td></tr>
        <tr><th>Auto-Assigned Team ID</th><td><strong style="color: #0284c7; font-family: monospace;">${currentTeam.id}</strong></td></tr>
        <tr><th>Portal Access Password</th><td><strong style="color: #7e22ce; font-family: monospace;">Stored securely; use the password from your registration confirmation.</strong></td></tr>
        <tr><th>Team Name</th><td><strong>${currentTeam.teamName}</strong></td></tr>
        <tr><th>Preferred Track</th><td>${currentTeam.preferredTrack}</td></tr>
        <tr><th>Payment Status</th><td>${currentTeam.paymentStatus || 'Verified'} (UTR: ${currentTeam.paymentUtr || 'PhonePe Verified'})</td></tr>
        <tr><th>Member 1 (Leader)</th><td>${currentTeam.members[0]?.fullName} (${currentTeam.members[0]?.email})</td></tr>
        ${currentTeam.members.slice(1).map((m: any, idx: number) => `
          <tr><th>Member ${idx + 2}</th><td>${m.fullName} (${m.usn || 'USN Provided'})</td></tr>
        `).join('')}
        <tr><th>College</th><td>${currentTeam.members[0]?.college}</td></tr>
        <tr><th>Registration Status</th><td>${currentTeam.status}</td></tr>
      </table>

      <div style="margin-top: 15px; padding: 12px; border: 1px dashed #7e22ce; border-radius: 8px; background: #faf5ff; font-size: 12px; color: #581c87;">
        <strong>🔐 Dashboard Login Credentials:</strong> Use your <strong>Auto-Assigned Team ID (${currentTeam.id})</strong> and the password from your registration confirmation, or Leader Email, to login to the Participant Portal.
      </div>

      <div class="qr-box" style="margin-top: 25px; text-align: center;">
        <h3 style="color: #0e7490; font-family: sans-serif; margin-bottom: 8px;">GATE ENTRY PASS QR</h3>
        ${gateQrDataUrlStr ? `<img src="${gateQrDataUrlStr}" alt="Gate Entry QR Pass" style="width: 220px; height: 220px; image-rendering: pixelated; border: 8px solid #ffffff; outline: 1px solid #cbd5e1;" />` : '<p>QR unavailable — show Team ID at the gate.</p>'}
        <p style="font-size: 12px; color: #475569;">Present this QR pass and college ID at the KSSEM Gate Check-in desk on Oct 8, 2026.</p>
      </div>
    `;

    printDocument(`CodeAThon_Registration_Slip_${currentTeam.id}`, slipHtml);
  };

  // Directly downloads the Gate Entry Pass (QR + Team ID) as a PNG image file —
  // no print dialog so it can be saved easily on a phone.
  const handleDownloadGatePass = async () => {
    if (!currentTeam) return;
    const qr = await gateQrDataUrl(currentTeam.id, 320).catch(() => '');
    if (!qr) {
      alert('Could not generate the Gate Pass image. Show your Team ID at the gate (' + currentTeam.id + ').');
      return;
    }
    const image = new Image();
    image.src = qr;
    image.onload = () => {
      const link = document.createElement('a');
      link.download = `ANVATION_2026_GatePass_${currentTeam.id}.png`;
      link.href = qr;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  // Authenticate through the server's /api/participant-login endpoint so login is
  // always validated against the authoritative, live team store (and returns a
  // clear "not found" vs "wrong passphrase" message) instead of matching against a
  // possibly stale client-side copy of /api/teams.
  const handleParticipantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginTeamId.trim();
    const inputPass = loginPass.trim();

    if (!identifier) {
      setLoginError('Please enter your Team ID or Email.');
      return;
    }

    try {
      const res = await fetch('/api/participant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: inputPass })
      });
      const data = await res.json();

      if (data.success && data.team) {
        setAuthenticatedTeamId(data.team.id);
        setLoginPass('');
        setLoginError('');
        setIsLoggedIn(true);
        // Refresh the live store so the dashboard reflects the latest team state.
        await fetchData();
      } else {
        setLoginError(data.error || 'Invalid Team ID, Registration No, or Member Email. Please enter the credentials from your confirmation slip.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Authentication service unreachable. Please try again.');
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setLoginError('');
  };

  // 1. SECURE LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <section className="py-16 px-4 flex items-center justify-center min-h-[80vh] bg-[#070b16] relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl backdrop-blur-xl relative z-10">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>256-BIT AUTHENTICATED TEAM PORTAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Orbitron',sans-serif]">
              ANVATION 2026
            </h2>
            <p className="text-xs text-cyan-300 font-mono">
              explore • innovate • transform | 8–9 Oct 2026
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleParticipantLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Team Access ID / Leader Email:</span>
                <span className="text-[10px] text-cyan-400 font-mono">e.g. AN-001</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginTeamId}
                  onChange={(e) => setLoginTeamId(e.target.value)}
                  placeholder="Enter Team ID or Leader Email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-400 transition-colors"
                  id="participant-login-id-input"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Passphrase:</span>
                <span className="text-[10px] text-slate-400">Default: team123</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Enter your team passphrase"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-400 transition-colors"
                  id="participant-login-pass-input"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              id="participant-login-submit-btn"
            >
              <Lock className="w-4 h-4" /> Authenticate & Access Station
            </button>
          </form>

          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-700/50 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <MessageSquare className="w-4 h-4" /> Forgot your team password?
            </div>
            <p className="text-[11px] text-slate-400">
              Enter your Team ID or registration number above, then email the team leader to request an admin reset.
            </p>
            {recoveryMailto ? (
              <a
                href={recoveryMailto}
                className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 font-bold"
                id="participant-forgot-password-link"
              >
                <Mail className="w-3.5 h-3.5" /> Email team leader ({leaderRecoveryEmail})
              </a>
            ) : (
              <span className="text-[11px] text-slate-500">A team leader email link will appear after you enter a valid Team ID.</span>
            )}
          </div>

        </div>
      </section>
    );
  }

  // 2. AUTHENTICATED PARTICIPANT DASHBOARD
  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-app min-h-screen space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{currentTeam.teamName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {currentTeam.id}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Authenticated
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Domain Track: <span className="text-amber-300 font-semibold">{currentTeam.preferredTrack}</span> • Leader: <span className="text-cyan-300 font-mono">{currentTeam.leaderEmail}</span>
              </p>
            </div>
          </div>

          {/* Secure Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:bg-red-950/80 hover:border-red-600 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all self-stretch md:self-auto justify-center"
            id="participant-signout-btn"
          >
            <LogOut className="w-4 h-4 text-red-400" /> Lock & Sign Out
          </button>
        </div>

        {/* Live Broadcast Alert Banner */}
        {broadcastAlert.active && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-pulse shadow-xl ${
            broadcastAlert.type === 'emergency' ? 'bg-red-950/90 border-red-500/80 text-red-200' :
            broadcastAlert.type === 'warning' ? 'bg-amber-950/90 border-amber-500/80 text-amber-200' :
            'bg-cyan-950/90 border-cyan-500/80 text-cyan-200'
          }`}>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <span className="uppercase font-black text-[10px] tracking-widest block text-red-400">
                  SUPER ADMIN LIVE BROADCAST ALERT
                </span>
                <p className="text-xs text-white mt-0.5">{broadcastAlert.message}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-900 text-white border border-red-400">
              URGENT
            </span>
          </div>
        )}

        {/* Portal Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            id="part-tab-overview-btn"
          >
            <Users className="w-3.5 h-3.5" /> Team Roster & Workstation
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'milestones' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            id="part-tab-milestones-btn"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-300" /> 24H Milestones (CP 1, 2, 3)
          </button>

          <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'submit' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
              id="part-tab-submit-btn"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" /> Final Project Submission
            </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'announcements' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            id="part-tab-announcements-btn"
          >
            <Bell className="w-3.5 h-3.5 text-yellow-400" /> Live Feed ({announcements.length})
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'certificate' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            id="part-tab-certificate-btn"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" /> Certificate
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'support' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            id="part-tab-support-btn"
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Support Desk
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Members List */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" /> Team Members ({currentTeam?.members?.length ?? 0})
                </h3>
                <span className="text-xs text-cyan-300 font-mono">Reg # {currentTeam?.regNumber || 'ANV-2026'}</span>
              </div>

              <div className="space-y-3">
                {(currentTeam?.members || []).map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{m.fullName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.role === 'Leader' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'}`}>
                          {m.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.college} • {m.department}</p>
                      <p className="text-xs text-slate-400 font-mono">USN: {m.usn} • Email: {m.email}</p>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Active Participant ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Venue Info Sidebar */}
            <div className="space-y-4">
              {/* Registration Slip & Team Configuration Card */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" /> Registration Slip & Pass
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {currentTeam.id}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center"><span className="text-slate-400">Auto Team ID:</span> <span className="text-cyan-400 font-mono font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">{currentTeam.id}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Access Password:</span> <span className="text-emerald-300 font-mono font-bold">Stored securely</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Team:</span> <span className="text-white font-bold">{currentTeam.teamName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Leader Email:</span> <span className="text-slate-300 font-mono">{currentTeam.leaderEmail}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Track:</span> <span className="text-purple-300 font-bold">{currentTeam.preferredTrack}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Payment UTR:</span> <span className="text-emerald-400 font-mono">{currentTeam.paymentUtr || 'PhonePe Verified'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Check-in Status:</span> <span className="text-amber-300">{currentTeam.status}</span></div>
                </div>

                {slipSuccessToast && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold animate-fadeIn text-center">
                    {slipSuccessToast}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handlePrintSlip}
                    className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    id="participant-print-slip-btn"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Registration Slip
                  </button>
                </div>
              </div>

              {/* Gate Entry Pass QR Card */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" /> Gate Entry Pass
                  </h4>
                  <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    {currentTeam.id}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-100">
                  Show this QR at the KSSEM entrance gate alongside your college ID. The gate scanner will verify your team instantly.
                </div>
                <div className="flex justify-center">
                  <canvas
                    ref={gateQrRef}
                    className="mx-auto rounded-xl border border-amber-500/50 bg-white shadow-lg p-1"
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  {gateQrReady ? '✓ Scannable — Ready for Gate Check-in' : 'Generating secure gate pass QR...'}
                </p>
                <button
                  type="button"
                  onClick={handleDownloadGatePass}
                  disabled={!gateQrReady}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                  id="participant-download-gatepass-btn"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Gate Pass</span>
                </button>
              </div>

              {/* Lab Station Info */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-400" /> Assigned Lab Station
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Lab:</span> <span className="text-white font-bold">CSE Lab 304</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Workstation Row:</span> <span className="text-cyan-300 font-mono font-bold">Bay C, Seat #12–15</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Power Extensions:</span> <span className="text-emerald-400 font-bold">4 Ports Allocated ✓</span></div>
                </div>
                <button
                  onClick={onOpenRulebook}
                  className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
                  id="part-action-rulebook-btn"
                >
                  <FileText className="w-4 h-4 text-amber-400" /> Download Hackathon Rulebook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MILESTONES */}
        {activeTab === 'milestones' && (
          featureFlags.milestones ? (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-cyan-400" /> Milestone Checkpoint Reports (CP 1, CP 2, CP 3)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Jury evaluations occur across 3 checkpoints during the 24-hour hackathon. Submit your progress updates for live evaluation.
                  </p>
                </div>
              </div>

              {/* Checkpoint Timeline Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {checkpoints.map((cp) => {
                  const existingReport = milestoneReports.find(r => r.teamId === currentTeam.id && r.checkpointNumber === cp.number);
                  return (
                    <div key={cp.id} className={`p-4 rounded-2xl border transition-all ${existingReport ? 'bg-slate-950 border-cyan-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800">
                          CHECKPOINT {String(cp.number).padStart(2, '0')}
                        </span>
                        {existingReport ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            existingReport.status === 'Approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {existingReport.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold">{cp.status === 'Closed' ? 'Closed' : 'Not Submitted'}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white">{cp.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">{cp.description}</p>
                      <p className="text-[10px] text-amber-300 font-mono mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Target: {cp.time}
                      </p>
                      {existingReport?.feedback && (
                        <div className="mt-2 p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200">
                          <strong className="text-purple-300">Jury Note:</strong> {existingReport.feedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Milestone Progress Report Form */}
              <form onSubmit={handleMilestoneSubmit} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" /> Transmit Milestone Update to Jury Panel
                </h4>

                {reportSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Checkpoint report successfully submitted to Jury Panel!
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Select Checkpoint:</label>
                    <select
                      value={checkpointNumber}
                      onChange={(e) => setCheckpointNumber(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                    >
                      {checkpoints.map(cp => (
                        <option key={cp.id} value={cp.number}>Checkpoint {cp.number}: {cp.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">GitHub Branch / Code URL:</label>
                    <input
                      type="url"
                      value={reportRepo}
                      onChange={(e) => setReportRepo(e.target.value)}
                      placeholder="https://github.com/org/repo"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Milestone Summary & Accomplishments:</label>
                  <textarea
                    rows={3}
                    value={reportSummary}
                    onChange={(e) => setReportSummary(e.target.value)}
                    placeholder="Briefly describe completed components, API routes implemented, and frontend views created..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Current Technical Blockers / Needs Assistance?</label>
                  <input
                    type="text"
                    value={reportBlockers}
                    onChange={(e) => setReportBlockers(e.target.value)}
                    placeholder="e.g. None"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" /> Transmit Report to Jury
                </button>
              </form>
            </div>
          </div>
          ) : (
          <ComingSoonPanel
            title="24H Milestone Checkpoint Reports"
            subtitle="Milestone progress reports are not open yet. The jury panel will activate this during the event."
          />
          )
        )}

        {/* TAB 3: FINAL PROJECT SUBMISSION */}
        {activeTab === 'submit' && (
          submissionsEnabled ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="w-6 h-6 text-purple-400" /> Final Project Submission Module
              </h3>
              <p className="text-xs text-slate-400 mt-1">Submit your GitHub link, tech stack, slide deck, and video demo before the 24-hour code freeze.</p>
            </div>

            {subSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Project submitted successfully! The Anvation Jury Panel can now evaluate your project.</span>
              </div>
            )}

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Project Title:</label>
                <input
                  type="text"
                  required
                  value={subForm.projectTitle}
                  onChange={(e) => setSubForm({ ...subForm, projectTitle: e.target.value })}
                  placeholder="e.g. KannadaVision AI"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-400 focus:outline-none"
                  id="sub-title-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Problem Statement Addressed:</label>
                <textarea
                  rows={2}
                  required
                  value={subForm.problemStatement}
                  onChange={(e) => setSubForm({ ...subForm, problemStatement: e.target.value })}
                  placeholder="Describe the issue solved..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  id="sub-problem-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">GitHub Public Repository Link:</label>
                  <input
                    type="url"
                    required
                    value={subForm.githubLink}
                    onChange={(e) => setSubForm({ ...subForm, githubLink: e.target.value })}
                    placeholder="https://github.com/username/repo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    id="sub-github-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Demo Video Link (YouTube/Loom):</label>
                  <input
                    type="url"
                    value={subForm.demoVideoUrl}
                    onChange={(e) => setSubForm({ ...subForm, demoVideoUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    id="sub-video-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Technology Stack (Comma separated):</label>
                <input
                  type="text"
                  required
                  value={subForm.technologyStack}
                  onChange={(e) => setSubForm({ ...subForm, technologyStack: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  id="sub-stack-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Architecture & Data Flow Overview:</label>
                <textarea
                  rows={3}
                  value={subForm.architectureOverview}
                  onChange={(e) => setSubForm({ ...subForm, architectureOverview: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  id="sub-arch-input"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:from-cyan-400 hover:to-indigo-500 flex items-center justify-center gap-2"
                id="sub-form-submit-btn"
              >
                <Upload className="w-4 h-4" />
                <span>Submit 24H Hackathon Project</span>
              </button>
            </form>
          </div>
          ) : (
          <ComingSoonPanel
            title="Final Project Submission"
            subtitle="The final project submission portal is not open yet. It will go live when the code freeze begins."
          />
          )
        )}

        {/* TAB 5: BROADCAST FEED */}
        {activeTab === 'announcements' && (
          featureFlags.announcements ? (
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" /> Live Organizing Committee Announcements
              </h3>
              <p className="text-xs text-slate-400">
                Real-time updates regarding event schedule, checkpoint reviews, and submission deadlines.
              </p>
            </div>

            <div className="space-y-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-5 rounded-2xl border space-y-2 transition-all ${
                    ann.urgent ? 'bg-amber-950/40 border-amber-500/50' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{ann.title}</h4>
                  <p className="text-xs text-slate-300">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
          ) : (
          <ComingSoonPanel
            title="Live Announcements"
            subtitle="The live update feed is not active yet. Organizer announcements will appear here once the event begins."
          />
          )
        )}

        {/* TAB 7: CERTIFICATE */}
        {activeTab === 'certificate' && (
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-cyan-500/30 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <FileText className="w-8 h-8" />
            </div>

            {certificatesEnabled ? (
              <>
                <div>
                  <h3 className="text-2xl font-black text-white">Generate Official Certificate</h3>
                  <p className="text-xs text-slate-300 mt-1">Download your verified high-resolution KSSEM Anvation 2026 Certificate.</p>
                </div>

                <button
                  onClick={handleDownloadCertificate}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
                  id="part-generate-cert-btn"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Official Certificate</span>
                </button>
              </>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
                  <Lock className="w-4 h-4" /> Certificates Not Yet Released
                </div>
                <p className="text-xs text-slate-400">
                  Certificates will be issued by the organizing committee once judging and evaluation conclude. Please check back later.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SUPPORT DESK */}
        {activeTab === 'support' && (
          featureFlags.support ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ticket Form */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">Raise Lab / Logistics Support Ticket</h3>

              {ticketSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-semibold">
                  Ticket raised! A CSE lab coordinator will visit your station shortly.
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category:</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="ticket-cat-select"
                  >
                    <option value="Tech">Hardware / Power Extension Cords</option>
                    <option value="Network">WiFi / Network Access</option>
                    <option value="Mentorship">Mentor / Technical Guidance</option>
                    <option value="Other">Other Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Subject:</label>
                  <input
                    type="text"
                    required
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="e.g. Need extra power strip for Lab 304"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="ticket-subject-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Message:</label>
                  <textarea
                    rows={3}
                    required
                    value={newTicket.message}
                    onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                    placeholder="Explain issue..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    id="ticket-message-input"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
                  id="ticket-submit-btn"
                >
                  Submit Ticket
                </button>
              </form>
            </div>

            {/* Existing Tickets List */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">Your Support Tickets</h3>
              <div className="space-y-3">
                {tickets.filter(t => t.teamId === currentTeam.id).map((tk) => (
                  <div key={tk.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{tk.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tk.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-300'}`}>
                        {tk.status}
                      </span>
                    </div>
                    <p className="text-slate-400">{tk.message}</p>
                    {tk.response && (
                      <div className="p-2 rounded-lg bg-slate-900 text-cyan-300 border border-cyan-800/40 mt-2">
                        <strong>Organizer Response:</strong> {tk.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          ) : (
          <ComingSoonPanel
            title="Support / Help Desk"
            subtitle="The support desk is not open yet. You'll be able to raise lab, WiFi and mentorship tickets once it goes live."
          />
          )
        )}
      </div>

      {/* PARTICIPANT EDIT REGISTRATION MODAL */}
      {isEditSlipOpen && editingSlipData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0b192c] border border-cyan-500/50 w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Registration Control • {editingSlipData.id}
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" /> Edit Team & Registration Slip
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditSlipOpen(false);
                  setEditingSlipData(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParticipantTeam} className="space-y-5">
              {/* Core Details */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider font-mono">
                  1. Team Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Team Name:</label>
                    <input
                      type="text"
                      required
                      value={editingSlipData.teamName}
                      onChange={(e) => setEditingSlipData({ ...editingSlipData, teamName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Payment UTR Ref:</label>
                    <input
                      type="text"
                      value={editingSlipData.paymentUtr || ''}
                      onChange={(e) => setEditingSlipData({ ...editingSlipData, paymentUtr: e.target.value })}
                      placeholder="e.g. UPI-938217349182"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Track Domain:</label>
                    <select
                      value={editingSlipData.preferredTrack}
                      onChange={(e) => setEditingSlipData({ ...editingSlipData, preferredTrack: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500 outline-none"
                    >
                      {HACKATHON_TRACKS.map(t => (
                        <option key={t.id} value={t.title}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Members Roster */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider font-mono">
                    2. Members Information ({editingSlipData.members.length} Members)
                  </h4>
                  {editingSlipData.members.length < 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newMem: Participant = {
                          id: `p-${Date.now()}-${editingSlipData.members.length + 1}`,
                          fullName: `Member ${editingSlipData.members.length + 1}`,
                          college: editingSlipData.members[0]?.college || 'KSSEM',
                          department: 'CSE',
                          semester: '6th Semester',
                          email: '',
                          phone: '',
                          usn: '',
                          gender: 'Male',
                          role: 'Member',
                          teamId: editingSlipData.id,
                          accommodationRequired: false,
                          emergencyContact: '',
                          checkedIn: false
                        };
                        setEditingSlipData({
                          ...editingSlipData,
                          members: [...editingSlipData.members, newMem]
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {editingSlipData.members.map((mem: any, idx: number) => (
                    <div key={mem.id || idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                          idx === 0 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {idx === 0 ? 'Team Leader' : `Member #${idx + 1}`}
                        </span>

                        {idx > 0 && editingSlipData.members.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingSlipData.members.filter((_: any, i: number) => i !== idx);
                              setEditingSlipData({ ...editingSlipData, members: updated });
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Full Name:</label>
                          <input
                            type="text"
                            required
                            value={mem.fullName}
                            onChange={(e) => {
                              const updated = [...editingSlipData.members];
                              updated[idx] = { ...updated[idx], fullName: e.target.value };
                              setEditingSlipData({ ...editingSlipData, members: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">USN / Roll No:</label>
                          <input
                            type="text"
                            required
                            value={mem.usn}
                            onChange={(e) => {
                              const updated = [...editingSlipData.members];
                              updated[idx] = { ...updated[idx], usn: e.target.value };
                              setEditingSlipData({ ...editingSlipData, members: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Email:</label>
                          <input
                            type="email"
                            required
                            value={mem.email}
                            onChange={(e) => {
                              const updated = [...editingSlipData.members];
                              updated[idx] = { ...updated[idx], email: e.target.value };
                              setEditingSlipData({ ...editingSlipData, members: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditSlipOpen(false);
                    setEditingSlipData(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlip}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <Save className="w-4 h-4" /> {savingSlip ? 'Updating...' : 'Save & Update Registration Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

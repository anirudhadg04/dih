import React, { useState, useEffect } from 'react';
import { SEED_TEAMS, SEED_SUBMISSIONS, SEED_ANNOUNCEMENTS } from '../data/mockData';
import { 
  Team, ProjectSubmission, JudgeScorecard, Announcement, SupportTicket, 
  MilestoneReport, WebsiteCMSConfig, Participant, AuditLog, AdminUser, 
  RulebookVersion, EmailCampaign, JudgingRound, Mentor, Judge, Sponsor, ScheduleItem, Checkpoint 
} from '../types';
import { 
  ShieldCheck, Users, Award, Bell, Ticket, Download, Search, 
  CheckCircle2, AlertTriangle, Plus, Send, RefreshCw, Lock, Key, 
  LogOut, Check, Clock, Globe, Settings, Edit3, Save, CheckSquare, 
  FileText, Mail, DollarSign, BarChart2, ShieldAlert, Cpu, Eye, EyeOff, Trash2, 
  UserPlus, Filter, X, Zap, Layers, Calendar, ChevronRight, HelpCircle, 
  AlertCircle, Database, Activity, Building, Briefcase, UserCheck, Server, 
  Sliders, FileCode, Share2, Compass, Printer, PieChart, TrendingUp, Maximize2,
  QrCode, UserMinus, Handshake
} from 'lucide-react';
import { CheckInScanner } from './CheckInScanner';

// Reusable ON/OFF toggle badge used across the Event Flow control panel.
const ToggleBadge: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
      on
        ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80'
        : 'bg-red-950/60 border-red-700/60 text-red-300 hover:bg-red-900/80'
    }`}
  >
    <span className={`w-8 h-4 rounded-full relative ${
      on ? 'bg-emerald-500/80' : 'bg-red-500/60'
    }`}>
      <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-all ${
        on ? 'translate-x-4' : ''
      }`} />
    </span>
    {on ? 'Enabled (Live)' : 'Disabled (Coming Soon)'}
  </button>
);

// Reusable row used by the Home Page Sections control panel.
const HomeSectionToggle: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}> = ({ icon, label, desc, on, onToggle }) => (
  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-sm font-black text-white">{label}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
    <button
      onClick={onToggle}
      className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
        on
          ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80'
          : 'bg-red-950/60 border-red-700/60 text-red-300 hover:bg-red-900/80'
      }`}
    >
      <span className={`w-8 h-4 rounded-full relative ${
        on ? 'bg-emerald-500/80' : 'bg-red-500/60'
      }`}>
        <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-all ${
          on ? 'translate-x-4' : ''
        }`} />
      </span>
      {on ? 'Visible' : 'Hidden'}
    </button>
  </div>
);

export const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('superadmin@kssem.edu.in');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [authError, setAuthError] = useState('');

  // Active Tab View
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'scanner'
    | 'participants'
    | 'teams'
    | 'registration-settings'
    | 'cms'
    | 'rulebook'
    | 'event-flow'
    | 'home-sections'
    | 'sponsors'
    | 'submissions'
    | 'checkpoints'
    | 'judging'
    | 'schedule'
    | 'certificates'
    | 'announcements'
    | 'communication'
    | 'finance'
    | 'roles'
    | 'security'
    | 'audit'
    | 'settings'
    | 'emergency'
  >('overview');

  // Data Stores
  const [teams, setTeams] = useState<Team[]>(SEED_TEAMS);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>(SEED_SUBMISSIONS);
  const [scorecards, setScorecards] = useState<JudgeScorecard[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(SEED_ANNOUNCEMENTS);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [milestoneReports, setMilestoneReports] = useState<MilestoneReport[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [rulebooks, setRulebooks] = useState<RulebookVersion[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [judgingRounds, setJudgingRounds] = useState<JudgingRound[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [policies, setPolicies] = useState<Array<{ id: string; title: string; category: string; text: string }>>([]);

  // Schedule Form
  const [schTime, setSchTime] = useState('');
  const [schTitle, setSchTitle] = useState('');
  const [schDesc, setSchDesc] = useState('');
  const [schType, setSchType] = useState<ScheduleItem['type']>('general');
  const [schDay, setSchDay] = useState<1 | 2>(1);
  const [schLoc, setSchLoc] = useState('');

  // Policy Form
  const [polTitle, setPolTitle] = useState('');
  const [polCat, setPolCat] = useState('Rules');
  const [polText, setPolText] = useState('');

  // Rulebook Form
  const [rbVersion, setRbVersion] = useState('');
  const [rbTitle, setRbTitle] = useState('');
  const [rbNotes, setRbNotes] = useState('');

  // CMS & Global Settings
  const [cmsConfig, setCmsConfig] = useState<WebsiteCMSConfig>({
    eventName: "KS HACKNOVE 2026",
    eventSubName: "NATIONAL LEVEL 24-HOUR ANVATION",
    collegeName: "K. S. SCHOOL OF ENGINEERING AND MANAGEMENT",
    departmentName: "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING",
    eventDates: "AUGUST 29–30, 2026",
    venueLocation: "KSSEM Campus, Kanakapura Road, Bengaluru",
    totalPrizePool: "₹2,00,000+",
    firstPrize: "₹75,000",
    secondPrize: "₹45,000",
    thirdPrize: "₹25,000",
    contactEmail: "hackathon.cse@kssem.edu.in",
    contactPhone: "+91 98450 12345 / +91 99001 88776",
    registrationOpen: true,
    enableMilestoneSubmissions: false, // Admin-controlled via Event Flow panel
    enableMentorBookings: true,
    enableCertificateDownloads: false, // Admin-controlled; released via Certificate Center
    enableProjectSubmissions: false, // Admin-controlled; disable hides Final Project Submission on participant portal
    enableSupportTickets: false, // Admin-controlled via Event Flow panel
    enableAnnouncements: false, // Admin-controlled via Event Flow panel
    homeSections: { // Admin-controlled; which sections appear on the public home page
      hero: true,
      about: true,
      themes: true,
      schedule: true,
      prizes: true,
      sponsors: true,
      faq: true,
      contact: true
    },
    maxTeamSize: 4,
    minTeamSize: 2,
    gateScanSecretKey: "KSSEM-GATE-2026-KEY"
  });

  // UI State Controls
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSort, setParticipantSort] = useState<'name' | 'college' | 'role' | 'team'>('name');
  const [teamSearch, setTeamSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('All');
  const [teamSort, setTeamSort] = useState<'newest' | 'oldest' | 'name' | 'members' | 'status'>('newest');
  
  // Modals State
  const [selectedParticipantModal, setSelectedParticipantModal] = useState<Participant | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [scoreOverrideModal, setScoreOverrideModal] = useState<{ open: boolean; submissionId: string; currentScore: number; reason: string }>({
    open: false,
    submissionId: '',
    currentScore: 0,
    reason: ''
  });
  const [emergencyModal, setEmergencyModal] = useState<{ open: boolean; type: string; state: boolean; reason: string }>({
    open: false,
    type: 'maintenance',
    state: true,
    reason: ''
  });
  const [quickActionModal, setQuickActionModal] = useState<string | null>(null);
  const [passwordReset, setPasswordReset] = useState<{
    teamId: string;
    teamName: string;
    status: 'confirm' | 'loading' | 'success' | 'error';
    password?: string;
    error?: string;
  } | null>(null);

  // Forms State
  const [broadcastMsg, setBroadcastMsg] = useState('🚨 Checkpoint 2 Review starting in 15 mins at CSE Lab 304!');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'emergency'>('warning');
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnCategory, setNewAnnCategory] = useState<'Important' | 'Schedule' | 'Review' | 'General'>('Important');
  
  // New Admin Form
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminUser['role']>('ADMIN');

  // Edit / Delete Admin User (CRUD) State
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminRole, setEditAdminRole] = useState('');
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);

  // Checkpoint (Milestone) CRUD Form State
  const [cpTitle, setCpTitle] = useState('');
  const [cpDesc, setCpDesc] = useState('');
  const [cpTime, setCpTime] = useState('');
  const [cpStatus, setCpStatus] = useState<'Open' | 'Closed'>('Open');
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);

  // Sponsor form & editing
  const [spTitle, setSpTitle] = useState('');
  const [spCategory, setSpCategory] = useState<Sponsor['category']>('Community');
  const [spLogo, setSpLogo] = useState('');
  const [spWebsite, setSpWebsite] = useState('');
  const [spDescription, setSpDescription] = useState('');
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  // New Email Campaign Form
  const [emailTitle, setEmailTitle] = useState('');
  const [emailTarget, setEmailTarget] = useState<EmailCampaign['targetGroup']>('All Participants');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [tRes, sRes, aRes, tkRes, mRes, cmsRes, logRes, admRes, rbRes, emRes, jrRes, schRes, polRes, cpRes, spRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/submissions'),
        fetch('/api/announcements'),
        fetch('/api/tickets'),
        fetch('/api/milestone-reports'),
        fetch('/api/cms-config'),
        fetch('/api/audit-logs'),
        fetch('/api/admin-users'),
        fetch('/api/rulebooks'),
        fetch('/api/email-campaigns'),
        fetch('/api/judging-rounds'),
        fetch('/api/schedule'),
        fetch('/api/policies'),
        fetch('/api/checkpoints'),
        fetch('/api/sponsors')
      ]);

      const tData = await tRes.json();
      const sData = await sRes.json();
      const aData = await aRes.json();
      const tkData = await tkRes.json();
      const mData = await mRes.json();
      const cmsData = await cmsRes.json();
      const logData = await logRes.json();
      const admData = await admRes.json();
      const rbData = await rbRes.json();
      const emData = await emRes.json();
      const jrData = await jrRes.json();
      const schData = await schRes.json();
      const polData = await polRes.json();
      const cpData = await cpRes.json();
      const spData = await spRes.json();

      if (tData.teams) setTeams(tData.teams);
      if (sData.submissions) setSubmissions(sData.submissions);
      if (aData.announcements) setAnnouncements(aData.announcements);
      if (tkData.tickets) setTickets(tkData.tickets);
      if (mData.reports) setMilestoneReports(mData.reports);
      if (cmsData.config) setCmsConfig(cmsData.config);
      if (logData.logs) setAuditLogs(logData.logs);
      if (admData.users) setAdminUsers(admData.users);
      if (rbData.rulebooks) setRulebooks(rbData.rulebooks);
      if (emData.campaigns) setEmailCampaigns(emData.campaigns);
      if (jrData.rounds) setJudgingRounds(jrData.rounds);
      if (schData.schedule) setScheduleItems(schData.schedule);
      if (polData.policies) setPolicies(polData.policies);
      if (cpData.checkpoints) setCheckpoints(cpData.checkpoints);
      if (spData.sponsors) setSponsors(spData.sponsors);
    } catch (err) {
      console.error("Error loading Admin Data", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper Stats Calculations
  const allParticipants = (teams || []).flatMap(t => t?.members || []);
  const totalVerifiedParticipants = allParticipants.length;
  const totalColleges = new Set(allParticipants.map(p => p?.college).filter(Boolean)).size;
  const totalProjectsSubmitted = (submissions || []).length;
  const totalRevenue = (teams || []).reduce((sum, team) => sum + team.members.length * (cmsConfig?.registrationFee || 250), 0);

  // Super Admin Authentication Handlers
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = inputEmail.trim();
    const pass = inputPassword.trim();

    if (!identifier || !pass) {
      setAuthError('Please enter both your admin username/email and password.');
      return;
    }

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setAdminEmail(identifier);
        setAuthError('');
        showToast(`✓ Admin session authenticated. Welcome, ${data.user?.name || ''}!`);
        await fetchAdminData();
      } else {
        setAuthError(data.error || 'Invalid credentials. Please verify your admin identity.');
      }
    } catch (err) {
      setAuthError('Authentication service unreachable. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    setInputPassword('');
    setAuthError('');
    showToast('Super Admin Session Terminated.');
  };

  const handleToggleFreezeRegistration = async (freeze?: boolean) => {
    try {
      const targetState = typeof freeze === 'boolean' ? freeze : !cmsConfig.freezeRegistrations;
      const res = await fetch('/api/admin/toggle-freeze-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeze: targetState })
      });
      const data = await res.json();
      if (data.success) {
        setCmsConfig(prev => ({
          ...prev,
          freezeRegistrations: data.freezeRegistrations,
          registrationOpen: data.registrationOpen
        }));
        showToast(data.message || (data.freezeRegistrations ? "Registrations FROZEN." : "Registrations OPEN."));
        fetchAdminData();
      }
    } catch (err) {
      showToast("Error toggling registration status");
    }
  };

  const handleClearAllTeams = async () => {
    const confirmText = window.prompt('Type "DELETE ALL" to wipe all present registered teams and reset system state:');
    if (confirmText !== 'DELETE ALL') {
      if (confirmText !== null) alert('Action aborted. Confirmation text did not match.');
      return;
    }

    try {
      const res = await fetch('/api/admin/clear-all-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setTeams([]);
        setSubmissions([]);
        setScorecards([]);
        showToast("✓ All registered teams and users have been purged.");
        fetchAdminData();
      }
    } catch (err) {
      showToast("Error wiping teams");
    }
  };

  // Handlers
  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmsConfig)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Super Admin CMS Settings updated live!");
      }
    } catch (err) {
      showToast("✕ Error saving CMS settings");
    }
  };

  const handleIssueCertificates = async () => {
    try {
      const res = await fetch('/api/certificate-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setCmsConfig(prev => ({ ...prev, enableCertificateDownloads: true }));
        showToast(`✓ Issued ${allParticipants.length} Certificates to Participant Portals — downloads now enabled!`);
      } else {
        showToast("✕ Failed to issue certificates");
      }
    } catch (err) {
      showToast("✕ Network error issuing certificates");
    }
  };

  const handleToggleSubmissions = async () => {
    const next = !cmsConfig.enableProjectSubmissions;
    try {
      const res = await fetch('/api/cms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableProjectSubmissions: next })
      });
      const data = await res.json();
      if (data.success) {
        setCmsConfig(prev => ({ ...prev, enableProjectSubmissions: next }));
        showToast(next ? "✓ Final Project Submission ENABLED — now visible on participant portal!" : "✕ Final Project Submission DISABLED — hidden from participant portal");
      } else {
        showToast("✕ Failed to update submission status");
      }
    } catch (err) {
      showToast("✕ Network error updating submission status");
    }
  };

  // Generic enable/disable for any Event Flow module on the participant portal.
  const handleToggleFeature = async (flag: string, label: string) => {
    const next = !cmsConfig[flag];
    try {
      const res = await fetch('/api/cms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: next })
      });
      const data = await res.json();
      if (data.success) {
        setCmsConfig(prev => ({ ...prev, [flag]: next }));
        showToast(`${next ? 'ENABLED' : 'DISABLED'} — ${label} is now ${next ? 'live on the participant portal' : 'shown as Coming Soon'}`);
      } else {
        showToast(`✕ Failed to update ${label}`);
      }
    } catch (err) {
      showToast(`✕ Network error updating ${label}`);
    }
  };

  // Toggle a single home page section's visibility.
  const handleToggleHomeSection = async (key: keyof NonNullable<WebsiteCMSConfig['homeSections']>, label: string) => {
    const current = (cmsConfig.homeSections || {})[key];
    const next = !current;
    const nextSections = { ...(cmsConfig.homeSections || {}), [key]: next };
    try {
      const res = await fetch('/api/cms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeSections: nextSections })
      });
      const data = await res.json();
      if (data.success) {
        setCmsConfig(prev => ({ ...prev, homeSections: nextSections }));
        showToast(`${next ? 'SHOW' : 'HIDE'} — ${label} is now ${next ? 'visible on the home page' : 'hidden from the home page'}`);
      } else {
        showToast(`✕ Failed to update ${label}`);
      }
    } catch (err) {
      showToast(`✕ Network error updating ${label}`);
    }
  };

  // ----- SPONSOR CRUD -----
  const handleStartEditSponsor = (sp: Sponsor) => {
    setEditingSponsor(sp);
    setSpTitle(sp.name);
    setSpCategory(sp.category);
    setSpLogo(sp.logo);
    setSpWebsite(sp.website);
    setSpDescription(sp.description || '');
  };

  const resetSponsorForm = () => {
    setEditingSponsor(null);
    setSpTitle('');
    setSpCategory('Community');
    setSpLogo('');
    setSpWebsite('');
    setSpDescription('');
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spTitle.trim() || !spWebsite.trim()) {
      showToast("✕ Sponsor name and website are required");
      return;
    }
    try {
      const body = {
        id: editingSponsor?.id,
        name: spTitle.trim(),
        category: spCategory,
        logo: spLogo.trim() || spTitle.trim(),
        website: spWebsite.trim(),
        description: spDescription.trim()
      };
      const url = editingSponsor ? '/api/sponsors/edit' : '/api/sponsors';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingSponsor ? `✓ Sponsor "${spTitle.trim()}" updated` : `✓ Sponsor "${spTitle.trim()}" added to the home page`);
        resetSponsorForm();
        fetchAdminData();
      } else {
        showToast(`✕ ${data.error || 'Failed to save sponsor'}`);
      }
    } catch (err) {
      showToast("✕ Network error saving sponsor");
    }
  };

  const handleDeleteSponsor = async (id: string, name: string) => {
    if (!window.confirm(`Delete sponsor "${name}" from the home page?`)) return;
    try {
      const res = await fetch('/api/sponsors/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Sponsor "${name}" deleted`);
        setSponsors(prev => prev.filter(s => s.id !== id));
      } else {
        showToast("✕ Failed to delete sponsor");
      }
    } catch (err) {
      showToast("✕ Network error deleting sponsor");
    }
  };

  const handleSendBroadcastAlert = async (active: boolean) => {
    try {
      const res = await fetch('/api/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, message: broadcastMsg, type: broadcastType })
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastActive(active);
        showToast(active ? "🚨 Live Emergency Broadcast Published!" : "Broadcast Banner Turn Off");
      }
    } catch (err) {
      showToast("Error updating broadcast");
    }
  };

  const handleScoreOverrideSubmit = async () => {
    if (!scoreOverrideModal.reason || scoreOverrideModal.reason.length < 5) {
      alert("Mandatory audit reason required (at least 5 characters).");
      return;
    }
    try {
      const res = await fetch('/api/submissions/override-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: scoreOverrideModal.submissionId,
          newTotalScore: scoreOverrideModal.currentScore,
          reason: scoreOverrideModal.reason,
          actorEmail: adminEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Judge score overridden and recorded in immutable audit log.");
        setScoreOverrideModal({ open: false, submissionId: '', currentScore: 0, reason: '' });
        fetchAdminData();
      }
    } catch (err) {
      alert("Score override failed");
    }
  };

  const handleOpenEditTeam = (team: Team) => {
    // Deep clone team so edits don't mutate state prematurely
    setEditingTeam(JSON.parse(JSON.stringify(team)));
    setIsEditTeamModalOpen(true);
  };

  const handleSaveEditedTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTeam)
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✓ Team ${editingTeam.teamName} (${editingTeam.id}) updated successfully!`);
        setIsEditTeamModalOpen(false);
        setEditingTeam(null);
        fetchAdminData();
      } else {
        alert(data.error || "Failed to update team");
      }
    } catch (err) {
      console.error(err);
      alert("Network error updating team");
    }
  };

  const handleResetPortalPassword = async () => {
    if (!passwordReset || passwordReset.status !== 'confirm') return;
    const { teamId, teamName } = passwordReset;
    setPasswordReset({ teamId, teamName, status: 'loading' });

    try {
      const res = await fetch(`/api/admin/teams/${encodeURIComponent(teamId)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.temporaryPassword) {
        setPasswordReset({ teamId, teamName, status: 'error', error: data.error || 'Password reset failed.' });
        return;
      }
      setPasswordReset({ teamId, teamName, status: 'success', password: data.temporaryPassword });
      fetchAdminData();
    } catch (err) {
      console.error(err);
      setPasswordReset({ teamId, teamName, status: 'error', error: 'Network error resetting the portal password.' });
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}" (${teamId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Team ${teamName} deleted from records.`);
        fetchAdminData();
      } else {
        alert(data.error || "Failed to delete team");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting team");
    }
  };

  const handleEmergencyTrigger = async () => {
    if (!emergencyModal.reason || emergencyModal.reason.length < 5) {
      alert("Emergency reason required for audit compliance.");
      return;
    }
    try {
      const res = await fetch('/api/emergency-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: emergencyModal.type,
          freezeState: emergencyModal.state,
          reason: emergencyModal.reason
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚨 Emergency Control: ${emergencyModal.type.toUpperCase()} Updated.`);
        setEmergencyModal({ open: false, type: 'maintenance', state: true, reason: '' });
        fetchAdminData();
      }
    } catch (err) {
      alert("Emergency action failed");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminName) return;
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail,
          name: newAdminName,
          role: newAdminRole,
          username: newAdminUsername,
          password: newAdminPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ New Admin Role Created! Username: ${data.user?.username || newAdminUsername}`);
        setNewAdminEmail('');
        setNewAdminName('');
        setNewAdminUsername('');
        setNewAdminPassword('');
        fetchAdminData();
      } else {
        alert(data.error || "Failed to create admin");
      }
    } catch (err) {
      alert("Error creating admin");
    }
  };

  const handleOpenEditAdmin = (u: AdminUser) => {
    setEditingAdminUser(u);
    setEditAdminName(u.name);
    setEditAdminEmail(u.email);
    setEditAdminUsername(u.username || u.email.split('@')[0]);
    setEditAdminPassword('');
    setEditAdminRole(u.role);
    setIsEditAdminModalOpen(true);
  };

  const handleSaveEditedAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminUser) return;
    try {
      const res = await fetch(`/api/admin-users/${editingAdminUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editAdminName,
          email: editAdminEmail,
          username: editAdminUsername,
          role: editAdminRole.trim() || 'ADMIN',
          ...(editAdminPassword ? { password: editAdminPassword } : {})
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Admin user ${data.user?.name} updated (role → ${data.user?.role}).`);
        setIsEditAdminModalOpen(false);
        setEditingAdminUser(null);
        fetchAdminData();
      } else {
        alert(data.error || "Failed to update admin user");
      }
    } catch (err) {
      alert("Error updating admin user");
    }
  };

  const handleDeleteAdmin = async (u: AdminUser) => {
    if (!window.confirm(`Delete admin user "${u.name}" (${u.email})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin-users/${u.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Admin user ${data.deleted?.name} deleted.`);
        fetchAdminData();
      } else {
        alert(data.error || "Failed to delete admin user");
      }
    } catch (err) {
      alert("Error deleting admin user");
    }
  };

  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpTitle.trim()) {
      alert("Checkpoint title is required");
      return;
    }
    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cpTitle, description: cpDesc, time: cpTime, status: cpStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Checkpoint "${data.checkpoint.title}" added.`);
        setCpTitle(''); setCpDesc(''); setCpTime(''); setCpStatus('Open');
        fetchAdminData();
      } else {
        alert(data.error || "Failed to add checkpoint");
      }
    } catch (err) {
      alert("Error adding checkpoint");
    }
  };

  const handleOpenEditCheckpoint = (cp: Checkpoint) => {
    setEditingCheckpoint(cp);
    setCpTitle(cp.title);
    setCpDesc(cp.description);
    setCpTime(cp.time);
    setCpStatus(cp.status);
  };

  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCheckpoint) return;
    try {
      const res = await fetch(`/api/checkpoints/${editingCheckpoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cpTitle, description: cpDesc, time: cpTime, status: cpStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Checkpoint "${data.checkpoint.title}" updated.`);
        setEditingCheckpoint(null);
        setCpTitle(''); setCpDesc(''); setCpTime(''); setCpStatus('Open');
        fetchAdminData();
      } else {
        alert(data.error || "Failed to update checkpoint");
      }
    } catch (err) {
      alert("Error updating checkpoint");
    }
  };

  const handleDeleteCheckpoint = async (cp: Checkpoint) => {
    if (!window.confirm(`Delete checkpoint "${cp.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/checkpoints/${cp.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Checkpoint "${data.deleted?.title}" deleted.`);
        fetchAdminData();
      } else {
        alert(data.error || "Failed to delete checkpoint");
      }
    } catch (err) {
      alert("Error deleting checkpoint");
    }
  };

  const handleSendEmailCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return;
    try {
      const res = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: emailTitle || emailSubject, targetGroup: emailTarget, subject: emailSubject, body: emailBody })
      });
      const data = await res.json();
      const message = data.gatewayMessage || (data.success ? '✉️ Bulk Email Campaign Dispatched!' : (data.error || 'Email dispatch failed'));
      if (data.success && data.deliveredCount != null && data.deliveredCount > 0) {
        showToast(`✉️ Bulk email sent to ${data.deliveredCount} recipient(s).`);
        if (!data.smtpConfigured) {
          alert(message);
          showToast('⚠️ Campaign recorded, but SMTP is NOT configured — no real mail was sent. See .env.');
        }
      } else if (data.success) {
        showToast('⚠️ Campaign recorded — but check the message below.');
        alert(message);
      } else {
        showToast('⚠️ Email dispatch did not fully succeed.');
        alert(message);
      }
      fetchAdminData();
      if (data.success && data.smtpConfigured !== false) {
        setEmailSubject('');
        setEmailBody('');
      }
    } catch (err) {
      alert("Email dispatch failed");
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTime || !schTitle) return;
    try {
      const res = await fetch('/api/schedule/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: schTime,
          title: schTitle,
          description: schDesc,
          type: schType,
          day: schDay,
          location: schLoc
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Schedule event added to official agenda!");
        setSchTime('');
        setSchTitle('');
        setSchDesc('');
        setSchLoc('');
        fetchAdminData();
      }
    } catch (err) {
      alert("Error adding schedule item");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch('/api/schedule/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Schedule event removed");
        fetchAdminData();
      }
    } catch (err) {
      alert("Error deleting schedule item");
    }
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polTitle || !polText) return;
    try {
      const res = await fetch('/api/policies/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: polTitle, category: polCat, text: polText })
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Rulebook policy published!");
        setPolTitle('');
        setPolText('');
        fetchAdminData();
      }
    } catch (err) {
      alert("Error publishing policy");
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      const res = await fetch('/api/policies/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Policy removed from rulebook");
        fetchAdminData();
      }
    } catch (err) {
      alert("Error deleting policy");
    }
  };

  const handlePublishRulebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rbTitle) return;
    try {
      const res = await fetch('/api/rulebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: rbTitle, version: rbVersion, notes: rbNotes })
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ New Official Rulebook Version Published!");
        setRbTitle('');
        setRbVersion('');
        setRbNotes('');
        fetchAdminData();
      }
    } catch (err) {
      alert("Error publishing rulebook");
    }
  };

  const handleVerifyUTR = async (teamId: string, status: 'Verified' | 'Rejected') => {
    try {
      const res = await fetch('/api/finance/verify-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, paymentStatus: status })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Payment status updated to ${status}!`);
        fetchAdminData();
      }
    } catch (err) {
      alert("Error updating payment status");
    }
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'object' ? JSON.stringify(v) : `"${v}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Exported ${filename}.csv`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-app text-slate-100 flex items-center justify-center p-4 relative overflow-hidden antialiased">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* TOAST ALERT BANNER */}
        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900 border border-purple-500/50 text-white shadow-2xl flex items-center gap-3 animate-bounce">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold">{toastMsg}</span>
          </div>
        )}

        <div className="max-w-md w-full relative z-10 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 shadow-xl shadow-purple-500/20 border border-purple-400/30 mb-2">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="text-[11px] font-bold text-purple-400 uppercase tracking-widest font-mono">
              K. S. SCHOOL OF ENGINEERING AND MANAGEMENT
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SUPER ADMIN CONSOLE
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Central Control & Live Operational Command • Anvation 2026
            </p>
          </div>

          {/* Login Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-purple-950/40 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Lock className="w-4 h-4 text-purple-400" /> Administrator Verification
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                Username / Password
              </span>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Admin Username / Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="superadmin or superadmin@kssem.edu.in"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-purple-400 transition-colors"
                    id="admin-login-email-input"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Security Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Enter admin passphrase"
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-purple-400 transition-colors"
                    id="admin-login-pass-input"
                  />
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                id="admin-login-submit-btn"
              >
                <ShieldCheck className="w-4 h-4" /> Authorize Super Admin Session
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-500">
                Restricted System Access • Department of Computer Science & Engineering
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-purple-500 selection:text-white">
      {/* TOAST ALERT BANNER */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900 border border-purple-500/50 text-white shadow-2xl flex items-center gap-3 animate-bounce">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* TOP SAAS HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white shadow-lg shadow-purple-500/20">
            KS
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white flex items-center gap-2">
              ANVATION 2026 <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] border border-purple-800">SUPER ADMIN</span>
            </h1>
            <p className="text-[10px] text-slate-400">K. S. School of Engineering & Management • Central Control Console</p>
          </div>
        </div>

        {/* TOP GLOBAL SEARCH COMMAND PALETTE */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Search participants, teams, USN, judges, mentors, audit logs... (Ctrl+K)"
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
          />
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono text-slate-500 bg-slate-950 border border-slate-800 rounded absolute right-2.5">⌘K</kbd>
        </div>

        {/* QUICK ACTIONS & EMERGENCY TOGGLE */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEmergencyModal({ open: true, type: 'maintenance', state: !cmsConfig.maintenanceMode, reason: '' })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              cmsConfig.maintenanceMode 
                ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-red-500/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            {cmsConfig.maintenanceMode ? 'MAINTENANCE MODE ON' : 'Emergency Stop'}
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-700 flex items-center justify-center font-bold text-xs text-purple-300">
              SA
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white leading-tight">Super Admin</div>
              <div className="text-[10px] text-slate-400 leading-tight">{adminEmail}</div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="ml-2 px-2.5 py-1.5 rounded-xl bg-red-950/60 border border-red-700/60 hover:bg-red-900/80 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Logout from Super Admin Session"
              id="admin-header-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800/80 p-4 shrink-0 overflow-y-auto space-y-6 hidden md:block flex flex-col justify-between">
          <div>
          
          {/* GROUP 1: DASHBOARD & ENTRY */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">CORE COMMAND</div>
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'overview' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-purple-400" /> Overview & Live Tracker
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'scanner' ? 'bg-cyan-600/10 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-cyan-400" /> Gate Pass Scanner (Check-in)
            </button>
          </div>

          {/* GROUP 2: PEOPLE & TEAMS */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">PEOPLE & TEAMS</div>
            <button
              onClick={() => setActiveTab('participants')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'participants' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" /> Participant Directory ({allParticipants.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'teams' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" /> Team Control ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('registration-settings')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'registration-settings' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-400" /> Registration Rules
            </button>
          </div>

          {/* GROUP 3: EVENT CMS & CONTENT */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">EVENT & WEBSITE CMS</div>
            <button
              onClick={() => setActiveTab('cms')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'cms' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Globe className="w-4 h-4 text-pink-400" /> Website Content CMS
            </button>
            <button
              onClick={() => setActiveTab('event-flow')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'event-flow' ? 'bg-amber-600/10 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" /> Event Flow (Enable / Disable)
            </button>
            <button
              onClick={() => setActiveTab('home-sections')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'home-sections' ? 'bg-cyan-600/10 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" /> Home Page Sections
            </button>
            <button
              onClick={() => setActiveTab('sponsors')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'sponsors' ? 'bg-amber-600/10 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Handshake className="w-4 h-4 text-amber-400" /> Sponsors & Partners
            </button>
            <button
              onClick={() => setActiveTab('rulebook')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'rulebook' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" /> Rulebook & Policies
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'schedule' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-teal-400" /> Agenda Schedule
            </button>
          </div>

          {/* GROUP 4: PROJECTS & JUDGING */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">PROJECTS & JUDGING</div>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'submissions' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-4 h-4 text-yellow-400" /> Project Submissions ({submissions.length})
            </button>
            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'checkpoints' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" /> Checkpoints & Milestones ({checkpoints.length})
            </button>
          </div>

          {/* GROUP 5: LOGISTICS & CERTIFICATES */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">LOGISTICS & CERTIFICATES</div>
            <button
              onClick={() => setActiveTab('certificates')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'certificates' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-purple-400" /> Certificate Center
            </button>
          </div>

          {/* GROUP 6: COMMUNICATIONS */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">COMMUNICATIONS</div>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'announcements' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Bell className="w-4 h-4 text-red-400" /> Announcements & Alerts
            </button>
            <button
              onClick={() => setActiveTab('communication')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'communication' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 text-emerald-400" /> Email Campaigns
            </button>
          </div>

          {/* GROUP 7: GOVERNANCE & SECURITY */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">GOVERNANCE & SECURITY</div>
            <button
              onClick={() => setActiveTab('finance')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'finance' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-400" /> Finance & UTR Payments
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'roles' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Lock className="w-4 h-4 text-purple-400" /> User Roles & RBAC ({adminUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'security' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Security & Devices
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'audit' ? 'bg-purple-600/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Database className="w-4 h-4 text-amber-400" /> Immutable Audit Log ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                activeTab === 'emergency' ? 'bg-red-950 text-red-300 border border-red-700' : 'text-red-400 hover:bg-red-950/40'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-red-400" /> Emergency Control
            </button>
          </div>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={handleAdminLogout}
            className="w-full px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50 hover:bg-red-900/60 text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group"
            id="admin-sidebar-logout-btn"
          >
            <LogOut className="w-4 h-4 text-red-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Lock & Exit Session</span>
          </button>
        </div>

      </aside>

        {/* MAIN DISPLAY CANVAS */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">

          {/* TAB 1: OVERVIEW & LIVE EXACT DATA TRACKER */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* TOP STATS DASHBOARD GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Teams</div>
                  <div className="text-2xl font-black text-white mt-1">{teams.length}</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">
                    {teams.length > 0 ? `${teams.filter(t => t.paymentStatus === 'Verified').length} Paid` : '0 Registered'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Participants</div>
                  <div className="text-2xl font-black text-cyan-300 mt-1">{totalVerifiedParticipants}</div>
                  <div className="text-[10px] text-slate-400 mt-1">From {totalColleges} Colleges</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Gate Checked-In</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {teams.filter(t => t.status === 'Checked-In' || t.members.some(m => m.checkedIn)).length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {allParticipants.filter(p => p.checkedIn).length} / {totalVerifiedParticipants} Hackers Present
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Projects Submitted</div>
                  <div className="text-2xl font-black text-amber-300 mt-1">{submissions.length}</div>
                  <div className="text-[10px] text-slate-400 mt-1">GitHub & PPT Uploads</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Est. Revenue</div>
                  <div className="text-2xl font-black text-purple-300 mt-1">
                    ₹{totalRevenue.toLocaleString()}
                  </div>
                    <div className="text-[10px] text-emerald-400 mt-1">₹{cmsConfig.registrationFee || 250} / Participant</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Registration State</div>
                  <div className={`text-sm font-black mt-2 ${cmsConfig.freezeRegistrations ? 'text-red-400' : 'text-emerald-400'}`}>
                    {cmsConfig.freezeRegistrations ? 'FROZEN' : 'OPEN'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {cmsConfig.freezeRegistrations ? 'Signups Blocked' : 'Accepting Teams'}
                  </div>
                </div>
              </div>

              {/* EXACT VENUE ATTENDANCE & TRACK BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real Gate Check-In Status */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" /> Real-time Gate Entry & Attendance Tracker
                      </h3>
                      <p className="text-xs text-slate-400">Live venue entry verification status for registered teams and students.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('scanner')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Launch Gate Scanner
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-bold uppercase">Checked-In Teams</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        {teams.filter(t => t.status === 'Checked-In' || t.members.some(m => m.checkedIn)).length}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Physical Venue Entry Confirmed</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-bold uppercase">Pending Gate Check-In</div>
                      <div className="text-2xl font-black text-amber-400 mt-1">
                        {teams.filter(t => t.status !== 'Checked-In' && !t.members.some(m => m.checkedIn)).length}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Awaiting QR Pass Scan</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-bold uppercase">Attendance Rate</div>
                      <div className="text-2xl font-black text-cyan-300 mt-1">
                        {teams.length > 0
                          ? `${Math.round((teams.filter(t => t.status === 'Checked-In' || t.members.some(m => m.checkedIn)).length / teams.length) * 100)}%`
                          : '0%'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Venue Hall Capacity</div>
                    </div>
                  </div>

                  {/* Registered Teams Quick Roster */}
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-300">Recent Registrations:</div>
                    {teams.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        No teams currently registered. New team signups will populate here live.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {teams.slice(0, 5).map(team => (
                          <div key={team.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                {team.teamName}
                                <span className="font-mono text-[10px] text-purple-400">({team.regNumber || team.id})</span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {team.preferredTrack} • {team.members.length} Members • {team.leaderEmail}
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              team.status === 'Checked-In' || team.members.some(m => m.checkedIn)
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}>
                              {team.status === 'Checked-In' || team.members.some(m => m.checkedIn) ? 'Checked-In ✓' : 'Registered'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations & Control Card */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" /> Admin Command Actions
                    </h3>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-300">Registration Freeze Gate</div>
                      <p className="text-[11px] text-slate-400">
                        {cmsConfig.freezeRegistrations
                          ? 'Registration is currently FROZEN. No new teams can register on the public portal.'
                          : 'Registration is currently OPEN. Teams can register and submit member details.'}
                      </p>
                      <button
                        onClick={() => handleToggleFreezeRegistration()}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          cmsConfig.freezeRegistrations
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {cmsConfig.freezeRegistrations ? 'Unfreeze / Open Registrations' : 'Freeze Registrations'}
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-300">Reset System Users</div>
                      <p className="text-[11px] text-slate-400">
                        Wipe all currently registered teams, member records, and project submissions to start fresh.
                      </p>
                      <button
                        onClick={handleClearAllTeams}
                        className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        Purge All Registered Teams
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono text-center pt-2">
                    Super Admin Console • Anvation 2026
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GATE PASS SCANNER */}
          {activeTab === 'scanner' && (
            <div className="space-y-6">
              <CheckInScanner 
                teams={teams}
                onUpdateTeam={(updatedTeam) => {
                  setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
                  showToast(`✓ Gate Check-in Verified for ${updatedTeam.teamName}!`);
                }}
              />
            </div>
          )}

          {/* TAB 2: PARTICIPANT CONTROL DIRECTORY */}
          {activeTab === 'participants' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" /> Participant Central Control Directory ({allParticipants.length})
                  </h3>
                  <p className="text-xs text-slate-400">Search, inspect USN profiles, verify attendance, and manage student credentials.</p>
                </div>
                <button
                  onClick={() => exportCSV(allParticipants, 'KS_HACKNOVE_PARTICIPANTS')}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center gap-1.5 self-start md:self-auto"
                >
                  <Download className="w-3.5 h-3.5" /> Export Participants CSV
                </button>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" /> Sort
                  <select
                    value={participantSort}
                    onChange={(e) => setParticipantSort(e.target.value as typeof participantSort)}
                    className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px] font-bold"
                  >
                    <option value="name">Name (A–Z)</option>
                    <option value="college">College</option>
                    <option value="role">Role</option>
                    <option value="team">Team</option>
                  </select>
                </label>
              </div>

              {/* SEARCH BAR */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Filter by Participant Name, USN, Email, College, or Team ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">USN / Name</th>
                      <th className="p-3">College & Dept</th>
                      <th className="p-3">Role & Team</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Gate Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {allParticipants
                      .filter(p => 
                        p.fullName.toLowerCase().includes(participantSearch.toLowerCase()) ||
                        p.usn.toLowerCase().includes(participantSearch.toLowerCase()) ||
                        p.email.toLowerCase().includes(participantSearch.toLowerCase()) ||
                        p.college.toLowerCase().includes(participantSearch.toLowerCase())
                      )
                      .sort((a, b) => {
                        switch (participantSort) {
                          case 'college': return a.college.localeCompare(b.college);
                          case 'role': return a.role.localeCompare(b.role);
                          case 'team': return a.teamId.localeCompare(b.teamId);
                          default: return a.fullName.localeCompare(b.fullName);
                        }
                      })
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-950/50">
                          <td className="p-3">
                            <div className="font-bold text-white">{p.fullName}</div>
                            <div className="text-[10px] font-mono text-cyan-400">{p.usn}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-300">{p.college}</div>
                            <div className="text-[10px] text-slate-500">{p.department} (Sem {p.semester})</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              p.role === 'Leader' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {p.role}
                            </span>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">{p.teamId}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-300">{p.email}</div>
                            <div className="text-[10px] font-mono text-slate-500">{p.phone}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              p.checkedIn ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-950 text-slate-500 border-slate-800'
                            }`}>
                              {p.checkedIn ? 'CHECKED-IN ✓' : 'NOT YET ARRIVED'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {teams.find(t => t.id === p.teamId) && (
                                <button
                                  onClick={() => handleOpenEditTeam(teams.find(t => t.id === p.teamId)!)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold text-[10px] flex items-center gap-1"
                                  title="Edit Entire Team"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Team
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedParticipantModal(p)}
                                className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 font-bold text-[10px]"
                              >
                                Inspect Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TEAM MANAGEMENT */}
          {activeTab === 'teams' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" /> Registered Hackathon Teams Control ({teams.length})
                  </h3>
                  <p className="text-xs text-slate-400">Lock registrations, edit track choices, manage members, and monitor submission readiness.</p>
                </div>
                <button
                  onClick={() => exportCSV(teams, 'KS_HACKNOVE_TEAMS')}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export Teams CSV
                </button>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Sort
                  <select
                    value={teamSort}
                    onChange={(e) => setTeamSort(e.target.value as typeof teamSort)}
                    className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px] font-bold"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Team Name (A–Z)</option>
                    <option value="members">Most Members</option>
                    <option value="status">Status</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...teams].sort((a, b) => {
                  switch (teamSort) {
                    case 'name': return a.teamName.localeCompare(b.teamName);
                    case 'members': return b.members.length - a.members.length;
                    case 'status': return (a.status || '').localeCompare(b.status || '');
                    case 'oldest': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                    default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }
                }).map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <span className="font-mono text-xs text-cyan-400 font-bold">{t.id}</span>
                        <h4 className="text-sm font-black text-white">{t.teamName}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.status === 'Checked-In' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-slate-300">Track: <span className="text-purple-300 font-bold">{t.preferredTrack}</span></div>
                      <div className="text-slate-400 text-[11px]">Leader Email: {t.leaderEmail}</div>
                      <div className="text-slate-400 text-[11px]">Members Count: {t.members.length} Hacker(s)</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1">Portal Password: <span className="text-emerald-300 font-mono font-bold">Stored securely</span></div>
                      <div className="text-slate-400 text-[11px]">Payment: <span className={t.paymentStatus === 'Verified' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{t.paymentStatus || 'Verified'}</span> (UTR: {t.paymentUtr || 'N/A'})</div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-900">
                      <span className="text-[10px] text-slate-500 font-mono">Reg: {t.regNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditTeam(t)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-bold text-xs flex items-center gap-1 transition-colors"
                          id={`edit-team-${t.id}-btn`}
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>Edit Team</span>
                        </button>
                        <button
                          onClick={() => setPasswordReset({ teamId: t.id, teamName: t.teamName, status: 'confirm' })}
                          className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 font-bold text-xs flex items-center gap-1 transition-colors"
                          title="Reset Portal Password"
                        >
                          <Key className="w-3 h-3" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id, t.teamName)}
                          className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/60 transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SPONSORS & PARTNERS MANAGEMENT */}
          {activeTab === 'sponsors' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-500/30 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-amber-400" /> Sponsors & Partners
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Add, rename, or remove sponsors shown on the public home page. Changes publish live — no rebuild needed.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-amber-950/40 text-amber-300 border border-amber-500/50 shrink-0">
                  {sponsors.length} on Home Page
                </span>
              </div>

              {/* Add / Edit Sponsor Form */}
              <form onSubmit={handleSaveSponsor} className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {editingSponsor ? <Edit3 className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4 text-amber-400" />}
                  {editingSponsor ? `Edit Sponsor — ${editingSponsor.name}` : 'Add New Sponsor'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Sponsor / Partner Name *</label>
                    <input
                      type="text"
                      value={spTitle}
                      onChange={(e) => setSpTitle(e.target.value)}
                      placeholder="e.g. Google Cloud Platform"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                    <select
                      value={spCategory}
                      onChange={(e) => setSpCategory(e.target.value as Sponsor['category'])}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    >
                      {['Title', 'Gold', 'Silver', 'Technology', 'Community', 'Media', 'Hiring'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Logo / Short Text (optional)</label>
                    <input
                      type="text"
                      value={spLogo}
                      onChange={(e) => setSpLogo(e.target.value)}
                      placeholder="e.g. GCP (defaults to name)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Website URL *</label>
                    <input
                      type="url"
                      value={spWebsite}
                      onChange={(e) => setSpWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Description (optional)</label>
                  <textarea
                    rows={2}
                    value={spDescription}
                    onChange={(e) => setSpDescription(e.target.value)}
                    placeholder="e.g. $10,000 in AI & Compute Credits"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Save className="w-4 h-4" /> {editingSponsor ? 'Save Changes' : 'Add Sponsor'}
                  </button>
                  {editingSponsor && (
                    <button
                      type="button"
                      onClick={resetSponsorForm}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {/* Sponsors List */}
              <div className="space-y-3">
                {sponsors.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">No sponsors yet — add one using the form above.</p>
                )}
                {sponsors.map(sp => (
                  <div key={sp.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-amber-300">
                        {sp.logo.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{sp.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-slate-600 bg-slate-800 text-slate-300">
                            {sp.category} Sponsor
                          </span>
                          <span className="text-[11px] text-cyan-300">{sp.website}</span>
                        </div>
                        {sp.description && <p className="text-[11px] text-slate-400 mt-0.5">{sp.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStartEditSponsor(sp)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-700/60 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSponsor(sp.id, sp.name)}
                        className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-700/60 text-red-300 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'home-sections' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-cyan-500/30 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" /> Home Page Sections
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Control exactly which sections appear on the public home page. Toggle a section
                    <span className="text-cyan-300 font-bold">OFF</span> to hide it instantly from all visitors.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-cyan-950/40 text-cyan-300 border border-cyan-500/50 shrink-0">
                  Publishes to Home Page
                </span>
              </div>

              <HomeSectionToggle
                icon={<Layers className="w-5 h-5 text-fuchsia-400" />}
                label="Hero Banner"
                desc="Main hero headline, countdown & CTA buttons at the very top."
                on={(cmsConfig.homeSections || {}).hero !== false}
                onToggle={() => handleToggleHomeSection('hero', 'Hero Banner')}
              />

              <HomeSectionToggle
                icon={<ShieldCheck className="w-5 h-5 text-blue-400" />}
                label="About The Event"
                desc="Overview, college info and highlights."
                on={(cmsConfig.homeSections || {}).about !== false}
                onToggle={() => handleToggleHomeSection('about', 'About')}
              />

              <HomeSectionToggle
                icon={<Layers className="w-5 h-5 text-purple-400" />}
                label="Tracks / Themes"
                desc="AI/ML, cyber, IoT & other hackathon tracks."
                on={(cmsConfig.homeSections || {}).themes !== false}
                onToggle={() => handleToggleHomeSection('themes', 'Tracks & Themes')}
              />

              <HomeSectionToggle
                icon={<Calendar className="w-5 h-5 text-teal-400" />}
                label="24H Live Schedule"
                desc="The hour-by-hour hackathon agenda/timeline."
                on={(cmsConfig.homeSections || {}).schedule !== false}
                onToggle={() => handleToggleHomeSection('schedule', 'Schedule')}
              />

              <HomeSectionToggle
                icon={<Award className="w-5 h-5 text-emerald-400" />}
                label="Prizes & Awards"
                desc="Prize pool and winner breakdown."
                on={(cmsConfig.homeSections || {}).prizes !== false}
                onToggle={() => handleToggleHomeSection('prizes', 'Prizes')}
              />

              <HomeSectionToggle
                icon={<Briefcase className="w-5 h-5 text-amber-400" />}
                label="Partners & Sponsors"
                desc="Sponsor and partner logos grid."
                on={(cmsConfig.homeSections || {}).sponsors !== false}
                onToggle={() => handleToggleHomeSection('sponsors', 'Sponsors')}
              />

              <HomeSectionToggle
                icon={<HelpCircle className="w-5 h-5 text-pink-400" />}
                label="FAQ"
                desc="Frequently asked questions accordion."
                on={(cmsConfig.homeSections || {}).faq !== false}
                onToggle={() => handleToggleHomeSection('faq', 'FAQ')}
              />

              <HomeSectionToggle
                icon={<Mail className="w-5 h-5 text-yellow-400" />}
                label="Contact / Reach Us"
                desc="Contact details and map section."
                on={(cmsConfig.homeSections || {}).contact !== false}
                onToggle={() => handleToggleHomeSection('contact', 'Contact')}
              />

              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Changes publish live. A section stays in the layout but is simply not rendered while hidden.
              </p>
            </div>
          )}

          {/* TAB: EVENT FLOW ENABLE / DISABLE CONTROL */}
          {activeTab === 'event-flow' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-500/30 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" /> Event Flow Control
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gate each participant-facing module. While a module is <span className="text-amber-300 font-bold">disabled</span>,
                    participants see a <span className="text-amber-300 font-bold">"Coming Soon"</span> state. Toggle it ON to go live instantly.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-amber-950/40 text-amber-300 border border-amber-500/50 shrink-0">
                  Live across participant portal
                </span>
              </div>

              {/* Milestones */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Checkpoint Milestone Reports</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">24H milestone progress reports submitted to the jury panel.</p>
                  </div>
                </div>
                <ToggleBadge
                  on={!!cmsConfig.enableMilestoneSubmissions}
                  onToggle={() => handleToggleFeature('enableMilestoneSubmissions', 'Milestone Reports')}
                />
              </div>

              {/* Final Project Submission */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center">
                    <FileCode className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Final Project Submission</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">GitHub link, tech stack, slide deck &amp; video demo for the code freeze.</p>
                  </div>
                </div>
                <ToggleBadge
                  on={!!cmsConfig.enableProjectSubmissions}
                  onToggle={() => handleToggleFeature('enableProjectSubmissions', 'Final Project Submission')}
                />
              </div>

              {/* Announcements */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Live Announcements Feed</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Real-time broadcast feed &amp; urgent alerts shown to participants.</p>
                  </div>
                </div>
                <ToggleBadge
                  on={!!cmsConfig.enableAnnouncements}
                  onToggle={() => handleToggleFeature('enableAnnouncements', 'Announcements Feed')}
                />
              </div>

              {/* Support Desk */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Support / Help Desk</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Participants raise lab, WiFi, power &amp; mentorship tickets.</p>
                  </div>
                </div>
                <ToggleBadge
                  on={!!cmsConfig.enableSupportTickets}
                  onToggle={() => handleToggleFeature('enableSupportTickets', 'Support Desk')}
                />
              </div>

              {/* Certificates */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Certificates</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Certificate downloads for verified participants after evaluation.</p>
                  </div>
                </div>
                <ToggleBadge
                  on={!!cmsConfig.enableCertificateDownloads}
                  onToggle={() => handleToggleFeature('enableCertificateDownloads', 'Certificates')}
                />
              </div>

              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Each change applies live and immediately updates the participant portal — no rebuild needed.
              </p>
            </div>
          )}

          {/* TAB 4: WEBSITE CONTENT CMS */}
          {activeTab === 'cms' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-purple-500/30 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-pink-400" /> Website Content CMS & Branding Settings
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update total prize pool, event titles, dates, contact numbers, and venue location live across the public site.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCMS} className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider">1. Event Branding</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Event Title:</label>
                      <input
                        type="text"
                        value={cmsConfig.eventName}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, eventName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Event Subtitle:</label>
                      <input
                        type="text"
                        value={cmsConfig.eventSubName}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, eventSubName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">2. Prize Pool & Venue</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Total Prize Money Pool:</label>
                      <input
                        type="text"
                        value={cmsConfig.totalPrizePool}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, totalPrizePool: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Event Dates:</label>
                      <input
                        type="text"
                        value={cmsConfig.eventDates}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, eventDates: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save CMS Changes & Publish Live
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: PROJECT SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-yellow-400" /> Submitted Projects & Code Audits ({submissions.length})
                  </h3>
                  <p className="text-xs text-slate-400">Review GitHub repositories, pitch decks, demo video URLs, and perform score overrides.</p>
                </div>
              </div>

              {/* Submission Visibility Control (Admin-controlled) */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" /> Final Project Submission Visibility
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                    When disabled, the "Final Project Submission" tab is hidden from the participant portal. Enable it only when you are ready to accept submissions.
                  </p>
                  <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-black ${cmsConfig.enableProjectSubmissions ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                    {cmsConfig.enableProjectSubmissions ? 'VISIBLE ON PARTICIPANT PORTAL' : 'HIDDEN ON PARTICIPANT PORTAL'}
                  </span>
                </div>
                <button
                  onClick={handleToggleSubmissions}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                    cmsConfig.enableProjectSubmissions
                      ? 'bg-red-950/60 border-red-700/60 text-red-300 hover:bg-red-900/80'
                      : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80'
                  }`}
                >
                  {cmsConfig.enableProjectSubmissions ? 'Hide from Participant Portal' : 'Enable Final Submission'}
                </button>
              </div>

              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400">{sub.teamId} • Track: {sub.track}</span>
                        <h4 className="text-base font-black text-white">{sub.projectTitle} ({sub.teamName})</h4>
                      </div>
                      <button
                        onClick={() => setScoreOverrideModal({ open: true, submissionId: sub.id, currentScore: 85, reason: '' })}
                        className="px-3 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 font-bold text-xs flex items-center gap-1 self-start"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Manual Score Override
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-white">Problem Statement:</strong> {sub.problemStatement}</p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <a href={sub.githubLink} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-mono text-[11px] flex items-center gap-1">
                        <FileCode className="w-3 h-3" /> GitHub Repo ↗
                      </a>
                      {sub.demoVideoUrl && (
                        <a href={sub.demoVideoUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-pink-300 border border-slate-800 font-mono text-[11px] flex items-center gap-1">
                          Demo Video ↗
                        </a>
                      )}
                      {sub.pptUrl && (
                        <a href={sub.pptUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800 font-mono text-[11px] flex items-center gap-1">
                          Presentation Deck ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5B: CHECKPOINTS & MILESTONES (full CRUD) */}
          {activeTab === 'checkpoints' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" /> Checkpoints & Milestones Control ({checkpoints.length})
                  </h3>
                  <p className="text-xs text-slate-400">Add, edit, and delete the 24-hour evaluation checkpoints. Participants see these live in their portal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add / Edit form */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                    {editingCheckpoint ? `Edit Checkpoint ${editingCheckpoint.number}` : 'Add New Checkpoint'}
                  </h4>
                  <form onSubmit={editingCheckpoint ? handleSaveCheckpoint : handleAddCheckpoint} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Checkpoint Title:</label>
                      <input type="text" required value={cpTitle} onChange={(e) => setCpTitle(e.target.value)}
                        placeholder="e.g. Ideation & System Design"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Description:</label>
                      <textarea rows={3} value={cpDesc} onChange={(e) => setCpDesc(e.target.value)}
                        placeholder="What participants must complete at this checkpoint"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Target Time:</label>
                        <input type="text" value={cpTime} onChange={(e) => setCpTime(e.target.value)}
                          placeholder="e.g. 02:00 PM (Day 1)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Status:</label>
                        <select value={cpStatus} onChange={(e) => setCpStatus(e.target.value as 'Open' | 'Closed')}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold">
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {editingCheckpoint && (
                        <button type="button" onClick={() => { setEditingCheckpoint(null); setCpTitle(''); setCpDesc(''); setCpTime(''); setCpStatus('Open'); }}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
                      )}
                      <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow">
                        <Plus className="w-3.5 h-3.5" /> {editingCheckpoint ? 'Save Checkpoint' : 'Add Checkpoint'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of checkpoints */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Current Checkpoints</h4>
                  {checkpoints.length === 0 && (
                    <p className="text-xs text-slate-500">No checkpoints defined yet. Add one to get started.</p>
                  )}
                  {[...checkpoints].sort((a, b) => a.number - b.number).map((cp) => (
                    <div key={cp.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800">CP {cp.number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${cp.status === 'Open' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                            {cp.status}
                          </span>
                        </div>
                        <div className="font-bold text-white mt-1.5">{cp.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{cp.description || 'No description'}</div>
                        <div className="text-[10px] text-amber-300 font-mono mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {cp.time || 'TBD'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => handleOpenEditCheckpoint(cp)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-bold text-[10px] flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => handleDeleteCheckpoint(cp)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/60 font-bold text-[10px] flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: JUDGING & LEADERBOARD */}
          {activeTab === 'judging' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-400" /> Grand Finale Leaderboard & Judging Control
                  </h3>
                  <p className="text-xs text-slate-400">Automated weighted evaluation score standings across all jury panels.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300">Active Judging Rounds Configured</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {judgingRounds.map((jr) => (
                    <div key={jr.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-white flex items-center justify-between">
                        <span>{jr.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800">{jr.status}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{jr.criteria.length} Evaluation Criteria Active</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ANNOUNCEMENTS & EMERGENCY BROADCAST */}
          {activeTab === 'announcements' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-950 border border-red-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-red-400 animate-pulse" /> Super Admin Emergency Broadcast Ticker
                    </h3>
                    <p className="text-xs text-slate-400">Send an urgent flashing alert banner directly to every active Participant Portal in real-time.</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    broadcastActive ? 'bg-red-950 text-red-400 border-red-700 animate-pulse' : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    {broadcastActive ? 'LIVE BROADCAST ACTIVE ✓' : 'BROADCAST OFF'}
                  </span>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="e.g. 🚨 Checkpoint 2 Review starting at Lab 304 in 10 mins!"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendBroadcastAlert(true)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Publish Live Banner
                    </button>
                    <button
                      onClick={() => handleSendBroadcastAlert(false)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-bold text-xs border border-slate-800"
                    >
                      Turn Off Banner
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ROLES & RBAC PERMISSIONS */}
          {activeTab === 'roles' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-400" /> User Role-Based Access Control (RBAC) ({adminUsers.length})
                </h3>
                <p className="text-xs text-slate-400">Super Admin alone can provision administrative roles and enforce permissions.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider">Create New Administrative User</h4>
                  <form onSubmit={handleCreateAdmin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Full Name:</label>
                      <input
                        type="text"
                        required
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="e.g. Prof. Rajesh Kumar"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Official Email Address:</label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="e.g. rajesh.cse@kssem.edu.in"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Login Username:</label>
                      <input
                        type="text"
                        required
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="e.g. rajeshadmin"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Login Password:</label>
                      <input
                        type="text"
                        required
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="e.g. secret123"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Role:</label>
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      >
                        <option value="ADMIN">ADMIN (General Staff)</option>
                        <option value="REGISTRATION_MANAGER">REGISTRATION_MANAGER</option>
                        <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
                        <option value="JUDGE">JUDGE</option>
                        <option value="MENTOR">MENTOR</option>
                        <option value="CHECKIN_STAFF">CHECKIN_STAFF (Gate Scanner)</option>
                      </select>
                    </div>

                    <button type="submit" className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-lg">
                      Provision Admin User
                    </button>
                  </form>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Admin Users</h4>
                    <span className="text-[10px] text-slate-500">{adminUsers.length} total</span>
                  </div>
                  {adminUsers.map((u) => (
                    <div key={u.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{u.name}</div>
                        <div className="text-[10px] font-mono text-cyan-400 truncate">{u.email} • @{u.username || u.email.split('@')[0]}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800 inline-block">
                            {u.role}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${u.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                            {u.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEditAdmin(u)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-bold text-[10px] flex items-center gap-1 transition-colors"
                          title="Edit role / details"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(u)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/60 font-bold text-[10px] flex items-center gap-1 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EDIT ADMIN USER MODAL (CRUD - Update role/details) */}
          {isEditAdminModalOpen && editingAdminUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-cyan-400" /> Edit Admin User
                  </h3>
                  <button onClick={() => { setIsEditAdminModalOpen(false); setEditingAdminUser(null); }} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveEditedAdmin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Full Name:</label>
                    <input type="text" required value={editAdminName} onChange={(e) => setEditAdminName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email:</label>
                    <input type="email" required value={editAdminEmail} onChange={(e) => setEditAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Username:</label>
                    <input type="text" required value={editAdminUsername} onChange={(e) => setEditAdminUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Reset Password (leave blank to keep):</label>
                    <input type="text" value={editAdminPassword} onChange={(e) => setEditAdminPassword(e.target.value)}
                      placeholder="New password (optional)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Role (free-text):</label>
                    <input type="text" required value={editAdminRole} onChange={(e) => setEditAdminRole(e.target.value)}
                      placeholder="e.g. ADMIN, JUDGE, CHECKIN_STAFF, VOLUNTEER"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono uppercase" />
                    <p className="text-[10px] text-slate-500 mt-1">Type any role label — super admin, judge, gate staff, etc.</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setIsEditAdminModalOpen(false); setEditingAdminUser(null); }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
                    <button type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow">
                      <Save className="w-3.5 h-3.5" /> Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 10: IMMUTABLE AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-400" /> Immutable System Audit Logs ({auditLogs.length})
                  </h3>
                  <p className="text-xs text-slate-400">Cryptographically verifiable record of all administrative, score, and security changes.</p>
                </div>
                <button
                  onClick={() => exportCSV(auditLogs, 'KS_HACKNOVE_AUDIT_LOGS')}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export Audit Trail
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{log.actorEmail}</div>
                          <div className="text-[9px] text-purple-400 font-mono">{log.actorRole}</div>
                        </td>
                        <td className="p-3 font-bold text-cyan-300">{log.action}</td>
                        <td className="p-3 text-slate-300">{log.target}</td>
                        <td className="p-3 text-slate-400 italic text-[11px]">{log.reason || 'N/A'}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{log.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: EMERGENCY CONTROL */}
          {activeTab === 'emergency' && (
            <div className="p-6 rounded-3xl bg-red-950/30 border border-red-600/50 space-y-6">
              <div className="border-b border-red-800/60 pb-3">
                <h3 className="text-xl font-black text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-red-500 animate-bounce" /> Super Admin Emergency Control Center
                </h3>
                <p className="text-xs text-slate-300">
                  Instantly freeze system operations, pause registrations, or lock project submissions during critical situations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-black text-white block">Global Maintenance Mode</span>
                  <p className="text-[11px] text-slate-400">Puts public site in maintenance mode with emergency notice.</p>
                  <button
                    onClick={() => setEmergencyModal({ open: true, type: 'maintenance', state: !cmsConfig.maintenanceMode, reason: '' })}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      cmsConfig.maintenanceMode ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {cmsConfig.maintenanceMode ? 'ACTIVE (CLICK TO DISABLE)' : 'Enable Maintenance'}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-black text-white block">Freeze Registrations</span>
                  <p className="text-[11px] text-slate-400">Prevents any new team signups on the website.</p>
                  <button
                    onClick={() => setEmergencyModal({ open: true, type: 'registrations', state: !cmsConfig.freezeRegistrations, reason: '' })}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      cmsConfig.freezeRegistrations ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {cmsConfig.freezeRegistrations ? 'FROZEN (CLICK TO RELEASE)' : 'Freeze Signups'}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-black text-white block">Freeze Project Submissions</span>
                  <p className="text-[11px] text-slate-400">Locks all GitHub & Presentation deck uploads.</p>
                  <button
                    onClick={() => setEmergencyModal({ open: true, type: 'submissions', state: !cmsConfig.freezeSubmissions, reason: '' })}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      cmsConfig.freezeSubmissions ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {cmsConfig.freezeSubmissions ? 'FROZEN (CLICK TO RELEASE)' : 'Freeze Submissions'}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-black text-white block">Freeze Jury Judging</span>
                  <p className="text-[11px] text-slate-400">Locks judge scorecards from further score edits.</p>
                  <button
                    onClick={() => setEmergencyModal({ open: true, type: 'judging', state: !cmsConfig.freezeJudging, reason: '' })}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      cmsConfig.freezeJudging ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {cmsConfig.freezeJudging ? 'FROZEN (CLICK TO RELEASE)' : 'Freeze Judging'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REGISTRATION RULES & POLICIES */}
          {activeTab === 'registration-settings' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" /> Registration Rules & Team Limits Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Configure team sizes, registration fees, track quotas, and auto-verification parameters.
                </p>
              </div>

              <form onSubmit={handleSaveCMS} className="space-y-6">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">1. Team Capacity & Size Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Min Team Size:</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={cmsConfig.minTeamSize || 2}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, minTeamSize: parseInt(e.target.value) || 2 })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Max Team Size:</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={cmsConfig.maxTeamSize || 4}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, maxTeamSize: parseInt(e.target.value) || 4 })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Max Total Registrations Cap:</label>
                      <input
                        type="number"
                        value={cmsConfig.maxRegistrations || 100}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, maxRegistrations: parseInt(e.target.value) || 100 })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">2. Financial & Payment Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Registration Fee Per Team (₹):</label>
                      <input
                        type="number"
                        value={cmsConfig.registrationFee || 250}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, registrationFee: parseInt(e.target.value) || 250 })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">College UPI VPA / QR ID:</label>
                      <input
                        type="text"
                        value={cmsConfig.upiId || 'kssem.hacknove@upi'}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, upiId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">3. Automated Control Toggles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!cmsConfig.freezeRegistrations}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, freezeRegistrations: !e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-0 bg-slate-950"
                      />
                      <div>
                        <div className="font-bold text-white">Accept Public Team Signups</div>
                        <div className="text-[10px] text-slate-400">Enable or pause the registration form on the public website.</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cmsConfig.autoApproveVerify || false}
                        onChange={(e) => setCmsConfig({ ...cmsConfig, autoApproveVerify: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-0 bg-slate-950"
                      />
                      <div>
                        <div className="font-bold text-white">Auto-Approve UTR Payments</div>
                        <div className="text-[10px] text-slate-400">Automatically mark submitted UTR receipts as verified.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs shadow-xl flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Registration Rules & Enforce Live
                </button>
              </form>
            </div>
          )}

          {/* TAB: RULEBOOK & POLICIES */}
          {activeTab === 'rulebook' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" /> Hackathon Official Rulebook & Guidelines Manager
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publish rulebook versions, specify code conduct, judging rules, and eligibility criteria.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Publish Version Form */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">Publish New Rulebook Version</h4>
                  <form onSubmit={handlePublishRulebook} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Rulebook Title:</label>
                      <input
                        type="text"
                        required
                        value={rbTitle}
                        onChange={(e) => setRbTitle(e.target.value)}
                        placeholder="e.g. KS HACKNOVE Official Guide 2026"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Version Tag:</label>
                      <input
                        type="text"
                        required
                        value={rbVersion}
                        onChange={(e) => setRbVersion(e.target.value)}
                        placeholder="e.g. v2.1-FINAL"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Release Notes / Summary:</label>
                      <textarea
                        rows={3}
                        value={rbNotes}
                        onChange={(e) => setRbNotes(e.target.value)}
                        placeholder="Key policy additions, hardware allowance updates..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg">
                      Publish Rulebook Version
                    </button>
                  </form>
                </div>

                {/* Published Rulebooks */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Published Rulebook Versions</h4>
                  <div className="space-y-2">
                    {rulebooks.map((rb) => (
                      <div key={rb.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{rb.title}</div>
                          <div className="text-[10px] text-indigo-300 font-mono">{rb.version} • Published {new Date(rb.createdAt).toLocaleDateString()}</div>
                          {rb.notes && <div className="text-[11px] text-slate-400 mt-1">{rb.notes}</div>}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {rb.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add Individual Policy Clause */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider">Add Specific Policy / Clause</h4>
                <form onSubmit={handleAddPolicy} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Clause Title:</label>
                    <input
                      type="text"
                      required
                      value={polTitle}
                      onChange={(e) => setPolTitle(e.target.value)}
                      placeholder="e.g. Pre-existing Code Prohibition"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Category:</label>
                    <select
                      value={polCat}
                      onChange={(e) => setPolCat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="Rules">Rules & Code Conduct</option>
                      <option value="Eligibility">Eligibility & USN Verification</option>
                      <option value="Judging">Judging Criteria & Disputes</option>
                      <option value="IP">Intellectual Property & Licensing</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Policy Text Detail:</label>
                    <textarea
                      rows={2}
                      required
                      value={polText}
                      onChange={(e) => setPolText(e.target.value)}
                      placeholder="All code, design assets, and API integrations must be created during the 24-hour hackathon window..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <button type="submit" className="md:col-span-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs">
                    + Add Clause to Rulebook
                  </button>
                </form>

                {/* Policy clauses list */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase">Active Rulebook Clauses ({policies.length})</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {policies.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{p.title}</span>
                          <button onClick={() => handleDeletePolicy(p.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold">Remove</button>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">{p.category}</span>
                        <p className="text-[11px] text-slate-300 leading-snug">{p.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AGENDA SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-400" /> Hackathon Agenda & Timeline Control
                  </h3>
                  <p className="text-xs text-slate-400">
                    Manage the 24-hour official schedule, keynote slots, meal breaks, and review checkpoint deadlines.
                  </p>
                </div>
              </div>

              {/* Add Schedule Item Form */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-teal-400 uppercase tracking-wider">Add Event to Official Timeline</h4>
                <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Time Range:</label>
                    <input
                      type="text"
                      required
                      value={schTime}
                      onChange={(e) => setSchTime(e.target.value)}
                      placeholder="e.g. 09:00 AM - 10:00 AM"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Title:</label>
                    <input
                      type="text"
                      required
                      value={schTitle}
                      onChange={(e) => setSchTitle(e.target.value)}
                      placeholder="e.g. Inauguration & Keynote Speech"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Venue / Room Location:</label>
                    <input
                      type="text"
                      value={schLoc}
                      onChange={(e) => setSchLoc(e.target.value)}
                      placeholder="e.g. KSSEM Main Auditorium"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Event Category:</label>
                    <select
                      value={schType}
                      onChange={(e) => setSchType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="keynote">Keynote / Ceremony</option>
                      <option value="hacking">Hacking Window</option>
                      <option value="review">Mentoring / Review Checkpoint</option>
                      <option value="food">Meal / Refreshment Break</option>
                      <option value="general">General / Fun Activity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Day Tag:</label>
                    <select
                      value={schDay}
                      onChange={(e) => setSchDay(parseInt(e.target.value) as 1 | 2)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value={1}>Day 1 (Kickoff)</option>
                      <option value={2}>Day 2 (Finale & Prize Distribution)</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block font-bold text-slate-300 mb-1">Description:</label>
                    <input
                      type="text"
                      value={schDesc}
                      onChange={(e) => setSchDesc(e.target.value)}
                      placeholder="Brief details for participants..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <button type="submit" className="md:col-span-3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg">
                    + Add Schedule Event
                  </button>
                </form>
              </div>

              {/* Schedule Timeline List */}
              <div className="space-y-4">
                {[1, 2].map((dayNum) => (
                  <div key={dayNum} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Day {dayNum} Timeline ({scheduleItems.filter(s => s.day === dayNum).length} Events)</h4>
                    <div className="space-y-2">
                      {scheduleItems.filter(s => s.day === dayNum).map((item) => (
                        <div key={item.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-cyan-300 font-bold text-xs">{item.time}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-950 text-teal-300 border border-teal-800 uppercase">{item.type}</span>
                            </div>
                            <div className="font-bold text-white text-sm">{item.title}</div>
                            {item.description && <div className="text-[11px] text-slate-400">{item.description}</div>}
                            {item.location && <div className="text-[10px] text-purple-300 font-mono">📍 {item.location}</div>}
                          </div>
                          <button onClick={() => handleDeleteSchedule(item.id)} className="px-3 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-[10px] font-bold self-start md:self-center">
                            Delete Event
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: COMMUNICATION CONTROL */}
          {activeTab === 'communication' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-400" /> Mass Email Communication & Dispatch Center
                </h3>
                <p className="text-xs text-slate-400">
                  Send targeted bulk email notifications, venue guides, or payment reminders to all hackers and mentors.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Compose & Dispatch Email Campaign</h4>
                  <form onSubmit={handleSendEmailCampaign} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Campaign Internal Title:</label>
                      <input
                        type="text"
                        value={emailTitle}
                        onChange={(e) => setEmailTitle(e.target.value)}
                        placeholder="e.g. Pre-Event Logistics & QR Pass Instructions"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Target Recipient Audience:</label>
                      <select
                        value={emailTarget}
                        onChange={(e) => setEmailTarget(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                      >
                        <option value="ALL_PARTICIPANTS">All Registered Participants ({allParticipants.length})</option>
                        <option value="TEAM_LEADERS">Team Leaders Only ({teams.length})</option>
                        <option value="CHECKED_IN">Checked-In Hackers Only</option>
                        <option value="UNVERIFIED_PAYMENTS">Pending Payment Receipts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Email Subject Line:</label>
                      <input
                        type="text"
                        required
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="[KS HACKNOVE 2026] Important Instructions for Tomorrow!"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Email Body Content (Markdown Supported):</label>
                      <textarea
                        rows={6}
                        required
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Dear Hacker,\n\nWelcome to KS HACKNOVE 2026! Please keep your QR Gate pass ready upon entry at KSSEM main hall..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Dispatch Bulk Email Campaign
                    </button>
                  </form>
                </div>

                {/* Campaign History */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Dispatched Email Campaigns ({emailCampaigns.length})</h4>
                  <div className="space-y-3">
                    {emailCampaigns.map((ec) => (
                      <div key={ec.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white">{ec.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">{ec.status}</span>
                        </div>
                        <div className="text-[11px] text-cyan-300">Subject: {ec.subject}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Target: <strong className="text-slate-200">{ec.targetGroup}</strong></span>
                          <span>Recipients: <strong className="text-purple-300">{ec.sentCount} emails</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FINANCE CONTROL */}
          {activeTab === 'finance' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> Payment & UTR Receipt Verification Control
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify UPI UTR transactions, approve team fees, and monitor revenue generation.
                  </p>
                </div>
                <button onClick={() => exportCSV(teams, 'KS_HACKNOVE_FINANCE')} className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export Financial Report
                </button>
              </div>

              {/* Finance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Total Verified Revenue</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{teams.filter(t => t.paymentStatus === 'Verified').reduce((sum, team) => sum + team.members.length * (cmsConfig.registrationFee || 250), 0)}
                  </div>
                  <p className="text-[10px] text-slate-500">{teams.filter(t => t.paymentStatus === 'Verified').length} Teams Verified</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Pending Receipts</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {teams.filter(t => t.paymentStatus === 'Pending' || !t.paymentStatus).length}
                  </div>
                  <p className="text-[10px] text-slate-500">Awaiting UTR audit</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Fee Rate Per Team</span>
                  <div className="text-2xl font-black text-cyan-300 font-mono">₹{cmsConfig.registrationFee || 250}</div>
                  <p className="text-[10px] text-slate-500">UPI VPA: {cmsConfig.upiId || 'kssem.hacknove@upi'}</p>
                </div>
              </div>

              {/* Team Payment Ledger Table */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Team Payment Audit Ledger ({teams.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Team ID & Name</th>
                        <th className="p-3">Leader Email</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">UTR Reference No</th>
                        <th className="p-3">Screenshot</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-sans">
                      {teams.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/50">
                          <td className="p-3 font-bold text-white">
                            <div>{t.teamName}</div>
                            <div className="font-mono text-[10px] text-cyan-400">{t.id}</div>
                          </td>
                          <td className="p-3 text-slate-300 text-[11px]">{t.leaderEmail}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">₹{t.members.length * (cmsConfig.registrationFee || 250)}</td>
                          <td className="p-3 font-mono text-amber-300 font-bold">{t.paymentUtr || 'N/A'}</td>
                          <td className="p-3">
                            {t.paymentScreenshot ? (
                              <button
                                type="button"
                                onClick={() => setScreenshotPreview(t.paymentScreenshot)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 font-bold text-[10px]"
                              >
                                View Proof
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[10px]">No proof</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.paymentStatus === 'Verified' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                              t.paymentStatus === 'Rejected' ? 'bg-red-950 text-red-400 border-red-800' :
                              'bg-amber-950 text-amber-300 border-amber-800'
                            }`}>
                              {t.paymentStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="p-3 flex items-center gap-2">
                            <button
                              onClick={() => handleVerifyUTR(t.id, 'Verified')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleVerifyUTR(t.id, 'Rejected')}
                              className="px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-[10px]"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Screenshot Preview Modal */}
              {screenshotPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn" onClick={() => setScreenshotPreview(null)}>
                  <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">Payment Proof Screenshot</h4>
                      <button type="button" onClick={() => setScreenshotPreview(null)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
                    </div>
                    <img src={screenshotPreview} alt="Payment Proof" className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-700 bg-slate-950" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" /> Automated Certificate Generator & Batch Release
                  </h3>
                  <p className="text-xs text-slate-400">
                    Generate cryptographically verifiable certificates with QR codes for participants, winners, and mentors.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider">Release Certificate Batch</h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Certificate Template Category:</label>
                      <select className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs">
                        <option value="participation">Official Certificate of Participation</option>
                        <option value="winner">Winner & Cash Prize Winner Certificate</option>
                        <option value="top10">Top 10 Finalist Distinction Certificate</option>
                        <option value="mentor">Mentor Appreciation Certificate</option>
                        <option value="judge">Jury Judge Service Certificate</option>
                      </select>
                    </div>

                    <button
                      onClick={handleIssueCertificates}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2"
                    >
                      <Award className="w-4 h-4" /> Issue Certificates to All Verified Participants
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Certificate Security Specifications</h4>
                  <div className="space-y-2 text-slate-300">
                    <div>✓ Embedded High-Resolution College Seals & Principal Signatures</div>
                    <div>✓ Verification URL: <span className="font-mono text-cyan-300">/verify-certificate?id=KSH-2026-XXXX</span></div>
                    <div>✓ Tamper-proof SHA256 Hash Verification</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & DEVICES */}
          {activeTab === 'security' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" /> Security, Rate Limits & Device Session Hardening
                </h3>
                <p className="text-xs text-slate-400">
                  Monitor admin active IP connections, session timeouts, and rate limiting thresholds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">Active Admin Sessions</h4>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="font-bold text-white flex justify-between">
                        <span>Super Admin Session (Current)</span>
                        <span className="text-emerald-400 font-mono">ACTIVE</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">IP: 192.168.1.104 • Browser: Chrome / Linux Cloud Run</div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider">System Rate Limits & DDoS Shield</h4>
                  <div className="space-y-2 text-slate-300">
                    <div>API Rate Limit: <strong className="text-white">100 requests / minute</strong></div>
                    <div>Gate Scanner Timeout: <strong className="text-white">500ms</strong></div>
                    <div>Audit Encryption: <strong className="text-emerald-400">AES-256 Enabled</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* FALLBACK FOR OTHER TABS */}
          {!['overview', 'participants', 'teams', 'cms', 'submissions', 'judging', 'checkin', 'announcements', 'roles', 'audit', 'emergency', 'registration-settings', 'rulebook', 'schedule', 'hospitality', 'communication', 'finance', 'certificates', 'security'].includes(activeTab) && (
            <div className="p-12 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center mx-auto">
                <Settings className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">{activeTab.replace('-', ' ')} Control Module Active</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All Super Admin parameters for this section are live-synchronized with the backend data store.
              </p>
            </div>
          )}

        </main>
      </div>

      {/* INSPECT PARTICIPANT PROFILE MODAL */}
      {selectedParticipantModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{selectedParticipantModal.fullName}</h3>
                <p className="text-xs font-mono text-cyan-400">{selectedParticipantModal.usn}</p>
              </div>
              <button onClick={() => setSelectedParticipantModal(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div><strong>College:</strong> {selectedParticipantModal.college}</div>
              <div><strong>Department:</strong> {selectedParticipantModal.department} (Sem {selectedParticipantModal.semester})</div>
              <div><strong>Email:</strong> {selectedParticipantModal.email}</div>
              <div><strong>Phone:</strong> {selectedParticipantModal.phone}</div>
              <div><strong>Emergency Contact:</strong> {selectedParticipantModal.emergencyContact}</div>
              <div><strong>Accommodation Required:</strong> {selectedParticipantModal.accommodationRequired ? 'YES' : 'NO'}</div>
              <div><strong>Gate Status:</strong> {selectedParticipantModal.checkedIn ? 'Checked-In ✓' : 'Not Checked-In'}</div>
            </div>

            <button
              onClick={() => setSelectedParticipantModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

      {/* SCORE OVERRIDE MODAL */}
      {scoreOverrideModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" /> Super Admin Score Manual Override
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Adjusted Total Score (Max 105):</label>
                <input
                  type="number"
                  value={scoreOverrideModal.currentScore}
                  onChange={(e) => setScoreOverrideModal({ ...scoreOverrideModal, currentScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-black text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mandatory Audit Reason (Immutable):</label>
                <textarea
                  rows={3}
                  required
                  value={scoreOverrideModal.reason}
                  onChange={(e) => setScoreOverrideModal({ ...scoreOverrideModal, reason: e.target.value })}
                  placeholder="State technical justification for override..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleScoreOverrideSubmit}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                Confirm Score Override
              </button>
              <button
                onClick={() => setScoreOverrideModal({ open: false, submissionId: '', currentScore: 0, reason: '' })}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordReset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">Portal Credentials</span>
                <h3 className="text-xl font-black text-white flex items-center gap-2 mt-1">
                  <Key className="w-5 h-5 text-purple-400" /> Reset Portal Password
                </h3>
              </div>
              {passwordReset.status !== 'loading' && (
                <button
                  onClick={() => setPasswordReset(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  aria-label="Close password reset dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="text-sm text-slate-300">
              <span className="font-bold text-white">{passwordReset.teamName}</span>
              <span className="text-slate-500"> ({passwordReset.teamId})</span>
            </div>

            {passwordReset.status === 'confirm' && (
              <>
                <p className="text-sm text-slate-300">Reset this team&apos;s portal password? Their current password will immediately stop working.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPasswordReset(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPortalPassword}
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold"
                  >
                    Reset Password
                  </button>
                </div>
              </>
            )}

            {passwordReset.status === 'loading' && (
              <div className="py-4 text-center text-sm text-purple-300 font-bold">Resetting password...</div>
            )}

            {passwordReset.status === 'success' && (
              <>
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 space-y-2">
                  <div className="text-sm font-black text-emerald-300">Password Reset Successful</div>
                  <div className="text-xs text-slate-400">New Portal Password:</div>
                  <div className="text-lg font-mono font-black tracking-wider text-white break-all">{passwordReset.password}</div>
                </div>
                <p className="text-xs text-slate-400">Give this password to the participant. It will not be shown again after this dialog is closed.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(passwordReset.password || '')}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5" /> Copy Password
                  </button>
                  <button
                    onClick={() => setPasswordReset(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {passwordReset.status === 'error' && (
              <>
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-700/60 text-sm text-red-300">{passwordReset.error}</div>
                <button
                  onClick={() => setPasswordReset({ teamId: passwordReset.teamId, teamName: passwordReset.teamName, status: 'confirm' })}
                  className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs font-bold"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {isEditTeamModalOpen && editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/50 w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Admin Team Control • {editingTeam.id}
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" /> Edit Registration Details
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditTeamModalOpen(false);
                  setEditingTeam(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTeam} className="space-y-5">
              {/* Core Team Info */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider font-mono">
                  1. Team & Track Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Team Name:</label>
                    <input
                      type="text"
                      required
                      value={editingTeam.teamName}
                      onChange={(e) => setEditingTeam({ ...editingTeam, teamName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Registration Status:</label>
                    <select
                      value={editingTeam.status}
                      onChange={(e) => setEditingTeam({ ...editingTeam, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500 outline-none"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Checked-In">Checked-In</option>
                      <option value="Waitlist">Waitlist</option>
                      <option value="Disqualified">Disqualified</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Track Domain:</label>
                    <select
                      value={editingTeam.preferredTrack}
                      onChange={(e) => setEditingTeam({ ...editingTeam, preferredTrack: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500 outline-none"
                    >
                      <option value="Artificial Intelligence & Machine Learning">Artificial Intelligence & Machine Learning</option>
                      <option value="Healthcare, Biotech & Assistive Tech">Healthcare, Biotech & Assistive Tech</option>
                      <option value="EdTech & Smart Campus Automation">EdTech & Smart Campus Automation</option>
                      <option value="AgriTech & Rural Empowerment">AgriTech & Rural Empowerment</option>
                      <option value="FinTech & Blockchain Ecosystems">FinTech & Blockchain Ecosystems</option>
                      <option value="Cybersecurity, Defense & Forensics">Cybersecurity, Defense & Forensics</option>
                      <option value="Smart Cities, IoT & Transportation">Smart Cities, IoT & Transportation</option>
                      <option value="CleanTech, Climate & Green Energy">CleanTech, Climate & Green Energy</option>
                      <option value="Open Innovation & Social Impact">Open Innovation & Social Impact</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Verification & UTR */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider font-mono">
                  2. Payment & Registration Slip Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Payment Status:</label>
                    <select
                      value={editingTeam.paymentStatus || 'Verified'}
                      onChange={(e) => setEditingTeam({ ...editingTeam, paymentStatus: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold focus:border-cyan-500 outline-none"
                    >
                      <option value="Verified">Verified (₹500 Received)</option>
                      <option value="Pending">Pending Verification</option>
                      <option value="Failed">Failed / Refunded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Transaction UTR / Ref No:</label>
                    <input
                      type="text"
                      value={editingTeam.paymentUtr || ''}
                      onChange={(e) => setEditingTeam({ ...editingTeam, paymentUtr: e.target.value })}
                      placeholder="e.g. UPI-938217349182"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Team Members List Editor */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider font-mono">
                    3. Team Members Roster ({editingTeam.members.length} Members)
                  </h4>
                  {editingTeam.members.length < 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newMem: Participant = {
                          id: `p-${Date.now()}-${editingTeam.members.length + 1}`,
                          fullName: `Member ${editingTeam.members.length + 1}`,
                          college: editingTeam.members[0]?.college || 'KSSEM',
                          department: 'CSE',
                          semester: '6th Semester',
                          email: '',
                          phone: '',
                          usn: '',
                          gender: 'Male',
                          role: 'Member',
                          teamId: editingTeam.id,
                          accommodationRequired: false,
                          emergencyContact: '',
                          checkedIn: false
                        };
                        setEditingTeam({
                          ...editingTeam,
                          members: [...editingTeam.members, newMem]
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {editingTeam.members.map((mem, idx) => (
                    <div key={mem.id || idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                          idx === 0 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {idx === 0 ? 'Team Leader' : `Member #${idx + 1}`}
                        </span>

                        {idx > 0 && editingTeam.members.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedMembers = editingTeam.members.filter((_, i) => i !== idx);
                              setEditingTeam({ ...editingTeam, members: updatedMembers });
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
                              const updated = [...editingTeam.members];
                              updated[idx] = { ...updated[idx], fullName: e.target.value };
                              setEditingTeam({ ...editingTeam, members: updated });
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
                              const updated = [...editingTeam.members];
                              updated[idx] = { ...updated[idx], usn: e.target.value };
                              setEditingTeam({ ...editingTeam, members: updated });
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
                              const updated = [...editingTeam.members];
                              updated[idx] = { ...updated[idx], email: e.target.value };
                              setEditingTeam({ ...editingTeam, members: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Phone Number:</label>
                          <input
                            type="text"
                            value={mem.phone}
                            onChange={(e) => {
                              const updated = [...editingTeam.members];
                              updated[idx] = { ...updated[idx], phone: e.target.value };
                              setEditingTeam({ ...editingTeam, members: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-400 mb-0.5">College / Institution:</label>
                          <input
                            type="text"
                            value={mem.college}
                            onChange={(e) => {
                              const updated = [...editingTeam.members];
                              updated[idx] = { ...updated[idx], college: e.target.value };
                              setEditingTeam({ ...editingTeam, members: updated });
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
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTeamModalOpen(false);
                    setEditingTeam(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <Save className="w-4 h-4" /> Save Team Updates Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY MODAL */}
      {emergencyModal.open && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-600/60 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Confirm Emergency Action
            </h3>

            <p className="text-xs text-slate-300">
              You are about to toggle <strong className="text-white uppercase">{emergencyModal.type}</strong> to <strong className="text-amber-400 uppercase">{emergencyModal.state ? 'ACTIVE / FROZEN' : 'RELEASED'}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mandatory Emergency Reason:</label>
              <textarea
                rows={3}
                required
                value={emergencyModal.reason}
                onChange={(e) => setEmergencyModal({ ...emergencyModal, reason: e.target.value })}
                placeholder="Explain the necessity for triggering emergency control..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleEmergencyTrigger}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg"
              >
                Execute Action
              </button>
              <button
                onClick={() => setEmergencyModal({ open: false, type: 'maintenance', state: true, reason: '' })}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { HACKATHON_TRACKS, COLLEGE_INFO } from '../data/mockData';
import { drawQRCode, gateQrDataUrl } from '../utils/qr';
import { printDocument } from '../utils/pdfGenerator';
import { Rocket, CheckCircle2, User, Users, Shield, FileText, ArrowRight, Download, Sparkles, Edit3, Save, Plus, Trash2, X, AlertTriangle, Check, CreditCard, RefreshCw, Mail, Eye, Upload, Image as ImageIcon, Scan, CheckCircle } from 'lucide-react';
import { PhonePeQRCode } from './PhonePeQRCode';
import confetti from 'canvas-confetti';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (team: any) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<any>(null);
  const [isEditingSlip, setIsEditingSlip] = useState(false);
  const [editSlipForm, setEditSlipForm] = useState<any>(null);
  const [slipSaveSuccess, setSlipSaveSuccess] = useState(false);

  // Payment Verification & Failure State
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [paymentVerifiedSuccess, setPaymentVerifiedSuccess] = useState(false);
  const [paymentFailError, setPaymentFailError] = useState<string | null>(null);
  const [showPaymentFailModal, setShowPaymentFailModal] = useState(false);

  // Automated Email State for All Team Members
  const [dispatchedRecipients, setDispatchedRecipients] = useState<string[]>([]);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  // Locally-generated confirmation email (.eml) so participants can download it.
  const [confirmationEmails, setConfirmationEmails] = useState<Array<{ recipient: string; eml: string }>>([]);
  // Actual email delivery result from the server — used to truthfully tell the
  // user whether the confirmation mail really reached inboxes (SMTP) or not.
  const [emailDispatchInfo, setEmailDispatchInfo] = useState<{
    delivered: number;
    failed: number;
    smtpConfigured: boolean;
    transport?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [qrReady, setQrReady] = useState(false);

  // Payment UTR Confirmation State (Double-Entry Verification)
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentUtrConfirm, setPaymentUtrConfirm] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Payment Screenshot & OCR Verification State
  const [paymentScreenshotData, setPaymentScreenshotData] = useState<string | null>(null);
  const [paymentScreenshotName, setPaymentScreenshotName] = useState<string>('');
  const [paymentScreenshotSize, setPaymentScreenshotSize] = useState<string>('');
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'scanning' | 'matched' | 'mismatch' | 'error'>('idle');
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrCandidateUtrs, setOcrCandidateUtrs] = useState<string[]>([]);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Guards against duplicate submissions (double-click)
  const submittingRef = useRef(false);
  const verifyingRef = useRef(false);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [preferredTrack, setPreferredTrack] = useState(HACKATHON_TRACKS[0].title);
  const [accommodationRequired, setAccommodationRequired] = useState(true);

  // Leader State (Member 1)
  const [leader, setLeader] = useState({
    fullName: '',
    college: '',
    department: 'Computer Science & Engineering',
    semester: '6th Semester',
    email: '',
    phone: '',
    usn: '',
    gender: 'Male',
    githubUrl: '',
    linkedinUrl: '',
    emergencyContact: ''
  });

  // Members State (Member 2, Member 3, Member 4)
  const [members, setMembers] = useState<Array<{ fullName: string; email: string; phone: string; usn: string; college: string }>>([
    { fullName: '', email: '', phone: '', usn: '', college: '' }
  ]);

  // Fresh start every time the modal is opened.
  const resetForm = () => {
    submittingRef.current = false;
    verifyingRef.current = false;
    setStep(1);
    setLoading(false);
    setPaymentVerifying(false);
    setPaymentVerifiedSuccess(false);
    setPaymentConfirmed(false);
    setPaymentFailError(null);
    setShowPaymentFailModal(false);
    setRegisteredTeam(null);
    setDispatchedRecipients([]);
    setShowEmailPreviewModal(false);
    setQrReady(false);
    setIsEditingSlip(false);
    setEditSlipForm(null);
    setSlipSaveSuccess(false);
    setTeamName('');
    setPreferredTrack(HACKATHON_TRACKS[0].title);
    setAccommodationRequired(true);
    setPaymentUtr('');
    setPaymentUtrConfirm('');
    setPaymentScreenshotData(null);
    setPaymentScreenshotName('');
    setPaymentScreenshotSize('');
    setOcrStatus('idle');
    setOcrMessage(null);
    setOcrCandidateUtrs([]);
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
    setLeader({
      fullName: '',
      college: '',
      department: 'Computer Science & Engineering',
      semester: '6th Semester',
      email: '',
      phone: '',
      usn: '',
      gender: 'Male',
      githubUrl: '',
      linkedinUrl: '',
      emergencyContact: ''
    });
    setMembers([{ fullName: '', email: '', phone: '', usn: '', college: '' }]);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetch('/api/registration-status')
        .then(res => res.json())
        .then(data => {
          if (data && (data.freezeRegistrations || !data.registrationOpen)) {
            setIsFrozen(true);
          } else {
            setIsFrozen(false);
          }
        })
        .catch(err => console.error("Failed checking registration status:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    let mounted = true;
    // Redraw the gate pass QR whenever the team changes OR the user returns from
    // editing the slip (the canvas is unmounted during edit mode, so it must be
    // re-rendered when the view comes back into focus).
    if (registeredTeam && canvasRef.current) {
      setQrReady(false);
      drawQRCode(canvasRef.current, registeredTeam.id, 220).then(() => {
        if (mounted) setQrReady(true);
      });
    }
    return () => { mounted = false; };
  }, [registeredTeam, isEditingSlip]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (members.length < 3) {
      setMembers([...members, { fullName: '', email: '', phone: '', usn: '', college: '' }]);
    }
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleUpdateMember = (index: number, field: string, val: string) => {
    const updated = [...members];
    (updated[index] as any)[field] = val;
    setMembers(updated);
  };

  const currentFeePerParticipant = 1;
  const activeMembers = members.filter(m => m.fullName && m.email);
  const participantCount = 1 + activeMembers.length;
  const currentTotalFee = participantCount * currentFeePerParticipant;

  const handleScreenshotChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('Image file size exceeds 15 MB. Please upload a smaller image.');
      return;
    }

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;
    setPaymentScreenshotName(file.name);
    setPaymentScreenshotSize(sizeStr);
    setOcrStatus('idle');
    setOcrMessage(null);
    setPaymentVerifiedSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPaymentScreenshotData(dataUrl);
      handleVerifyPaymentWithOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyPaymentWithOcr = async (overrideDataUrl?: string) => {
    const dataUrl = overrideDataUrl || paymentScreenshotData;
    if (!dataUrl) {
      alert('Please upload a payment screenshot first.');
      return;
    }

    setOcrStatus('scanning');
    setOcrMessage('Scanning receipt with AI OCR to match UTR...');
    setPaymentVerifying(true);

    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          paymentUtr: paymentUtr.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setOcrStatus('error');
        setOcrMessage(data.error || 'Failed to scan payment screenshot.');
        return;
      }

      setOcrCandidateUtrs(data.candidateUtrs || []);

      if (data.verified) {
        setOcrStatus('matched');
        const matched = data.matchedUtr || data.detectedUtr;
        setOcrMessage(data.message || `Screenshot verified! Matched UTR: ${matched}`);
        setPaymentVerifiedSuccess(true);
        if (!paymentUtr && data.detectedUtr) {
          setPaymentUtr(data.detectedUtr);
          setPaymentUtrConfirm(data.detectedUtr);
        }
      } else {
        setOcrStatus('mismatch');
        setOcrMessage(data.error || 'The entered UTR was not detected in the uploaded screenshot. Please check the receipt.');
        setPaymentVerifiedSuccess(false);
      }
    } catch (err: any) {
      console.error('OCR Verification error:', err);
      setOcrStatus('error');
      setOcrMessage(err.message || 'OCR verification service network error.');
    } finally {
      setPaymentVerifying(false);
    }
  };

  const handleSubmitRegistration = async () => {
    // Double-submission lock: prevents rapid double-clicks
    if (submittingRef.current || loading) return;

    const utr1 = paymentUtr.trim();
    const utr2 = paymentUtrConfirm.trim();

    if (!utr1 || !utr2) {
      setPaymentFailError("Please enter your UPI Transaction ID (UTR) twice to confirm payment.");
      setShowPaymentFailModal(true);
      return;
    }

    if (utr1.includes('@') || utr2.includes('@') || utr1.includes(' ') || utr2.includes(' ') || utr1.includes('\t') || utr2.includes('\t')) {
      setPaymentFailError("Invalid UTR format. Enter the transaction reference ID, not a UPI handle (e.g. name@bank) or email address.");
      setShowPaymentFailModal(true);
      return;
    }

    const utrPattern = /^[A-Za-z0-9]{12,30}$/;
    if (!utrPattern.test(utr1) || !utrPattern.test(utr2)) {
      setPaymentFailError("Invalid UTR format. The transaction ID must be 12 to 30 alphanumeric characters.");
      setShowPaymentFailModal(true);
      return;
    }

    if (utr1.toUpperCase() !== utr2.toUpperCase()) {
      setPaymentFailError("The two UPI Transaction IDs do not match. Please verify your transaction receipt and re-enter.");
      setShowPaymentFailModal(true);
      return;
    }

    if (!paymentScreenshotData) {
      setPaymentFailError("Please upload your payment receipt screenshot to complete verification.");
      setShowPaymentFailModal(true);
      return;
    }

    if (participantCount < 2 || participantCount > 4) {
      alert("A team must have between 2 and 4 participants (1 Leader + 1 to 3 Members). Please adjust team members in Step 3.");
      setStep(3);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setPaymentVerifying(true);
    setPaymentFailError(null);

    try {
      const idempotencyKey = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          teamName: teamName || 'Anvation Innovators',
          preferredTrack,
          accommodationRequired,
          leader,
          members: activeMembers,
          paymentUtr: utr1.toUpperCase(),
          paymentUtrConfirm: utr2.toUpperCase(),
          paymentScreenshot: paymentScreenshotData
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed. Please check your details and retry.");
      }

      if (data.team) {
        setRegisteredTeam(data.team);
        onSuccess(data.team);
        setPaymentConfirmed(true);
        setPaymentVerifiedSuccess(true);

        const allEmails = [
          leader.email,
          ...activeMembers.map(m => m.email).filter(Boolean)
        ];
        setDispatchedRecipients(data.emailRecipients || allEmails);

        if (data.delivery) {
          setEmailDispatchInfo({
            delivered: Number(data.delivery.deliveredCount) || 0,
            failed: Number(data.delivery.failedCount) || 0,
            smtpConfigured: data.delivery.smtpConfigured === true,
            transport: data.delivery.transport,
            message: data.delivery.message || (data.delivery.status === 'queued' ? 'Credential delivery queued for dispatch to participant inboxes.' : undefined),
            error: data.delivery.error
          });
        }

        setStep(5); // Go straight to confirmation slip!
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setPaymentFailError(err.message || 'An unexpected error occurred during registration.');
      setShowPaymentFailModal(true);
    } finally {
      setLoading(false);
      setPaymentVerifying(false);
      submittingRef.current = false;
    }
  };

  const handleStartEditSlip = () => {
    if (!registeredTeam) return;
    setEditSlipForm(JSON.parse(JSON.stringify(registeredTeam)));
    setIsEditingSlip(true);
    setSlipSaveSuccess(false);
  };

  // Download the locally-generated confirmation email (.eml) for a recipient.
  const downloadConfirmationEmail = (recipient: string, eml: string) => {
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ANVATION_2026_Registration_${recipient}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveEditSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlipForm || !registeredTeam) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/teams/${registeredTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSlipForm)
      });

      const data = await res.json();
      if (data.success && data.team) {
        setRegisteredTeam(data.team);
        onSuccess(data.team);
        setIsEditingSlip(false);
        setSlipSaveSuccess(true);
        setTimeout(() => setSlipSaveSuccess(false), 4000);
      } else {
        alert(data.error || "Failed to update registration slip");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating registration slip");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = async () => {
    if (!registeredTeam) return;
    const gateQrDataUrlStr = await gateQrDataUrl(registeredTeam.id, 220).catch(() => '');
    const participantCount = registeredTeam.members?.length || 1;
    const totalFee = participantCount * currentFeePerParticipant;
    const slipHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0b192c; font-family: sans-serif;">ANVATION 2026 PARTICIPANT REGISTRATION SLIP</h2>
        <div style="background: #0284c7; color: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-family: monospace; margin-right: 8px;">
          AUTO-ASSIGNED TEAM ID: ${registeredTeam.id}
        </div>
        <div style="background: #7e22ce; color: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-family: monospace;">
          ACCESS PASSWORD: ${registeredTeam.accessPassword || 'CODE2026#9841'}
        </div>
        <div style="background: #059669; color: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-family: monospace; margin-top: 8px;">
          VENUE ENTRY PASS: Gate scanner ready at KSSEM campus
        </div>
      </div>

      <table>
        <tr><th>Registration No</th><td>${registeredTeam.regNumber}</td></tr>
        <tr><th>Auto-Assigned Team ID</th><td><strong style="color: #0284c7; font-family: monospace;">${registeredTeam.id}</strong></td></tr>
        <tr><th>Portal Access Password</th><td><strong style="color: #7e22ce; font-family: monospace;">${registeredTeam.accessPassword || 'CODE2026#9841'}</strong></td></tr>
        <tr><th>Team Name</th><td><strong>${registeredTeam.teamName}</strong></td></tr>
        <tr><th>Preferred Track</th><td>${registeredTeam.preferredTrack}</td></tr>
        <tr><th>Payment UTR Ref</th><td>${registeredTeam.paymentUtr || 'Verified (PhonePe)'}</td></tr>
        <tr><th>Registration Fee</th><td>₹${totalFee} (₹${currentFeePerParticipant} × ${participantCount} participants)</td></tr>
        <tr><th>Member 1 (Leader)</th><td>${registeredTeam.members[0]?.fullName} (${registeredTeam.members[0]?.email})</td></tr>
        ${registeredTeam.members.slice(1).map((m: any, idx: number) => `
          <tr><th>Member ${idx + 2}</th><td>${m.fullName} (${m.usn || 'USN Provided'})</td></tr>
        `).join('')}
        <tr><th>Leader College</th><td>${registeredTeam.members[0]?.college || 'Not specified'}</td></tr>
        ${registeredTeam.members.slice(1).map((m: any, idx: number) => m.college ? `
          <tr><th>Member ${idx + 2} College</th><td>${m.college}</td></tr>
        ` : '').join('')}
        <tr><th>Accommodation</th><td>${registeredTeam.members[0]?.accommodationRequired ? 'Free On-Campus Stay Requested' : 'Local Day Scholar'}</td></tr>
      </table>

      <div style="margin-top: 15px; padding: 12px; border: 1px dashed #7e22ce; border-radius: 8px; background: #faf5ff; font-size: 12px; color: #581c87;">
        <strong>🔐 Dashboard Login Credentials:</strong> Use your <strong>Auto-Assigned Team ID (${registeredTeam.id})</strong> and <strong>Password (${registeredTeam.accessPassword || 'CODE2026#9841'})</strong> or Leader Email to login to the Participant Portal to submit projects and track live rounds.
      </div>

      <div class="qr-box">
        <h3 style="color: #0e7490; font-family: sans-serif; margin-bottom: 8px;">GATE ENTRY PASS QR</h3>
        ${gateQrDataUrlStr ? `<img src="${gateQrDataUrlStr}" alt="Gate Entry QR Pass" style="width: 220px; height: 220px; image-rendering: pixelated; border: 8px solid #ffffff; outline: 1px solid #cbd5e1;" />` : '<p>QR unavailable — show Team ID at the gate.</p>'}
        <p style="font-size: 12px; color: #475569;">Present this QR pass and college ID at the KSSEM Gate Check-in desk.</p>
      </div>
    `;

    printDocument(`CodeAThon_Registration_Slip_${registeredTeam.id}`, slipHtml);
  };

  // Directly downloads the Gate Entry Pass (QR + Team ID) as a PNG image file —
  // no print dialog needed, so the gate pass is always savable on the phone.
  const handleDownloadGatePass = async () => {
    if (!registeredTeam) return;
    const qr = await gateQrDataUrl(registeredTeam.id, 320).catch(() => '');
    const image = new Image();
    image.src = qr;
    image.onload = () => {
      const link = document.createElement('a');
      link.download = `ANVATION_2026_GatePass_${registeredTeam.id}.png`;
      link.href = qr;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    if (!qr) {
      alert('Could not generate the Gate Pass image. Show your Team ID at the gate (' + registeredTeam.id + ').');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b192c] border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Anvation Registration</h3>
              <p className="text-xs text-cyan-400 font-semibold">KSSEM Bengaluru • Dept. of CSE</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800">
            ✕
          </button>
        </div>

        {/* Registration Frozen Notification */}
        {isFrozen ? (
          <div className="p-8 text-center space-y-4 bg-slate-900/90 border border-amber-500/40 rounded-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Registrations Currently Frozen</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Registrations for KSSEM Anvation 2026 have been temporarily frozen by the Hackathon Organizing Committee. Please check back later or contact the admin team at <span className="text-cyan-400 font-mono">anvation2026@kssem.edu.in</span>.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            {/* Step Indicator */}
            {step < 5 && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 flex-wrap gap-y-1">
                <span className={`font-bold ${step >= 1 ? 'text-cyan-400' : ''}`}>1. Track</span>
                <span>→</span>
                <span className={`font-bold ${step >= 2 ? 'text-cyan-400' : ''}`}>2. Team Leader</span>
                <span>→</span>
                <span className={`font-bold ${step >= 3 ? 'text-cyan-400' : ''}`}>3. Members (2-4)</span>
                <span>→</span>
                <span className={`font-bold ${step >= 4 ? 'text-cyan-400' : ''}`}>4. PhonePe Fee (₹{currentTotalFee})</span>
              </div>
            )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Team Name (Required):</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. NeuralKnights"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                id="reg-team-name-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Accommodation Required on Campus?</label>
              <select
                value={accommodationRequired ? 'yes' : 'no'}
                onChange={(e) => setAccommodationRequired(e.target.value === 'yes')}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                id="reg-accommodation-select"
              >
                <option value="yes">Yes (Free Hostel Stay & Meals Provided)</option>
                <option value="no">No (Local Day Scholar)</option>
              </select>
            </div>

            <button
              disabled={!teamName.trim()}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2"
              id="reg-step1-next-btn"
            >
              <span>Next: Member 1 (Leader) Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2 - MEMBER 1 (LEADER) */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" /> Member 1 Details (Team Leader)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={leader.fullName}
                  onChange={(e) => setLeader({ ...leader, fullName: e.target.value })}
                  placeholder="Akash M"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  id="reg-leader-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">USN / Roll Number:</label>
                <input
                  type="text"
                  required
                  value={leader.usn}
                  onChange={(e) => setLeader({ ...leader, usn: e.target.value })}
                  placeholder="1KG23CS012"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  id="reg-leader-usn-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address:</label>
                <input
                  type="email"
                  required
                  value={leader.email}
                  onChange={(e) => setLeader({ ...leader, email: e.target.value })}
                  placeholder="akash@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  id="reg-leader-email-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number:</label>
                <input
                  type="text"
                  required
                  value={leader.phone}
                  onChange={(e) => setLeader({ ...leader, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  id="reg-leader-phone-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Department & Semester:</label>
                <input
                  type="text"
                  required
                  value={leader.department}
                  onChange={(e) => setLeader({ ...leader, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  id="reg-leader-dept-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">College Name:</label>
                <input
                  type="text"
                  value={leader.college}
                  onChange={(e) => setLeader({ ...leader, college: e.target.value })}
                  placeholder="College / Institute Name"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  id="reg-leader-college-input"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                id="reg-step2-back-btn"
              >
                Back
              </button>
              <button
                disabled={!leader.fullName || !leader.email || !leader.usn}
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                id="reg-step2-next-btn"
              >
                <span>Next: Add Members 2, 3 & 4</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - MEMBERS 2, 3, 4 */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Additional Team Members ({members.length}/3)
              </h4>
              {members.length < 3 && (
                <button
                  onClick={handleAddMember}
                  className="text-xs font-bold text-cyan-400 hover:underline"
                  id="reg-add-member-btn"
                >
                  + Add Member {members.length + 2}
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {members.map((mem, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-cyan-400">Member #{idx + 2}</span>
                    {members.length > 1 && (
                      <button onClick={() => handleRemoveMember(idx)} className="text-red-400 text-xs">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={mem.fullName}
                      onChange={(e) => handleUpdateMember(idx, 'fullName', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                    <input
                      type="text"
                      placeholder="USN Number"
                      value={mem.usn}
                      onChange={(e) => handleUpdateMember(idx, 'usn', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={mem.phone}
                      onChange={(e) => handleUpdateMember(idx, 'phone', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={mem.email}
                      onChange={(e) => handleUpdateMember(idx, 'email', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="College Name"
                      value={mem.college}
                      onChange={(e) => handleUpdateMember(idx, 'college', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Live Registration Fee Calculation */}
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
              <div className="text-xs text-slate-300 font-semibold">
                Registration Fee
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Auto-calculated</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-black text-xl">₹{currentTotalFee}</div>
                <div className="text-[10px] text-slate-400">₹{currentFeePerParticipant} × {participantCount} participant{participantCount > 1 ? 's' : ''}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2"
                id="reg-step3-next-btn"
              >
                <span>Proceed to PhonePe Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 - PHONEPE QR PAYMENT STEP */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">PhonePe Registration Payment (₹{currentTotalFee})</h4>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Payment Verification Required</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* PhonePe QR Component - EXACT UNALTERED QR */}
              <div>
                <PhonePeQRCode
                  upiId="kgsoumya1605@okicici"
                  amount={String((1 + members.filter(m => m.fullName && m.email).length) * currentFeePerParticipant)}
                  size={190}
                />
              </div>

              {/* UTR Input Form & Instant Verification */}
              <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30">
                <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white">Beneficiary: <span className="text-indigo-400">KSSEM Anvation 2026 Desk</span></div>
                  <div>UPI ID: <span className="font-mono text-indigo-300">kgsoumya1605@okicici</span></div>
                  <div>Registration Fee: <span className="text-emerald-400 font-bold">₹{currentFeePerParticipant} per participant · ₹{currentTotalFee} total ({participantCount} participants)</span></div>
                </div>

                {/* Transaction ID Field 1 */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    UPI Transaction ID / UTR <span className="text-red-400 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={paymentUtr}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setPaymentUtr(val);
                      if (paymentVerifiedSuccess) setPaymentVerifiedSuccess(false);
                      if (paymentConfirmed) setPaymentConfirmed(false);
                    }}
                    placeholder="e.g. 434511786564 or UPI1234567890"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm tracking-wider focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    id="reg-payment-utr-input"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Enter the transaction ID/reference number shown in your successful UPI payment confirmation. Do not enter the UPI ID such as <code className="text-indigo-300">name@bank</code> or an email address.
                  </p>
                </div>

                {/* Transaction ID Field 2 (Confirm) */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Confirm UPI Transaction ID / UTR <span className="text-red-400 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={paymentUtrConfirm}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setPaymentUtrConfirm(val);
                      if (paymentVerifiedSuccess) setPaymentVerifiedSuccess(false);
                      if (paymentConfirmed) setPaymentConfirmed(false);
                    }}
                    placeholder="Re-enter exact UPI Transaction ID / UTR"
                    className={`w-full px-3 py-2.5 rounded-xl bg-slate-950 border text-white font-mono text-sm tracking-wider focus:ring-1 ${
                      paymentUtr && paymentUtrConfirm && paymentUtr.toUpperCase() !== paymentUtrConfirm.toUpperCase()
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : paymentUtr && paymentUtrConfirm && paymentUtr.toUpperCase() === paymentUtrConfirm.toUpperCase()
                        ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500'
                        : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    id="reg-payment-utr-confirm-input"
                  />
                  {paymentUtr && paymentUtrConfirm && paymentUtr.toUpperCase() !== paymentUtrConfirm.toUpperCase() && (
                    <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 inline" /> Transaction IDs do not match. Please verify and enter identical values.
                    </p>
                  )}
                  {paymentUtr && paymentUtrConfirm && paymentUtr.toUpperCase() === paymentUtrConfirm.toUpperCase() && (
                    <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 inline" /> Transaction IDs match.
                    </p>
                  )}
                </div>

                {/* Screenshot Upload & OCR Section */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Payment Screenshot Proof <span className="text-red-400 font-black">*</span></span>
                    </label>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                      OCR Verification
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={screenshotInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleScreenshotChange(e.target.files[0]);
                      }
                    }}
                  />

                  {!paymentScreenshotData ? (
                    <div
                      onClick={() => screenshotInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 rounded-xl p-3 text-center cursor-pointer transition-all space-y-1.5 group"
                    >
                      <div className="w-8 h-8 mx-auto rounded-full bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-white">Click to upload PhonePe / GPay / Paytm receipt</div>
                      <p className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 15MB • Automatic OCR matching</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-indigo-500/30">
                        <img
                          src={paymentScreenshotData}
                          alt="Payment Receipt"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-700 bg-black shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{paymentScreenshotName || 'payment_receipt.jpg'}</div>
                          <div className="text-[10px] text-slate-400">{paymentScreenshotSize || 'Attached'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => screenshotInputRef.current?.click()}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                            >
                              Change
                            </button>
                            <span className="text-slate-600">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentScreenshotData(null);
                                setPaymentScreenshotName('');
                                setPaymentScreenshotSize('');
                                setOcrStatus('idle');
                                setOcrMessage(null);
                                setOcrCandidateUtrs([]);
                                if (screenshotInputRef.current) screenshotInputRef.current.value = '';
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {ocrStatus !== 'scanning' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyPaymentWithOcr()}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-indigo-600 text-[10px] font-bold shrink-0 flex items-center gap-1"
                          >
                            <Scan className="w-3 h-3" />
                            <span>Scan OCR</span>
                          </button>
                        )}
                      </div>

                      {/* OCR Status Messages */}
                      {ocrStatus === 'scanning' && (
                        <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Scanning receipt with AI OCR to verify UTR...</span>
                        </div>
                      )}

                      {ocrStatus === 'matched' && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="leading-tight">
                            <div className="font-bold">OCR Receipt Verified!</div>
                            <div className="text-[10px] text-emerald-200/80">{ocrMessage}</div>
                          </div>
                        </div>
                      )}

                      {ocrStatus === 'mismatch' && (
                        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-300 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-bold text-[11px]">UTR Mismatch / Unverified</span>
                          </div>
                          <p className="text-[10px] text-amber-200/90 leading-relaxed">{ocrMessage}</p>
                          {ocrCandidateUtrs.length > 0 && (
                            <div className="pt-1 border-t border-amber-800/40">
                              <span className="text-[10px] text-amber-300 font-bold block mb-1">Detected references in receipt:</span>
                              <div className="flex flex-wrap gap-1">
                                {ocrCandidateUtrs.map((cand, ci) => (
                                  <button
                                    key={ci}
                                    type="button"
                                    onClick={() => {
                                      setPaymentUtr(cand);
                                      setPaymentUtrConfirm(cand);
                                      handleVerifyPaymentWithOcr();
                                    }}
                                    className="px-2 py-0.5 rounded bg-amber-900/70 hover:bg-amber-800 border border-amber-600 text-[10px] font-mono font-bold text-amber-100"
                                  >
                                    Use {cand}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {ocrStatus === 'error' && (
                        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="text-[10px]">{ocrMessage}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                Back
              </button>
              <button
                disabled={loading || !paymentScreenshotData || !paymentUtr || !paymentUtrConfirm || paymentUtr.toUpperCase() !== paymentUtrConfirm.toUpperCase()}
                onClick={() => handleSubmitRegistration()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                id="reg-step4-next-btn"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Finalizing Registration & Persisting Backup...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Payment & Complete Registration</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 - SUCCESS & PASS */}
        {step === 5 && registeredTeam && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Registration Confirmed!</h3>
              <p className="text-xs text-slate-300 mt-1">Welcome to Anvation 2026 at KSSEM Bengaluru.</p>
            </div>

            {/* EMAIL DISPATCH STATUS BANNER — shows the REAL delivery outcome.
                When SMTP is configured & mails are actually sent this shows
                "Delivered". Otherwise it honestly tells the user the mail was
                NOT delivered to inboxes (only a downloadable .eml was produced). */}
            {(() => {
              const delivered = emailDispatchInfo?.delivered ?? 0;
              const failed = emailDispatchInfo?.failed ?? 0;
              const smtpConfigured = emailDispatchInfo?.smtpConfigured === true;
              const actuallySent = delivered > 0;
              const headerText = actuallySent
                ? `Confirmation email Delivered to ${delivered} participant${delivered === 1 ? '' : 's'}`
                : (smtpConfigured ? 'Email delivery FAILED — not sent' : 'Confirmation email NOT delivered to inbox');
              const statusBadge = actuallySent
                ? <span className="bg-emerald-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded font-black uppercase">Delivered</span>
                : (smtpConfigured
                    ? <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.2 rounded font-black uppercase">Failed {failed}</span>
                    : <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded font-black uppercase">Not configured</span>);
              return (
                <div className={`p-4 rounded-2xl text-left space-y-2.5 shadow-lg border ${actuallySent ? 'bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-cyan-950/80 border-emerald-500/50' : (smtpConfigured ? 'bg-rose-950/40 border-rose-500/50' : 'bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-purple-950/80 border-cyan-500/50')}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${actuallySent ? 'bg-emerald-900/60 border-emerald-500/50' : (smtpConfigured ? 'bg-rose-900/60 border-rose-500/50' : 'bg-cyan-900/60 border-cyan-500/50')} border flex items-center justify-center shrink-0 ${actuallySent ? 'text-emerald-300' : (smtpConfigured ? 'text-rose-300' : 'text-cyan-300')}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{headerText}</span>
                          {statusBadge}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {actuallySent
                            ? `The confirmation mail (with Gate Pass QR) was sent to your inbox. A copy is also available to download below.`
                            : (smtpConfigured
                                ? `Emails could NOT be sent — the SMTP account/app password is invalid. Use the Download below as proof of registration at the gate.`
                                : `Your confirmation mail was NOT sent to your inbox (SMTP not configured). Please download the .eml below / use the Gate Pass QR on this page at the venue.`)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmailPreviewModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-xs font-bold border border-cyan-600 flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow"
                      id="view-email-preview-btn"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Email</span>
                    </button>
                  </div>

                  {emailDispatchInfo?.message && (
                    <div className={`text-[10px] leading-relaxed px-2.5 py-1.5 rounded-lg border ${actuallySent ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200' : (smtpConfigured ? 'bg-rose-950/50 border-rose-800 text-rose-200' : 'bg-slate-950/60 border-slate-700 text-slate-300')}`}>
                      {emailDispatchInfo.message}
                    </div>
                  )}

                  {/* List of Recipient Emails with per-recipient .eml download */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/40 text-[11px]">
                    {registeredTeam.members.map((m: any, idx: number) => {
                      const emailItem = confirmationEmails.find(c => c.recipient === m.email);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="text-slate-300 font-mono truncate mr-2">{m.email}</span>
                          <button
                            type="button"
                            onClick={() => emailItem && downloadConfirmationEmail(m.email, emailItem.eml)}
                            disabled={!emailItem}
                            className="text-emerald-400 font-bold text-[10px] shrink-0 hover:text-emerald-300 disabled:opacity-50 disabled:hover:text-emerald-400 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> {emailItem ? 'Download .eml' : 'Pending'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {slipSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold animate-fadeIn">
                ✓ Registration slip details updated and synchronized with backend database!
              </div>
            )}

            {!isEditingSlip ? (
              /* SLIP VIEW MODE */
              <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-left space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider font-mono">⚡ AUTO-ASSIGNED TEAM ID</span>
                    <span className="text-2xl font-black text-cyan-400 font-mono tracking-tight">{registeredTeam.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartEditSlip}
                      className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                      id="edit-reg-slip-btn"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Slip Details</span>
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">REG NO</span>
                      <span className="text-sm font-bold text-amber-400 font-mono">{registeredTeam.regNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Secure Portal Access Credentials Card */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="font-mono font-bold text-purple-300 uppercase tracking-wider text-[10px]">
                        PORTAL ACCESS CREDENTIALS
                      </span>
                    </div>
                    <div className="mt-1 space-x-2">
                      <span className="text-slate-300">Team ID: <strong className="text-cyan-300 font-mono">{registeredTeam.id}</strong></span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">Password: <strong className="text-purple-300 font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700">{registeredTeam.accessPassword || 'CODE2026#9841'}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Use this Password to sign in to the Participant Dashboard & submit projects.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Team ID: ${registeredTeam.id}\nPassword: ${registeredTeam.accessPassword || 'CODE2026#9841'}\nLeader Email: ${registeredTeam.leaderEmail}`);
                      alert("Credentials copied to clipboard!");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-900 hover:bg-purple-800 text-purple-200 text-xs font-bold font-mono shrink-0 border border-purple-600"
                  >
                    Copy Credentials
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  <div><strong className="text-slate-400">Team Name:</strong> <span className="text-white font-bold">{registeredTeam.teamName}</span></div>
                  <div><strong className="text-slate-400">Track:</strong> <span className="text-purple-300 font-bold">{registeredTeam.preferredTrack}</span></div>
                  <div><strong className="text-slate-400">Leader:</strong> <span className="text-white">{registeredTeam.members[0]?.fullName}</span> ({registeredTeam.members[0]?.usn})</div>
                  <div><strong className="text-slate-400">Payment UTR:</strong> <span className="text-emerald-400 font-mono font-bold">{registeredTeam.paymentUtr || paymentUtr}</span></div>
                  <div className="col-span-1 sm:col-span-2"><strong className="text-slate-400">College:</strong> {registeredTeam.members[0]?.college}</div>
                  <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-800/80">
                    <strong className="text-slate-400 block mb-1">Registered Hacker(s):</strong>
                    <div className="space-y-1">
                      {registeredTeam.members.map((m: any, i: number) => (
                        <div key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-[11px] bg-slate-950/60 px-2 py-1 rounded-lg">
                          <span>{i === 0 ? '👑 Leader' : `Member ${i+1}`}: <strong className="text-white">{m.fullName}</strong> ({m.usn})</span>
                          <span className="text-slate-400 font-mono">{m.email}</span>
                          <span className="text-slate-500 w-full sm:w-auto">🏫 {m.college || 'Not specified'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generated QR Canvas */}
                <div className="pt-2 text-center border-t border-slate-800/80">
                  <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-950/20 px-3 py-2 text-left">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Gate Entry Pass QR</div>
                    <div className="text-[11px] text-slate-300">Show this QR code at the KSSEM entrance gate. It is also included in the printable pass.</div>
                  </div>
                  <canvas ref={canvasRef} className="mx-auto rounded-xl border border-slate-700 shadow-md" />
                  <span className="text-[10px] text-slate-400 block mt-1">{qrReady ? 'Ready to scan at KSSEM Venue Check-in Gate' : 'Generating secure gate pass QR...'}</span>

                  {/* Direct Gate Pass PNG download — always available & visible */}
                  <button
                    type="button"
                    onClick={handleDownloadGatePass}
                    disabled={!qrReady}
                    className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                    id="reg-download-gatepass-btn"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Gate Pass (Save on your phone)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SLIP EDIT MODE */
              <form onSubmit={handleSaveEditSlip} className="p-5 rounded-2xl bg-slate-900 border border-amber-500/50 text-left space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Edit Registration Slip Details
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingSlip(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-0.5">Team Name:</label>
                      <input
                        type="text"
                        required
                        value={editSlipForm.teamName}
                        onChange={(e) => setEditSlipForm({ ...editSlipForm, teamName: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-0.5">Payment UTR Ref:</label>
                      <input
                        type="text"
                        value={editSlipForm.paymentUtr || ''}
                        onChange={(e) => setEditSlipForm({ ...editSlipForm, paymentUtr: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-300 mb-0.5">Preferred Track:</label>
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm">
                        {editSlipForm.preferredTrack}
                      </div>
                    </div>
                  </div>

                  {/* Edit Members */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-300 uppercase">Team Members List:</label>
                    {editSlipForm.members.map((mem: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400">
                          {idx === 0 ? 'Leader / Member 1' : `Member #${idx + 1}`}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={mem.fullName}
                            onChange={(e) => {
                              const updated = [...editSlipForm.members];
                              updated[idx].fullName = e.target.value;
                              setEditSlipForm({ ...editSlipForm, members: updated });
                            }}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="USN"
                            value={mem.usn}
                            onChange={(e) => {
                              const updated = [...editSlipForm.members];
                              updated[idx].usn = e.target.value;
                              setEditSlipForm({ ...editSlipForm, members: updated });
                            }}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={mem.email}
                            onChange={(e) => {
                              const updated = [...editSlipForm.members];
                              updated[idx].email = e.target.value;
                              setEditSlipForm({ ...editSlipForm, members: updated });
                            }}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingSlip(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? 'Saving...' : 'Save & Update Slip'}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handlePrintSlip}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                id="reg-download-slip-btn"
              >
                <Download className="w-4 h-4" />
                <span>Download / Print Registration Slip</span>
              </button>

              <button
                onClick={onClose}
                className="py-3 px-6 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                id="reg-done-btn"
              >
                Done
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* PAYMENT FAILURE POPUP MODAL */}
      {showPaymentFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-left relative">
            <button
              onClick={() => setShowPaymentFailModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Payment Verification Failed</h3>
                <span className="text-[11px] text-red-400 font-mono font-bold">TRANSACTION_NOT_CONFIRMED</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-2">
              <p className="font-semibold text-white">
                {paymentFailError || "We could not verify this transaction reference on the PhonePe / UPI banking switch."}
              </p>
              <p className="text-[11px] text-slate-300">
                Please check the following and retry:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                <li>Ensure the PhonePe payment of <strong>₹{currentFeePerParticipant} per participant</strong> was completed to <strong>kgsoumya1605@okicici</strong>.</li>
                <li>Verify you entered all <strong>12 digits</strong> of the UTR correctly (e.g. 428901239812).</li>
                <li>If payment was debited from your bank account, please wait 30 seconds and click Retry.</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              Need immediate help? Contact coordinators:
              <div className="mt-1 font-mono text-cyan-300 font-bold">
                Bhaskar S: +91 9663949447 | Dr. Sivasubramanyam: +91 8309763125
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentFailModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all"
                id="retry-payment-modal-btn"
              >
                Re-enter UTR & Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCHED EMAIL PREVIEW MODAL */}
      {showEmailPreviewModal && registeredTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.4)] text-left relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEmailPreviewModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Dispatched Email Confirmation</h3>
                <div className="text-[11px] text-slate-400">
                  Recipient: <strong className="text-cyan-300 font-mono">{registeredTeam.leaderEmail}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs text-slate-300 font-mono">
              <div className="text-slate-400 text-[11px] border-b border-slate-800 pb-2">
                <strong>Subject:</strong> [CONFIRMED] Anvation 2026 Registration — Team {registeredTeam.id}
              </div>

              <div className="space-y-2 text-slate-200">
                <p>Dear <strong>{registeredTeam.members[0]?.fullName || 'Participant'}</strong>,</p>
                <p>
                  Congratulations! Your team <strong>"{registeredTeam.teamName}"</strong> has been successfully registered for <strong>Anvation 2026</strong> at K.S. School of Engineering and Management (KSSEM), Bengaluru!
                </p>

                <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 space-y-1 my-2">
                  <div className="text-cyan-300 font-bold">⚡ AUTO-ASSIGNED CREDENTIALS:</div>
                  <div>Team ID: <strong className="text-white font-bold">{registeredTeam.id}</strong></div>
                  <div>Registration No: <strong className="text-amber-300">{registeredTeam.regNumber}</strong></div>
                  <div>Portal Password: <strong className="text-purple-300 bg-purple-900/80 px-1.5 py-0.5 rounded">{registeredTeam.accessPassword || 'CODE2026#9841'}</strong></div>
                  <div>Chosen Track: <strong className="text-cyan-200">{registeredTeam.preferredTrack}</strong></div>
                  <div>Payment UTR: <strong className="text-emerald-300">{registeredTeam.paymentUtr || paymentUtr}</strong></div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Venue: KSSEM Campus, #15, Mallasandra, Off Kanakapura Road, Bengaluru - 560109.<br/>
                  Dates: March 27-28, 2026 (24-Hour In-Person Hackathon).
                </p>
                <p className="text-[11px] text-slate-400">
                  Please bring your College ID and this confirmation slip at registration desk check-in.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(false)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

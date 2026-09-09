import React, { useState, useEffect, useRef } from 'react';
import { HACKATHON_TRACKS, COLLEGE_INFO } from '../data/mockData';
import { drawQRCode, gateQrDataUrl } from '../utils/qr';
import { printDocument } from '../utils/pdfGenerator';
import { Rocket, CheckCircle2, User, Users, Shield, FileText, ArrowRight, Download, Sparkles, Edit3, Save, Plus, Trash2, X, AlertTriangle, Check, CreditCard, RefreshCw, Mail, Eye } from 'lucide-react';
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

  // Payment proof screenshot upload — previewed on-screen and persisted to the
  // team's paymentScreenshot (base64 data URL) via /api/register.
  const [paymentScreenshotData, setPaymentScreenshotData] = useState<string | null>(null);
  const [paymentScreenshotName, setPaymentScreenshotName] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Guards against duplicate submissions (double-click or payment auto-fire)
  // so two concurrent/clustered registrations never create the same team twice.
  const submittingRef = useRef(false);
  const verifyingRef = useRef(false);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [preferredTrack, setPreferredTrack] = useState(HACKATHON_TRACKS[0].title);
  const [accommodationRequired, setAccommodationRequired] = useState(true);
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

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

  // Members State (1 to 3 additional members: Members 2, 3, 4)
  const createDefaultMembers = () => [
    { fullName: '', email: '', phone: '', usn: '', college: '', gender: 'Male' }
  ];

  const [members, setMembers] = useState<Array<{ fullName: string; email: string; phone: string; usn: string; college: string; gender: string }>>(
    createDefaultMembers()
  );

  const handleAddMember = () => {
    if (members.length < 3) {
      setMembers([...members, { fullName: '', email: '', phone: '', usn: '', college: '', gender: 'Male' }]);
    }
  };

  const handleRemoveMember = (idx: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== idx));
    }
  };

  // Fresh start every time the modal is opened. Clears any previously shown
  // registration slip (and leftover form data) so it never reappears when the
  // modal is reopened for a new registration.
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
    setPaymentScreenshotData(null);
    setPaymentScreenshotName('');
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
    setMembers(createDefaultMembers());
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

  const handleUpdateMember = (index: number, field: string, val: string) => {
    const updated = [...members];
    (updated[index] as any)[field] = val;
    setMembers(updated);
  };

  // Read an uploaded payment screenshot as a base64 data URL, validate it is an
  // image, and preview it so the participant can confirm before submitting.
  const handlePaymentScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.) as payment proof.');
      return;
    }
    const maxBytes = 8 * 1024 * 1024; // 8 MB safety cap for the base64 payload
    if (file.size > maxBytes) {
      alert('Screenshot too large. Please upload an image under 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentScreenshotData(String(reader.result));
      setPaymentScreenshotName(file.name);
    };
    reader.onerror = () => alert('Could not read the file. Please try again.');
    reader.readAsDataURL(file);
  };

  const currentFeePerParticipant = 1;
  const currentParticipantCount = 1 + members.length;
  const currentTotalFee = currentParticipantCount * currentFeePerParticipant;

  const isLeaderValid = Boolean(
    leader.fullName.trim() &&
    leader.email.trim() &&
    leader.usn.trim()
  );

  const areAllMembersFilled = members.length >= 1 && members.length <= 3 && members.every(m =>
    Boolean(m.fullName.trim() && m.email.trim() && m.usn.trim())
  );

  // Email and USN uniqueness check
  const allParticipantEmails = [leader.email.trim().toLowerCase(), ...members.map(m => m.email.trim().toLowerCase())].filter(Boolean);
  const allParticipantUsns = [leader.usn.trim().toUpperCase(), ...members.map(m => m.usn.trim().toUpperCase())].filter(Boolean);
  const hasDuplicateEmail = new Set(allParticipantEmails).size !== allParticipantEmails.length;
  const hasDuplicateUsn = new Set(allParticipantUsns).size !== allParticipantUsns.length;

  const isStep3Valid = isLeaderValid && areAllMembersFilled && !hasDuplicateEmail && !hasDuplicateUsn;

  const handleSubmitRegistration = async (confirmedUtr?: string) => {
    // Double-submission lock: prevents rapid double-clicks or the 500ms
    // payment auto-fire from registering the same team twice concurrently.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      // UTR is mandatory — registration must never proceed without a real,
      // verified payment transaction reference.
      const finalUtr = (confirmedUtr || paymentUtr || '').trim();
      if (finalUtr.length < 12) {
        submittingRef.current = false;
        setLoading(false);
        setPaymentVerifying(false);
        setPaymentFailError("Payment is required. Please complete the registration fee payment and enter your UTR before registering.");
        setShowPaymentFailModal(true);
        return;
      }
      // Screenshot is MANDATORY — registration (which records/takes the payment)
      // must never proceed without an uploaded payment screenshot for the admin
      // desk to verify against.
      if (!paymentScreenshotData) {
        submittingRef.current = false;
        setLoading(false);
        setPaymentVerifying(false);
        setPaymentFailError("Payment screenshot is required. Please upload a screenshot of your successful PhonePe transaction before registering.");
        setShowPaymentFailModal(true);
        return;
      }

      // Check team completeness
      if (members.length < 1 || members.length > 3 || !areAllMembersFilled) {
        submittingRef.current = false;
        setLoading(false);
        setPaymentVerifying(false);
        setPaymentFailError("All team members (2 to 4 participants total) must have full details completed before registration.");
        setShowPaymentFailModal(true);
        return;
      }

      const totalFee = currentTotalFee;
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName || 'Anvation Innovators',
          preferredTrack,
          accommodationRequired,
          leader,
          members,
          paymentUtr: finalUtr,
          paymentAmount: totalFee,
          paymentScreenshot: paymentScreenshotData || null
        })
      });

      const data = await res.json();
      if (data.success && data.team) {
        setRegisteredTeam(data.team);
        onSuccess(data.team);

        // Gather all participant emails
        const allEmails = [
          leader.email,
          ...members.map(m => m.email).filter(Boolean)
        ];
        setDispatchedRecipients(data.emailRecipients || allEmails);

        // Direct Email Notification Dispatch to all participant emails (fully
        // local — generates a downloadable .eml, no external API).
        try {
          const emailRes = await fetch('/api/send-registration-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teamId: data.team.id,
              emails: allEmails,
              teamName: data.team.teamName,
              track: data.team.preferredTrack,
              password: data.team.accessPassword,
              regNumber: data.team.regNumber,
              participants: [
                { email: leader.email, name: leader.fullName, college: leader.college, role: 'Leader' },
                ...members.map(m => ({ email: m.email, name: m.fullName, college: m.college, role: 'Member' }))
              ].filter(p => p.email)
            })
          });
          const emailData = await emailRes.json();
          // Record the real delivery outcome so the success screen can show
          // truthfully whether emails were actually sent (SMTP OK) or not.
          setEmailDispatchInfo({
            delivered: Number(emailData.deliveredCount) || 0,
            failed: Number(emailData.failedCount) || 0,
            smtpConfigured: emailData.smtpConfigured === true,
            transport: emailData.transport,
            message: emailData.gatewayMessage || emailData.message,
            error: emailData.smtpError || emailData.error
          });
          if (emailData.success && emailData.eml) {
            const emailsReady = allEmails.map(recipient => ({ recipient, eml: emailData.eml }));
            setConfirmationEmails(emailsReady);
            if (emailData.emailRecipients) {
              setDispatchedRecipients(emailData.emailRecipients.map((r: any) => r.recipient));
            }
          }
        } catch (mailErr) {
          console.error("Email generation warning:", mailErr);
        }

        setStep(5); // Go straight to confirmation slip!
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } else {
        setPaymentFailError(data.error || "Registration could not be completed.");
        setShowPaymentFailModal(true);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setPaymentFailError("Network error during registration. Please try again.");
      setShowPaymentFailModal(true);
    } finally {
      setLoading(false);
      setPaymentVerifying(false);
      submittingRef.current = false;
      verifyingRef.current = false;
    }
  };

  // Payment Verification Handler with Automatic Progression directly to Completed Slip
  const handleVerifyPayment = async (customUtr?: string) => {
    if (verifyingRef.current || submittingRef.current) return;

    // Payment screenshot is MANDATORY. Verification — and therefore the actual
    // payment being taken / marked verified — must not happen without proof of
    // the successful PhonePe transaction being uploaded first.
    if (!paymentScreenshotData) {
      setPaymentVerifying(false);
      setPaymentFailError("Payment screenshot is required. Please upload a screenshot of your successful PhonePe transaction before verifying your payment.");
      setShowPaymentFailModal(true);
      return;
    }

    const utrToVerify = (customUtr || paymentUtr || '').trim();
    const totalFee = currentTotalFee;
    const validUtrPattern = /^[A-Z0-9]{12,22}$/i;

    if (!utrToVerify || !validUtrPattern.test(utrToVerify)) {
      setPaymentVerifying(false);
      setPaymentFailError("Enter the actual 12+ digit phonepe/UPI transaction reference from your payment receipt (letters/numbers only).");
      setShowPaymentFailModal(true);
      return;
    }

    verifyingRef.current = true;
    setPaymentVerifying(true);
    setPaymentFailError(null);

    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utr: utrToVerify,
          amount: String(totalFee),
          paymentScreenshot: paymentScreenshotData
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Payment verification service returned HTTP ${res.status}.`);
      }

      if (data.success && data.verified) {
        const verifiedUtr = data.utr || utrToVerify;
        setPaymentUtr(verifiedUtr);
        setPaymentVerifiedSuccess(true);
        setPaymentConfirmed(true);
        
        // Auto-finalize team registration only AFTER successful payment verification.
        setTimeout(() => {
          handleSubmitRegistration(verifiedUtr);
        }, 500);
      } else {
        setPaymentFailError(data.error || "Payment verification failed: Transaction reference not found on UPI settlement network.");
        setShowPaymentFailModal(true);
        setPaymentVerifiedSuccess(false);
        setPaymentVerifying(false);
        verifyingRef.current = false;
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : '';
      const isNetworkFailure = err instanceof TypeError || !message;
      setPaymentFailError(
        isNetworkFailure
          ? "Payment verification service is unreachable. Please check your connection and retry. Your UTR and screenshot are still in this form."
          : `Payment verification failed: ${message}`
      );
      setShowPaymentFailModal(true);
      setPaymentVerifying(false);
      verifyingRef.current = false;
    }
  };

  // "I HAVE PAID" — same strict verification as above. It never fabricates a UTR:
  // the participant must have entered a real UTR.
  const handleAutoDetectPayment = () => {
    handleVerifyPayment(paymentUtr);
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

            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Team Composition Rule: 2 to 4 Members</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Every registered team must consist of <strong>1 Leader + 1 to 3 Additional Members</strong> (2 to 4 participants total).
              </p>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">USN / Roll Number *</label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number *</label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Gender</label>
                <select
                  value={leader.gender}
                  onChange={(e) => setLeader({ ...leader, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  id="reg-leader-gender-select"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
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

              <div className="sm:col-span-2">
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
                disabled={!isLeaderValid}
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                id="reg-step2-next-btn"
              >
                <span>Next: Add Team Members (2-4 Total)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - ADDITIONAL MEMBERS */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Additional Team Members ({1 + members.length} Participants Total)
                </h4>
                <p className="text-[11px] text-slate-400">Add 1 to 3 additional members (Team size: 2-4 members)</p>
              </div>
              {members.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Member ({1 + members.length}/4)
                </button>
              )}
            </div>

            {/* Validation warnings for duplicates or missing fields */}
            {hasDuplicateEmail && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Duplicate email address detected. Each participant must have a unique email address.</span>
              </div>
            )}
            {hasDuplicateUsn && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Duplicate USN detected. Each participant must have a unique roll number / USN.</span>
              </div>
            )}

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {members.map((mem, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                    <span className="text-xs font-black text-cyan-400">Member #{idx + 2}</span>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Full Name *</label>
                      <input
                        type="text"
                        placeholder="Full Name"
                        required
                        value={mem.fullName}
                        onChange={(e) => handleUpdateMember(idx, 'fullName', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">USN / Roll Number *</label>
                      <input
                        type="text"
                        placeholder="USN Number"
                        required
                        value={mem.usn}
                        onChange={(e) => handleUpdateMember(idx, 'usn', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Email Address *</label>
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={mem.email}
                        onChange={(e) => handleUpdateMember(idx, 'email', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Gender</label>
                      <select
                        value={mem.gender}
                        onChange={(e) => handleUpdateMember(idx, 'gender', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">College / Institute Name</label>
                      <input
                        type="text"
                        placeholder="College Name"
                        value={mem.college}
                        onChange={(e) => handleUpdateMember(idx, 'college', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Registration Fee Calculation */}
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
              <div className="text-xs text-slate-300 font-semibold">
                Registration Fee ({currentParticipantCount} Participants)
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">₹{currentFeePerParticipant} / participant</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-black text-xl">₹{currentTotalFee}</div>
                <div className="text-[10px] text-slate-400">₹{currentFeePerParticipant} × {currentParticipantCount} participants</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                Back
              </button>
              <button
                disabled={!isStep3Valid}
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                id="reg-step3-next-btn"
              >
                <span>Proceed to PhonePe Payment (₹{currentTotalFee})</span>
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
                  amount={String(currentTotalFee)}
                  size={190}
                  onPaymentInitiated={() => {
                    handleAutoDetectPayment();
                  }}
                />
              </div>

              {/* UTR Input Form & Instant Verification */}
              <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30">
                {/* PRIMARY ONE-CLICK AUTO-DETECT BUTTON */}
                <button
                  type="button"
                  disabled={paymentVerifying || paymentVerifiedSuccess}
                  onClick={() => handleAutoDetectPayment()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  id="auto-detect-paid-btn"
                >
                  <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
                  <span>I HAVE PAID ₹{currentTotalFee} — VERIFY & NEXT STEP</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>

                {/* Status Indicator Banner */}
                {paymentVerifying && (
                  <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500 text-indigo-200 text-xs flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="font-bold">Checking the UTR and uploaded payment proof...</span>
                  </div>
                )}

                {paymentVerifiedSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold">✓ UTR and payment proof accepted! Proceeding to registration...</span>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white">Beneficiary: <span className="text-indigo-400">KSSEM Anvation 2026 Desk</span></div>
                  <div>UPI ID: <span className="font-mono text-indigo-300">kgsoumya1605@okicici</span></div>
                  <div>Registration Fee: <span className="text-emerald-400 font-bold">₹{currentFeePerParticipant} per participant · ₹{currentTotalFee} total</span></div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Or Enter 12-Digit PhonePe / UPI UTR Transaction Reference:
                  </label>
                  <input
                    type="text"
                    maxLength={22}
                    value={paymentUtr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentUtr(val);
                      if (paymentVerifiedSuccess) setPaymentVerifiedSuccess(false);
                      if (paymentConfirmed) setPaymentConfirmed(false);
                    }}
                    placeholder="e.g. 434511786564 or UPI1234567890"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm tracking-wider focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    id="reg-payment-utr-input"
                  />
                  <p className="text-[10px] text-slate-400">
                    Complete the ₹{currentTotalFee} payment (₹{currentFeePerParticipant} per participant), then enter the actual PhonePe/UPI transaction reference number and upload the payment screenshot for admin verification.
                  </p>
                </div>

                {/* Payment Proof Screenshot Upload */}
                <div className="space-y-1.5 pt-1 border-t border-indigo-800/40">
                  <label className="text-xs font-bold text-slate-300 block">
                    Upload Payment Screenshot <span className="text-red-400 font-black">(Required)</span>:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePaymentScreenshotUpload}
                    className="w-full text-xs file:text-indigo-300 file:bg-indigo-950/40 file:border file:border-indigo-500/40 file:rounded-lg"
                    id="reg-payment-screenshot-input"
                  />
                  {paymentScreenshotData ? (
                    <div className="rounded-xl border border-emerald-500/50 bg-slate-950 overflow-hidden">
                      <div className="flex items-center justify-between px-2 py-1 bg-emerald-950/40 border-t border-emerald-700/40">
                        <span className="text-[10px] font-bold text-emerald-300 truncate flex-1">✓ {paymentScreenshotName || 'Payment screenshot attached'}</span>
                        <button
                          type="button"
                          onClick={() => { setPaymentScreenshotData(null); setPaymentScreenshotName(''); }}
                          className="text-red-400 text-[10px] font-bold hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                      <img src={paymentScreenshotData} alt="Payment Proof" className="w-full max-h-40 object-contain rounded-b-lg" />
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">The screenshot will be stored with your registration and shown to the admin desk as payment proof.</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={paymentVerifying || paymentConfirmed}
                    onClick={() => handleVerifyPayment()}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    id="verify-pay-btn"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{paymentConfirmed ? "Payment Verified ✓" : "Verify UTR & Continue"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                Back
              </button>
              <button
                disabled={paymentVerifying || loading}
                onClick={() => {
                  handleAutoDetectPayment();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                id="reg-step4-next-btn"
              >
                {loading || paymentVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying Payment & Finalizing Registration...</span>
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
                  <div><strong className="text-slate-400">Leader:</strong> <span className="text-white">{registeredTeam.members[0]?.fullName}</span> ({registeredTeam.members[0]?.gender || 'Male'} • {registeredTeam.members[0]?.usn})</div>
                  <div><strong className="text-slate-400">Payment UTR:</strong> <span className="text-emerald-400 font-mono font-bold">{registeredTeam.paymentUtr || paymentUtr}</span></div>
                  <div className="col-span-1 sm:col-span-2"><strong className="text-slate-400">College:</strong> {registeredTeam.members[0]?.college}</div>
                  <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-800/80">
                    <strong className="text-slate-400 block mb-1">Registered Hacker(s) (6 Participants):</strong>
                    <div className="space-y-1">
                      {registeredTeam.members.map((m: any, i: number) => (
                        <div key={i} className="flex flex-wrap justify-between items-center gap-x-4 gap-y-0.5 text-[11px] bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <span>{i === 0 ? '👑 Leader' : `Member ${i+1}`}: <strong className="text-white">{m.fullName}</strong> ({m.usn})</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            String(m.gender).toLowerCase() === 'female'
                              ? 'bg-pink-950/80 text-pink-300 border border-pink-700'
                              : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700'
                          }`}>{m.gender || 'Male'}</span>
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
                    <label className="block text-[10px] font-bold text-slate-300 uppercase">Team Members List (6 Participants):</label>
                    {editSlipForm.members.map((mem: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400">
                          {idx === 0 ? 'Leader / Member 1' : `Member #${idx + 1}`}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5">
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
                          <select
                            value={mem.gender || 'Male'}
                            onChange={(e) => {
                              const updated = [...editSlipForm.members];
                              updated[idx].gender = e.target.value;
                              setEditSlipForm({ ...editSlipForm, members: updated });
                            }}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
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

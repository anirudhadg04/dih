import React, { useState, useEffect, useRef } from 'react';
import { HACKATHON_TRACKS, COLLEGE_INFO, INDIA_STATES_AND_UTS } from '../data/mockData';
import {
  Rocket,
  CheckCircle2,
  User,
  Users,
  Shield,
  FileText,
  ArrowRight,
  Sparkles,
  Edit3,
  Save,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Check,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { PhonePeQRCode } from './PhonePeQRCode';
import { PAYMENT_UPI_ID } from '../utils/upiVerification';
import confetti from 'canvas-confetti';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (team: any) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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

  // Payment proof screenshot upload — previewed on-screen and persisted to the
  // team's paymentScreenshot (base64 data URL) via /api/register.
  const [paymentScreenshotData, setPaymentScreenshotData] = useState<string | null>(null);
  const [paymentScreenshotName, setPaymentScreenshotName] = useState<string>('');
  const [duplicateErrorInfo, setDuplicateErrorInfo] = useState<{
    isDuplicate: boolean;
    field?: string;
    message?: string;
  } | null>(null);
  const [duplicateFieldErrors, setDuplicateFieldErrors] = useState<Record<string, string>>({});
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const paymentScreenshotInputRef = useRef<HTMLInputElement | null>(null);
  const paymentScreenshotReadRef = useRef(0);
  // Guards against duplicate submissions (double-click or payment auto-fire)
  // so two concurrent/clustered registrations never create the same team twice.
  const submittingRef = useRef(false);
  const verifyingRef = useRef(false);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [domain, setDomain] = useState(HACKATHON_TRACKS[0].title);
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [registrationFee, setRegistrationFee] = useState(1);

  // Leader State (Member 1)
  const [leader, setLeader] = useState({
    fullName: '',
    email: '',
    phone: '',
    usn: '',
    college: '',
    state: '',
    gender: '',
    accommodationRequired: false,
  });

  // Members State (1 to 3 additional members: Members 2, 3, 4)
  const createDefaultMembers = () => [
    {
      fullName: '',
      email: '',
      phone: '',
      usn: '',
      college: '',
      state: '',
      gender: '',
      accommodationRequired: false,
    },
  ];

  const [members, setMembers] = useState<
    Array<{
      fullName: string;
      email: string;
      phone: string;
      usn: string;
      college: string;
      state: string;
      gender: string;
      accommodationRequired: boolean;
    }>
  >(createDefaultMembers());

  const handleAddMember = () => {
    if (members.length < 3) {
      setMembers([
        ...members,
        {
          fullName: '',
          email: '',
          phone: '',
          usn: '',
          college: '',
          state: '',
          gender: '',
          accommodationRequired: false,
        },
      ]);
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
    setDuplicateFieldErrors({});
    setCheckingDuplicates(false);
    setRegisteredTeam(null);
    setIsEditingSlip(false);
    setEditSlipForm(null);
    setSlipSaveSuccess(false);
    setTeamName('');
    setDomain(HACKATHON_TRACKS[0].title);
    setPaymentUtr('');
    setPaymentScreenshotData(null);
    setPaymentScreenshotName('');
    paymentScreenshotReadRef.current += 1;
    if (paymentScreenshotInputRef.current) paymentScreenshotInputRef.current.value = '';
    setLeader({
      fullName: '',
      email: '',
      phone: '',
      usn: '',
      college: '',
      state: '',
      gender: '',
      accommodationRequired: false,
    });
    setMembers(createDefaultMembers());
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetch('/api/registration-status')
        .then((res) => res.json())
        .then((data) => {
          setRegistrationFee(Number(data?.registrationFee) || 1);
          if (data && (data.freezeRegistrations || !data.registrationOpen)) {
            setIsFrozen(true);
          } else {
            setIsFrozen(false);
          }
        })
        .catch((err) => console.error('Failed checking registration status:', err));
    }
  }, [isOpen]);


  if (!isOpen) return null;

  const handleUpdateMember = (index: number, field: string, val: string | boolean) => {
    const updated = [...members];
    (updated[index] as any)[field] = val;
    setMembers(updated);
  };

  // Read an uploaded payment screenshot as a base64 data URL, validate it is an
  // image, and preview it so the participant can confirm before submitting.
  const handlePaymentScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Clear the native value so selecting the same file after a rejection still fires onChange.
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.) as payment proof.');
      return;
    }
    const maxBytes = 8 * 1024 * 1024; // 8 MB safety cap for the base64 payload
    if (file.size > maxBytes) {
      alert('Screenshot too large. Please upload an image under 8 MB.');
      return;
    }
    const readId = ++paymentScreenshotReadRef.current;
    setPaymentScreenshotData(null);
    setPaymentScreenshotName('');
    setPaymentFailError(null);
    setShowPaymentFailModal(false);
    setPaymentVerifiedSuccess(false);
    setPaymentConfirmed(false);
    setPaymentVerifying(false);
    setLoading(false);
    const reader = new FileReader();
    reader.onload = () => {
      if (readId !== paymentScreenshotReadRef.current) return;
      setPaymentScreenshotData(String(reader.result));
      setPaymentScreenshotName(file.name);
    };
    reader.onerror = () => {
      if (readId === paymentScreenshotReadRef.current)
        alert('Could not read the file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const currentFeePerParticipant = 1;
  const currentParticipantCount = 1 + members.length;
  const currentTotalFee = currentFeePerParticipant * currentParticipantCount;

  const isLeaderValid = Boolean(
    leader.fullName.trim() &&
      leader.email.trim() &&
      leader.usn.trim() &&
      leader.phone.trim() &&
      leader.college.trim() &&
      leader.state.trim() &&
      leader.gender.trim() &&
      /^[^\s@]+@gmail\.com$/i.test(leader.email.trim()) &&
      /^\d{10}$/.test(leader.phone.trim())
  );

  const areAllMembersFilled =
    members.length >= 1 &&
    members.length <= 3 &&
    members.every((m) =>
      Boolean(
        m.fullName.trim() &&
          m.email.trim() &&
          m.usn.trim() &&
          m.phone.trim() &&
          m.college.trim() &&
          m.state.trim() &&
          m.gender.trim() &&
          /^[^\s@]+@gmail\.com$/i.test(m.email.trim()) &&
          /^\d{10}$/.test(m.phone.trim())
      )
    );

  // Email and USN uniqueness check
  const allParticipantEmails = [
    leader.email.trim().toLowerCase(),
    ...members.map((m) => m.email.trim().toLowerCase()),
  ].filter(Boolean);
  const allParticipantUsns = [
    leader.usn.trim().toUpperCase(),
    ...members.map((m) => m.usn.trim().toUpperCase()),
  ].filter(Boolean);
  const allParticipantPhones = [
    leader.phone.trim(),
    ...members.map((m) => m.phone.trim()),
  ].filter(Boolean);
  const hasDuplicateEmail =
    new Set(allParticipantEmails).size !== allParticipantEmails.length;
  const hasDuplicateUsn = new Set(allParticipantUsns).size !== allParticipantUsns.length;
  const hasDuplicatePhone =
    new Set(allParticipantPhones.map((phone) => phone.replace(/[^0-9]/g, ''))).size !==
    allParticipantPhones.length;

  const isStep3Valid =
    isLeaderValid && areAllMembersFilled && !hasDuplicateEmail && !hasDuplicateUsn && !hasDuplicatePhone;

  const leaderValidationIssues = [
    !leader.fullName.trim() && 'Missing name',
    (!leader.email.trim() || !/^[^\s@]+@gmail\.com$/i.test(leader.email.trim())) &&
      'Invalid/non-Gmail email',
    !leader.usn.trim() && 'Missing USN',
    !/^\d{10}$/.test(leader.phone.trim()) && 'Invalid phone (must be exactly 10 digits)',
    !leader.college.trim() && 'Missing college',
    !leader.state.trim() && 'Missing state',
    !leader.gender.trim() && 'Missing gender',
  ].filter(Boolean) as string[];

  const checkRegistrationDuplicates = async (includeParticipants: boolean): Promise<boolean> => {
    setCheckingDuplicates(true);
    setDuplicateFieldErrors({});
    try {
      const response = await fetch('/api/registration/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName,
          domain,
          ...(includeParticipants ? { leader, members } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Duplicate check failed with HTTP ${response.status}.`);
      }
      const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
      if (conflicts.length > 0) {
        setDuplicateFieldErrors(
          conflicts.reduce(
            (errors: Record<string, string>, conflict: { field?: string; message?: string }) => {
              if (conflict.field)
                errors[conflict.field] = conflict.message || 'This value is already registered.';
              return errors;
            },
            {}
          )
        );
        return false;
      }
      return true;
    } catch (error) {
      setDuplicateFieldErrors({
        form:
          error instanceof Error
            ? error.message
            : 'Could not check existing registrations. Please retry before continuing.',
      });
      return false;
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleStep1Next = async () => {
    if (teamName.trim() && (await checkRegistrationDuplicates(false))) setStep(2);
  };

  const handleStep3Next = async () => {
    if (!isStep3Valid) {
      setDuplicateFieldErrors({
        form: 'Complete every required participant field with a valid Gmail address and exactly 10-digit phone number before continuing.',
      });
      return;
    }
    if (await checkRegistrationDuplicates(true)) setStep(4);
  };

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
        setPaymentFailError(
          'Payment is required. Please complete the registration fee payment and enter your UTR before registering.'
        );
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
        setPaymentFailError(
          'Payment screenshot is required. Please upload a screenshot of your successful PhonePe transaction before registering.'
        );
        setShowPaymentFailModal(true);
        return;
      }

      // Check team completeness
      if (members.length < 1 || members.length > 3 || !areAllMembersFilled) {
        submittingRef.current = false;
        setLoading(false);
        setPaymentVerifying(false);
        setPaymentFailError(
          'All team members (2 to 4 participants total) must have full details completed before registration.'
        );
        setShowPaymentFailModal(true);
        return;
      }

      const totalFee = currentTotalFee;
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          teamName: teamName || 'Anvation Innovators',
          domain,
          preferredTrack: domain,
          leader: {
            fullName: leader.fullName,
            email: leader.email,
            phone: leader.phone,
            usn: leader.usn,
            college: leader.college,
            state: leader.state,
            gender: leader.gender,
            accommodationRequired: leader.accommodationRequired,
          },
          members: members.map((member) => ({
            fullName: member.fullName,
            email: member.email,
            phone: member.phone,
            usn: member.usn,
            college: member.college,
            state: member.state,
            gender: member.gender,
            accommodationRequired: member.accommodationRequired,
          })),
          paymentUtr: finalUtr,
          paymentScreenshot: paymentScreenshotData || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.team) {
        const registrationTeam = { ...data.team };
        setRegisteredTeam(registrationTeam);
        onSuccess(registrationTeam);

        setStep(5); // Go straight to confirmation slip!
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } else {
        if (res.status === 409 || data.error === 'duplicate_registration') {
          const duplicateField = String(data.field || '').toLowerCase();
          const duplicateMessage = duplicateField.includes('email')
            ? 'This email is already registered.'
            : duplicateField.includes('usn')
              ? 'This USN is already registered.'
              : duplicateField.includes('phone')
                ? 'This phone number is already registered.'
                : duplicateField === 'teamname'
                  ? 'This team name is already registered.'
                  : data.message || 'This detail is already registered.';
          setDuplicateErrorInfo({
            isDuplicate: true,
            field: data.field,
            message: duplicateMessage,
          });
          setPaymentFailError(duplicateMessage);
        } else {
          setDuplicateErrorInfo(null);
          setPaymentFailError(data.error || 'Registration could not be completed.');
        }
        setShowPaymentFailModal(true);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setDuplicateErrorInfo(null);
      setPaymentFailError('Network error during registration. Please try again.');
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
      setPaymentFailError(
        'Payment screenshot is required. Please upload a screenshot of your successful PhonePe transaction before verifying your payment.'
      );
      setShowPaymentFailModal(true);
      return;
    }

    const utrToVerify = (customUtr || paymentUtr || '').trim();
    const totalFee = currentTotalFee;
    const validUtrPattern = /^[0-9]{12}$/;

    if (!utrToVerify || !validUtrPattern.test(utrToVerify)) {
      setPaymentVerifying(false);
      setPaymentFailError(
        'Enter the exact 12-digit transaction ID from your payment receipt (digits only, no spaces).'
      );
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
          participantCount: currentParticipantCount,
          paymentScreenshot: paymentScreenshotData,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || `Payment verification service returned HTTP ${res.status}.`
        );
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
        setPaymentFailError(
          data.error ||
            'Payment verification failed: Transaction reference not found on UPI settlement network.'
        );
        setShowPaymentFailModal(true);
        setPaymentVerifiedSuccess(false);
        setPaymentConfirmed(false);
        setPaymentVerifying(false);
        verifyingRef.current = false;
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : '';
      const isNetworkFailure = err instanceof TypeError || !message;
      setPaymentFailError(
        isNetworkFailure
          ? 'Payment verification service is unreachable. Please check your connection and retry. Your UTR and screenshot are still in this form.'
          : `Payment verification failed: ${message}`
      );
      setShowPaymentFailModal(true);
      setPaymentVerifiedSuccess(false);
      setPaymentConfirmed(false);
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

  const handleSaveEditSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlipForm || !registeredTeam) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/teams/${registeredTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSlipForm),
      });

      const data = await res.json();
      if (data.success && data.team) {
        setRegisteredTeam(data.team);
        onSuccess(data.team);
        setIsEditingSlip(false);
        setSlipSaveSuccess(true);
        setTimeout(() => setSlipSaveSuccess(false), 4000);
      } else {
        alert(data.error || 'Failed to update registration slip');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating registration slip');
    } finally {
      setLoading(false);
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
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800"
          >
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
              Registrations for KSSEM Anvation 2026 have been temporarily frozen by the Hackathon
              Organizing Committee. Please check back later or contact the admin team at{' '}
              <span className="text-cyan-400 font-mono">anvation2026@kssem.edu.in</span>.
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
                <span className={`font-bold ${step >= 1 ? 'text-cyan-400' : ''}`}>1. Domain</span>
                <span>→</span>
                <span className={`font-bold ${step >= 2 ? 'text-cyan-400' : ''}`}>
                  2. Team Leader
                </span>
                <span>→</span>
                <span className={`font-bold ${step >= 3 ? 'text-cyan-400' : ''}`}>
                  3. Members (2-4)
                </span>
                <span>→</span>
                <span className={`font-bold ${step >= 4 ? 'text-cyan-400' : ''}`}>
                  4. PhonePe Fee (₹{currentTotalFee})
                </span>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Team Name (Required):
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. NeuralKnights"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    id="reg-team-name-input"
                  />
                  {duplicateFieldErrors.teamName && (
                    <p className="mt-1 text-xs text-red-400">{duplicateFieldErrors.teamName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Project Domain (Required):
                  </label>
                  <select
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    id="reg-domain-select"
                  >
                    {HACKATHON_TRACKS.map((track) => (
                      <option key={track.id} value={track.title}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Team Composition Rule: 2 to 4 Members</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Every registered team must consist of{' '}
                    <strong>1 Leader + 1 to 3 Additional Members</strong> (2 to 4 participants
                    total).
                  </p>
                </div>

                <button
                  disabled={!teamName.trim() || checkingDuplicates}
                  onClick={handleStep1Next}
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Full Name *
                    </label>
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      State / Union Territory *
                    </label>
                    <select
                      required
                      value={leader.state}
                      onChange={(e) => setLeader({ ...leader, state: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="">Select State </option>
                      {INDIA_STATES_AND_UTS.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={leader.email}
                      onChange={(e) => setLeader({ ...leader, email: e.target.value })}
                      placeholder="akash@gmail.com"
                      pattern="[^\s@]+@gmail\.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      id="reg-leader-email-input"
                    />
                    {duplicateFieldErrors['leader.email'] && (
                      <p className="mt-1 text-xs text-red-400">
                        {duplicateFieldErrors['leader.email']}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      USN / Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={leader.usn}
                      onChange={(e) => setLeader({ ...leader, usn: e.target.value })}
                      placeholder="1KG23CS012"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      id="reg-leader-usn-input"
                    />
                    {duplicateFieldErrors['leader.usn'] && (
                      <p className="mt-1 text-xs text-red-400">
                        {duplicateFieldErrors['leader.usn']}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      College Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={leader.college}
                      onChange={(e) => setLeader({ ...leader, college: e.target.value })}
                      placeholder="College / Institute"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={leader.phone}
                      onChange={(e) => setLeader({ ...leader, phone: e.target.value })}
                      placeholder="9876543210"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      id="reg-leader-phone-input"
                    />
                    {duplicateFieldErrors['leader.phone'] && (
                      <p className="mt-1 text-xs text-red-400">
                        {duplicateFieldErrors['leader.phone']}
                      </p>
                    )}
                  </div>

                  <div>
  <label className="block text-xs font-bold text-slate-300 mb-1">Gender</label>
  <select
    value={leader.gender || ''}
    onChange={(e) => setLeader({ ...leader, gender: e.target.value })}
    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
  >
    <option value="">Select Gender</option>
    <option value="Male">Male</option>
    <option value="Female">Female</option>
    <option value="Other">Other</option>
    <option value="Prefer not to say">Prefer not to say</option>
  </select>
</div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Accommodation required
                    </label>
                    <select
                      value={leader.accommodationRequired ? 'yes' : 'no'}
                      onChange={(e) =>
                        setLeader({
                          ...leader,
                          accommodationRequired: e.target.value === 'yes',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                    id="reg-step2-back-btn"
                  >
                    Back
                {!isLeaderValid && (
                  <div className="text-[11px] text-red-400 font-semibold">
                    <span className="block">Leader details incomplete:</span>
                    <span className="block">{leaderValidationIssues.join(' · ')}</span>
                  </div>
                )}
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
                {!isLeaderValid && (
                  <div className="text-[11px] text-red-400 font-semibold">
                    <span className="block">Leader details incomplete:</span>
                    <span className="block">{leaderValidationIssues.join(' · ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 - ADDITIONAL MEMBERS */}
            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" /> Additional Team Members (
                      {1 + members.length} Participants Total)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Add 1 to 3 additional members (Team size: 2-4 members)
                    </p>
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
                {duplicateFieldErrors.form && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs">
                    {duplicateFieldErrors.form}
                  </div>
                )}
                {hasDuplicateEmail && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Duplicate email address detected. Each participant must have a unique email
                      address.
                    </span>
                  </div>
                )}
                {hasDuplicateUsn && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Duplicate USN detected. Each participant must have a unique roll number /
                      USN.
                    </span>
                  </div>
                )}
                {hasDuplicatePhone && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Duplicate phone number detected. Each participant must have a unique contact
                      number.
                    </span>
                  </div>
                )}

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {members.map((mem, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative"
                    >
                      <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                        <span className="text-xs font-black text-cyan-400">
                          Member #{idx + 2}
                        </span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={mem.fullName}
                            onChange={(e) => handleUpdateMember(idx, 'fullName', e.target.value)}
                            placeholder="Akash M"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            State / Union Territory *
                          </label>
                          <select
                            required
                            value={mem.state}
                            onChange={(e) => handleUpdateMember(idx, 'state', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          >
                            <option value="">Select State</option>
                            {INDIA_STATES_AND_UTS.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={mem.email}
                            onChange={(e) => handleUpdateMember(idx, 'email', e.target.value)}
                            placeholder="akash@gmail.com"
                            pattern="[^\s@]+@gmail\.com"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                          {duplicateFieldErrors[`members.${idx}.email`] && (
                            <p className="mt-1 text-xs text-red-400">
                              {duplicateFieldErrors[`members.${idx}.email`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            USN / Roll Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={mem.usn}
                            onChange={(e) => handleUpdateMember(idx, 'usn', e.target.value)}
                            placeholder="1KG23CS012"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                          {duplicateFieldErrors[`members.${idx}.usn`] && (
                            <p className="mt-1 text-xs text-red-400">
                              {duplicateFieldErrors[`members.${idx}.usn`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            College Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={mem.college}
                            onChange={(e) => handleUpdateMember(idx, 'college', e.target.value)}
                            placeholder="College / Institute"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={mem.phone}
                            onChange={(e) => handleUpdateMember(idx, 'phone', e.target.value)}
                            placeholder="9876543210"
                            maxLength={10}
                            pattern="[0-9]{10}"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                          {duplicateFieldErrors[`members.${idx}.phone`] && (
                            <p className="mt-1 text-xs text-red-400">
                              {duplicateFieldErrors[`members.${idx}.phone`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Gender
                          </label>
                          <select
                            required
                            value={mem.gender || ''}
                            onChange={(e) => handleUpdateMember(idx, 'gender', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Accommodation required
                          </label>
                          <select
                            value={mem.accommodationRequired ? 'yes' : 'no'}
                            onChange={(e) =>
                              handleUpdateMember(
                                idx,
                                'accommodationRequired',
                                e.target.value === 'yes'
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Registration Fee Calculation */}
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
                  <div className="text-xs text-slate-300 font-semibold">
                    Registration Fee ({currentParticipantCount} Participants)
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      One payment per team
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-black text-xl">₹{currentTotalFee}</div>
                    <div className="text-[10px] text-slate-400">Covers the complete team</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={checkingDuplicates}
                    onClick={handleStep3Next}
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
                <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 text-left space-y-3">
                  <h4 className="font-bold text-white text-sm">
                    Complete Team Registration Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <strong className="text-slate-400">Team Name:</strong> {teamName}
                    </div>
                    <div>
                      <strong className="text-slate-400">Domain:</strong> {domain}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { ...leader, role: 'Leader' },
                      ...members.map((member) => ({ ...member, role: 'Member' })),
                    ].map((participant, index) => (
                      <div
                        key={`${participant.role}-${index}`}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
                      >
                        <div className="font-bold text-cyan-300">
                          Participant {index + 1} ({participant.role})
                        </div>
                        <div>
                          {participant.fullName} · {participant.usn} · {participant.email} ·{' '}
                          {participant.phone}
                        </div>
                        <div>
                          {participant.college} · {participant.state} · Accommodation:{' '}
                          {participant.accommodationRequired ? 'Yes' : 'No'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">
                      PhonePe Registration Payment (₹{currentTotalFee})
                    </h4>
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
                      upiId={PAYMENT_UPI_ID}
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
                        <span className="font-bold">
                          Checking the UTR and uploaded payment proof...
                        </span>
                      </div>
                    )}

                    {paymentVerifiedSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold">
                          ✓ UTR and payment proof accepted! Proceeding to registration...
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-white">
                        Beneficiary:{' '}
                        <span className="text-indigo-400">KSSEM Anvation 2026 Desk</span>
                      </div>
                      <div>
                        UPI ID: <span className="font-mono text-indigo-300">{PAYMENT_UPI_ID}</span>
                      </div>
                      <div>
                        Registration Fee:{' '}
                        <span className="text-emerald-400 font-bold">
                          ₹{currentFeePerParticipant} per participant · ₹{currentTotalFee} total
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-bold text-slate-300 block">
                        Enter 12-Digit PhonePe / UPI Transaction ID:
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
                        placeholder="e.g. 129346921001"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm tracking-wider focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        id="reg-payment-utr-input"
                      />
                      <p className="text-[10px] text-slate-400">
                        Complete the ₹{currentTotalFee} payment (₹{currentFeePerParticipant} per
                        participant), then enter the actual PhonePe/UPI transaction reference
                        number and upload the payment screenshot for admin verification.
                      </p>
                    </div>

                    {/* Payment Proof Screenshot Upload */}
                    <div className="space-y-1.5 pt-1 border-t border-indigo-800/40">
                      <label className="text-xs font-bold text-slate-300 block">
                        Upload Payment Screenshot{' '}
                        <span className="text-red-400 font-black">(Required)</span>:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePaymentScreenshotUpload}
                        ref={paymentScreenshotInputRef}
                        className="w-full text-xs file:text-indigo-300 file:bg-indigo-950/40 file:border file:border-indigo-500/40 file:rounded-lg"
                        id="reg-payment-screenshot-input"
                      />
                      {paymentScreenshotData ? (
                        <div className="rounded-xl border border-emerald-500/50 bg-slate-950 overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1 bg-emerald-950/40 border-t border-emerald-700/40">
                            <span className="text-[10px] font-bold text-emerald-300 truncate flex-1">
                              ✓ {paymentScreenshotName || 'Payment screenshot attached'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentScreenshotData(null);
                                setPaymentScreenshotName('');
                              }}
                              className="text-red-400 text-[10px] font-bold hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                          <img
                            src={paymentScreenshotData}
                            alt="Payment Proof"
                            className="w-full max-h-40 object-contain rounded-b-lg"
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          The screenshot will be stored with your registration and shown to the
                          admin desk as payment proof.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-1"></div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
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

            {/* STEP 5 - SUCCESS & WAITING FOR APPROVAL */}
            {step === 5 && registeredTeam && (
              <div className="space-y-6 text-center animate-fadeIn">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">Registration Confirmed!</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Please wait for the admin's approval and keep checking your Gmail for further updates.
                  </p>
                </div>

                <div className="flex justify-center">
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

      {/* PAYMENT FAILURE / DUPLICATE REGISTRATION POPUP MODAL */}
      {showPaymentFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div
            className={`bg-slate-900 border ${
              duplicateErrorInfo?.isDuplicate
                ? 'border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.3)]'
                : 'border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
            } rounded-2xl max-w-md w-full p-6 space-y-4 text-left relative`}
          >
            <button
              onClick={() => setShowPaymentFailModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            {duplicateErrorInfo?.isDuplicate ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Duplicate Registration</h3>
                    <span className="text-[11px] text-amber-400 font-mono font-bold">
                      ALREADY_REGISTERED
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                  <p className="font-semibold text-white">
                    {paymentFailError || 'This detail is already registered.'}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Each participant must have a unique email address, USN, and phone number.
                    Please review and update the duplicate information in your team details.
                  </p>
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
                    onClick={() => {
                      setShowPaymentFailModal(false);
                      setStep(2);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition-all"
                    id="edit-duplicate-details-btn"
                  >
                    Review & Edit Team Details
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Payment Verification Failed
                    </h3>
                    <span className="text-[11px] text-red-400 font-mono font-bold">
                      TRANSACTION_NOT_CONFIRMED
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-2">
                  <p className="font-semibold text-white">
                    {paymentFailError ||
                      'We could not verify this transaction reference on the PhonePe / UPI banking switch.'}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Please check the following and retry:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                    <li>
                      Ensure the PhonePe payment of{' '}
                      <strong>₹{currentFeePerParticipant} per participant</strong> was completed to{' '}
                      <strong>{PAYMENT_UPI_ID}</strong>.
                    </li>
                    <li>
                      Verify you entered all <strong>12 digits</strong> of the UTR correctly (e.g.
                      428901239812).
                    </li>
                    <li>
                      If payment was debited from your bank account, please wait 30 seconds and
                      click Retry.
                    </li>
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
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
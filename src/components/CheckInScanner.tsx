import React, { useState, useEffect, useRef } from 'react';
import { Team, Participant } from '../types';
import { QrCode, Camera, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ShieldCheck, MapPin, Users, Ticket, Phone, Mail, Award, Search, UserCheck, XCircle, ArrowRight, Clock } from 'lucide-react';
import { PhonePeQRCode } from './PhonePeQRCode';

interface CheckInScannerProps {
  teams: Team[];
  onUpdateTeam: (updatedTeam: Team) => void;
}

export const CheckInScanner: React.FC<CheckInScannerProps> = ({ teams, onUpdateTeam }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [cameraError, setCameraError] = useState<string>('');
  
  const [scannedTeam, setScannedTeam] = useState<Team | null>(teams[0] || null);
  const [manualInput, setManualInput] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [assignedDesk, setAssignedDesk] = useState<string>('Desk A-14');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked-in' | 'pending'>('all');

  // Check camera availability
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission('unsupported');
    }
  }, []);

  // Handle starting the camera
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCameraPermission('granted');
      setScanMessage({ type: 'info', text: 'Camera scanner active. Point camera at participant QR code on phone or pass.' });
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraPermission('denied');
      setCameraError(err.message || 'Unable to access camera. Please grant camera permissions in your browser settings.');
    }
  };

  // Handle stopping the camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Simulate scanning a QR payload (e.g. team ID or reg number)
  const processQrScan = (qrCodeString: string) => {
    const trimmed = qrCodeString.trim();
    if (!trimmed) return;

    // Search for matching team ID, legacy registration number, email, or USN.
    const match = teams.find(t => 
      t.id.toLowerCase() === trimmed.toLowerCase() ||
      t.regNumber.toLowerCase() === trimmed.toLowerCase() ||
      t.leaderEmail.toLowerCase() === trimmed.toLowerCase() ||
      t.members.some(m => m.usn.toLowerCase() === trimmed.toLowerCase() || m.email.toLowerCase() === trimmed.toLowerCase())
    );

    if (match) {
      setScannedTeam(match);
      setScanMessage({ 
        type: 'success', 
        text: `QR Verified! Found Team: ${match.teamName} (${match.id})` 
      });
    } else {
      setScanMessage({ 
        type: 'error', 
        text: `No registered team found matching QR code "${trimmed}".` 
      });
    }
  };

  // Confirm check-in action
  const handleCheckInTeam = async (team: Team) => {
    const updatedMembers = team.members.map(m => ({
      ...m,
      checkedIn: true,
      checkInTime: m.checkInTime || new Date().toISOString(),
      foodCouponsClaimed: m.foodCouponsClaimed || {
        lunch1: true,
        dinner1: true,
        midnightSnack: true,
        breakfast2: true,
        lunch2: true
      }
    }));

    const updatedTeam: Team = {
      ...team,
      status: 'Checked-In',
      members: updatedMembers
    };

    onUpdateTeam(updatedTeam);
    setScannedTeam(updatedTeam);

    try {
      await fetch(`/api/teams/${team.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error("Server check-in error:", err);
    }

    setScanMessage({
      type: 'success',
      text: `🎉 Gate Pass Verified! ${team.teamName} (${team.id}) admitted to venue. Entry gate pass confirmed!`
    });
  };

  // Toggle single member check-in
  const toggleMemberCheckIn = (team: Team, memberId: string) => {
    const updatedMembers = team.members.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          checkedIn: !m.checkedIn,
          checkInTime: !m.checkedIn ? new Date().toISOString() : undefined
        };
      }
      return m;
    });

    const anyCheckedIn = updatedMembers.some(m => m.checkedIn);
    const updatedTeam: Team = {
      ...team,
      status: anyCheckedIn ? 'Checked-In' : 'Confirmed',
      members: updatedMembers
    };

    onUpdateTeam(updatedTeam);
    setScannedTeam(updatedTeam);
  };

  // Calculate check-in metrics
  const checkedInCount = (teams || []).filter(t => t.status === 'Checked-In' || (t.members || []).some(m => m.checkedIn)).length;
  const totalCount = (teams || []).length;
  const checkInPercent = Math.round((checkedInCount / Math.max(1, totalCount)) * 100);

  const filteredTeamsList = (teams || []).filter(t => {
    const isChecked = t.status === 'Checked-In' || (t.members || []).some(m => m.checkedIn);
    if (filterStatus === 'checked-in') return isChecked;
    if (filterStatus === 'pending') return !isChecked;
    return true;
  });

  return (
    <div className="space-y-8 text-white">
      {/* Top Banner & Check-In Stats */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">KSSEM Gate Check-In & Scanner</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-950 text-cyan-400 border border-cyan-800">
                Desk #1 (Auditorium Entrance)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Scan participant QR codes or search Team IDs to issue entrance badges and food coupons.
            </p>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="w-full lg:w-72 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-400">Checked-In Teams:</span>
            <span className="text-emerald-400 font-extrabold">{checkedInCount} / {totalCount} ({checkInPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500" 
              style={{ width: `${checkInPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Live Camera Feed & Quick QR Sim (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <span>Camera Stream Scanner</span>
              </h3>
              {cameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500 text-red-300 text-xs font-bold transition-all"
                >
                  Turn Off Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
                  id="start-camera-btn"
                >
                  <Camera className="w-3.5 h-3.5" /> Start Camera Feed
                </button>
              )}
            </div>

            {/* Video Feed Box */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 h-64 flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* Scanning Target Reticle & Laser overlay when camera active */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-cyan-400 rounded-2xl relative shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-400" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-400" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-400" />
                    <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              )}

              {/* Placeholder when camera inactive */}
              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                    <QrCode className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Webcam / Mobile Camera</div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Click "Start Camera Feed" to grant browser camera access and scan participant badges live.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Grant Camera Permission
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Manual QR / Search Input */}
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Or Enter / Scan QR Code String Manually:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. AN-001 or akash.m@gmail.com"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => processQrScan(manualInput)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow"
                >
                  Verify QR
                </button>
              </div>
            </div>

            {/* Quick QR Test Selector for Registered Teams */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>Simulate Scan on Sample Teams:</span>
                <span className="text-[10px] text-cyan-400">Click to load team</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {teams.slice(0, 4).map(t => (
                  <button
                    key={t.id}
                    onClick={() => processQrScan(t.id)}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                      scannedTeam?.id === t.id 
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold truncate">{t.teamName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{t.id}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Scanned Team Verification & Check-In Details Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {scanMessage && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg ${
              scanMessage.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : scanMessage.type === 'error'
                ? 'bg-red-950/90 border-red-500 text-red-200'
                : 'bg-cyan-950/90 border-cyan-500 text-cyan-200'
            }`}>
              <div className="flex items-center gap-2">
                {scanMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {scanMessage.type === 'error' && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                {scanMessage.type === 'info' && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
                <span>{scanMessage.text}</span>
              </div>
            </div>
          )}

          {scannedTeam ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              
              {/* Header Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-white">{scannedTeam.teamName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      {scannedTeam.id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                                    Domain: <span className="text-amber-300 font-semibold">{scannedTeam.domain || scannedTeam.preferredTrack}</span>
                  </div>
                </div>

                {/* Status Indicator Badge */}
                <div className="flex items-center gap-2">
                  {scannedTeam.status === 'Checked-In' || scannedTeam.members.some(m => m.checkedIn) ? (
                    <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 text-xs font-black flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>CHECKED-IN</span>
                    </div>
                  ) : (
                    <div className="px-4 py-2 rounded-2xl bg-amber-500/20 border-2 border-amber-500 text-amber-300 text-xs font-black flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>NOT CHECKED IN YET</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desk Allocation & Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-400">Assigned Hackathon Desk Zone:</div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <input
                      type="text"
                      value={assignedDesk}
                      onChange={(e) => setAssignedDesk(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-extrabold text-cyan-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-400">Payment & Verification:</div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">PhonePe ₹300 UTR:</span>
                    <span className="text-emerald-400 font-mono">{scannedTeam.paymentUtr || '428901239855'}</span>
                  </div>
                </div>
              </div>

              {/* Members List with Individual Check-In Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Team Members Gate Clearance ({scannedTeam.members?.length ?? 0})
                </h4>

                <div className="space-y-2">
                  {(scannedTeam.members || []).map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">{m.fullName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.role === 'Leader' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {m.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {m.college} • <span className="text-cyan-300 font-mono">{m.usn}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-400" /> {m.phone}</span>
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-sky-400" /> {m.email}</span>
                        </div>
                      </div>

                      {/* Individual Member Check-In Status */}
                      <button
                        type="button"
                        onClick={() => toggleMemberCheckIn(scannedTeam, m.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                          m.checkedIn
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {m.checkedIn ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Verified Gate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 text-amber-400" />
                            <span>Mark Present</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Action Button to Confirm Full Team Gate Check-In */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleCheckInTeam(scannedTeam)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
                  id="confirm-team-checkin-btn"
                >
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span>Complete Team Check-In & Issue Wristbands</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400 space-y-3">
              <QrCode className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-base font-bold text-slate-300">No Team Scanned Yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Use the camera feed on the left, enter a Team ID string, or click a sample team button to view check-in status.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Filterable Table of All Teams Check-In Status */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span>Master Check-In Roster</span>
          </h3>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({teams.length})
            </button>
            <button
              onClick={() => setFilterStatus('checked-in')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'checked-in' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Checked-In ({checkedInCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'pending' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({totalCount - checkedInCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Team ID</th>
                <th className="p-3">Team Name</th>
                <th className="p-3">Track</th>
                <th className="p-3">Members</th>
                <th className="p-3">Status Indicator</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {filteredTeamsList.map(t => {
                const isCheckedIn = t.status === 'Checked-In' || t.members.some(m => m.checkedIn);
                return (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-400">{t.id}</td>
                    <td className="p-3 font-extrabold text-white">{t.teamName}</td>
                    <td className="p-3 text-slate-300">{t.preferredTrack}</td>
                    <td className="p-3 text-slate-400">{t.members.length} Members</td>
                    <td className="p-3">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Checked-In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-400 border border-amber-800">
                          <Clock className="w-3 h-3 text-amber-400" /> Pending Gate
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setScannedTeam(t);
                          setScanMessage({ type: 'info', text: `Loaded team ${t.teamName} (${t.id})` });
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-700 border border-slate-700 font-bold text-xs transition-all inline-flex items-center gap-1"
                      >
                        <span>Scan / View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

/**
 * Generates an official KSSEM Hackathon Certificate on canvas and triggers download
 */
export function generateCertificate({
  participantName,
  teamName,
  trackName,
  awardType = 'Participation Certificate',
  regId = 'KS-HACK-2026'
}: {
  participantName: string;
  teamName: string;
  trackName: string;
  awardType?: string;
  regId?: string;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1130;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Outer Background (Dark Royal Blue + Gold Frame)
  ctx.fillStyle = '#0B192C';
  ctx.fillRect(0, 0, 1600, 1130);

  // Decorative Golden Border
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 14;
  ctx.strokeRect(30, 30, 1540, 1070);

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 1504, 1034);

  // Inner Cream Canvas Card
  ctx.fillStyle = '#FAFAF9';
  ctx.fillRect(60, 60, 1480, 1010);

  // Inner Gold Line Frame
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.strokeRect(75, 75, 1450, 980);

  // Header - Institutional Banner
  ctx.fillStyle = '#8B0000'; // Maroon
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('KAMMAVARI SANGHAM (R) 1952, K. S. GROUP OF INSTITUTIONS', 800, 130);

  ctx.fillStyle = '#0B192C'; // Royal Blue
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('K. S. SCHOOL OF ENGINEERING & MANAGEMENT', 800, 190);

  ctx.fillStyle = '#475569';
  ctx.font = '18px sans-serif';
  ctx.fillText('Affiliated to VTU, Belagavi | Approved by AICTE, New Delhi | Accredited by NAAC & NBA', 800, 225);
  ctx.fillText('Department of Computer Science & Engineering | Bengaluru, Karnataka', 800, 255);

  // Divider Line with Diya Symbol Accent
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 280);
  ctx.lineTo(1300, 280);
  ctx.stroke();

  // Award Title
  ctx.fillStyle = '#0284C7';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('CERTIFICATE OF ' + awardType.toUpperCase(), 800, 345);

  // Body Text
  ctx.fillStyle = '#334155';
  ctx.font = '24px Georgia, serif';
  ctx.fillText('This is proudly presented to', 800, 410);

  // Participant Name (Big Highlight)
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText(participantName, 800, 480);

  // Team & Track Details
  ctx.fillStyle = '#334155';
  ctx.font = '22px Georgia, serif';
  ctx.fillText(`of Team "${teamName}" for active participation in the National Level 24-Hour Hackathon`, 800, 540);

  ctx.fillStyle = '#8B0000';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText(`"ANVATION 2026"`, 800, 590);

  ctx.fillStyle = '#475569';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Track: ${trackName} | Organized on October 8-9, 2026`, 800, 635);

  // Performance / Excellence seal text
  ctx.fillStyle = '#0F172A';
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText(`Registration ID: ${regId} | Verification Code: KSHN-2026-VERIFIED`, 800, 685);

  // Signatures Section
  const sigY = 880;

  // Sig 1
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(200, sigY); ctx.lineTo(440, sigY); ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px sans-serif'; ctx.fillText('Dr. K Venkata Rao', 320, sigY + 30);
  ctx.fillStyle = '#64748B';
  ctx.font = '16px sans-serif'; ctx.fillText('HOD, Dept of CSE', 320, sigY + 55);

  // Sig 2
  ctx.beginPath(); ctx.moveTo(680, sigY); ctx.lineTo(920, sigY); ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px sans-serif'; ctx.fillText('Dr. K. Rama Narasimha', 800, sigY + 30);
  ctx.fillStyle = '#64748B';
  ctx.font = '16px sans-serif'; ctx.fillText('Principal, KSSEM', 800, sigY + 55);

  // Sig 3
  ctx.beginPath(); ctx.moveTo(1160, sigY); ctx.lineTo(1400, sigY); ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px sans-serif'; ctx.fillText('Sri. K. Subramanyam Naidu', 1280, sigY + 30);
  ctx.fillStyle = '#64748B';
  ctx.font = '16px sans-serif'; ctx.fillText('President, Kammavari Sangham', 1280, sigY + 55);

  // Golden Stamp Seal on Bottom Right
  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  ctx.arc(1420, 760, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0B192C';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#0B192C';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('KSSEM CSE', 1420, 752);
  ctx.fillText('OFFICIAL', 1420, 767);
  ctx.fillText('SEAL 2026', 1420, 780);

  // Download Trigger
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `KSSEM_Certificate_${participantName.replace(/\s+/g, '_')}.png`;
  link.href = dataUrl;
  link.click();
}

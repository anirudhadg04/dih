import QRCode from 'qrcode';

/**
 * Utility to render a genuine, standards-compliant QR code onto an HTML Canvas.
 * Uses high error correction (H) so that central badge overlays or minor scan obstructions
 * do not prevent scanner cameras and apps from decoding.
 */
export async function drawQRCode(canvas: HTMLCanvasElement, text: string, size = 200) {
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0B192C',
        light: '#FFFFFF'
      }
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center badge for event branding (optional small label)
    const badgeSize = Math.floor(size * 0.22);
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, badgeSize / 2 + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(centerX, centerY, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.055)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KSSEM', centerX, centerY);
    ctx.restore();
  } catch (err) {
    console.error('Failed to generate canvas QR code:', err);
  }
}

/**
 * Generates a scannable Gate Entry Pass QR as a PNG data URL (no canvas needed),
 * so it can be embedded reliably into printed PDF slips and registration emails.
 * Uses High (H) error correction like the on-canvas version.
 */
export async function gateQrDataUrl(text: string, size = 220): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#0B192C', light: '#FFFFFF' }
  });
}

/**
 * Renders the genuine PhonePe UPI Payment QR Code matching the official format
 * and uploaded PhonePe asset with the central black PhonePe logo circle.
 */
export async function drawPhonePeQRCode(
  canvas: HTMLCanvasElement,
  options: {
    upiId?: string;
    name?: string;
    amount?: string;
    size?: number;
    note?: string;
  } = {}
) {
  const {
    upiId = 'kgsoumya1605@okicici',
    name = 'KSSEM Anvation 2026',
    amount = '1',
    size = 260,
    note = 'KSSEM Anvation 2026 Registration'
  } = options;

  // Standard UPI URI specification without personal name
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(note)}`;

  try {
    // Generate QR with High (H) error correction (allows 30% central icon overlay without data loss)
    await QRCode.toCanvas(canvas, upiUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return upiUrl;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = Math.floor(size * 0.125); // matching central icon proportion in image.png

    ctx.save();

    // Outer white boundary ring
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
    ctx.fill();

    // Black PhonePe circle background
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // White Devanagari 'पे' glyph in center
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.floor(radius * 1.25)}px sans-serif, "Noto Sans Devanagari", "Mangal"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Offset slightly for optical centering of 'पे'
    ctx.fillText('पे', centerX, centerY + 1);

    ctx.restore();

    return upiUrl;
  } catch (err) {
    console.error('Failed to generate PhonePe QR canvas:', err);
    return upiUrl;
  }
}

import React, { useEffect, useRef, useState } from 'react';
import { drawPhonePeQRCode } from '../utils/qr';
import { Copy, Check, ExternalLink, Download, ShieldCheck, Sparkles } from 'lucide-react';

interface PhonePeQRCodeProps {
  upiId?: string;
  name?: string;
  amount?: string;
  size?: number;
  showPayButton?: boolean;
  onPaymentInitiated?: () => void;
}

export const PhonePeQRCode: React.FC<PhonePeQRCodeProps> = ({
  upiId = 'kgsoumya1605@okicici',
  name = 'KSSEM Anvation 2026',
  amount = '1',
  size = 240,
  showPayButton = true,
  onPaymentInitiated
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [upiString, setUpiString] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (canvasRef.current) {
      drawPhonePeQRCode(canvasRef.current, {
        upiId,
        name,
        amount,
        size: Math.max(size, 240),
        note: 'KSSEM Anvation 2026 Registration'
      }).then((url) => {
        if (isMounted && url) {
          setUpiString(url);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [upiId, name, amount, size]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `PhonePe_QR_Anvation_2026_Rs${amount}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white text-slate-900 border-2 border-slate-900 shadow-2xl max-w-sm mx-auto">
      {/* Official PhonePe Branding Header */}
      <div className="flex items-center justify-between w-full pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold text-base shadow-sm">
            पे
          </div>
          <div className="text-left">
            <div className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1">
              <span>PhonePe Official QR</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              Accepted by PhonePe, GPay, Paytm, BHIM & UPI
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadQR}
          title="Download QR Image"
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* High Precision Live Scannable Canvas QR */}
      <div className="relative p-2.5 bg-white rounded-2xl border-2 border-slate-300 shadow-inner mt-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-lg max-w-full h-auto block"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </div>

      {/* Payee Details & Instant Actions */}
      <div className="mt-3.5 text-center w-full space-y-2">
        <div>
          <div className="text-sm font-black text-slate-900 tracking-wide uppercase">KSSEM Anvation 2026</div>
          <div className="text-[11px] text-slate-500 font-medium">Official Event Registration Desk</div>
        </div>

        {/* Copyable UPI ID pill */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 inline-flex items-center gap-2">
            <span>{upiId}</span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="text-purple-700 hover:text-purple-950 p-0.5 rounded transition-colors"
              title="Copy UPI ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Amount Badge */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
          <span>Fee:</span>
          <span className="text-emerald-700 text-sm font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            ₹{amount} (₹1 per participant)
          </span>
        </div>

        {/* Pay Button for Mobile Users */}
        {showPayButton && upiString && (
          <div className="pt-2 w-full space-y-1.5">
            <a
              href={upiString}
              onClick={() => onPaymentInitiated?.()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <span>Tap to Pay with UPI / PhonePe App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-[10px] text-slate-500">
              On mobile: Tap button to open PhonePe / GPay directly. On PC: Scan QR above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

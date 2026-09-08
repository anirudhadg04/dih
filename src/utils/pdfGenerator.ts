/**
 * Triggers a formatted printable window for Rulebook or Registration Slip.
 *
 * Uses a hidden <iframe> instead of window.open() so that the browser's print
 * dialog (and therefore the "Save as PDF" option) is never blocked by a popup
 * blocker. The Gate Entry Pass QR image is rendered inside the document, so it
 * reliably appears in the printed/saved PDF.
 */
export function printDocument(title: string, htmlContent: string) {
  let iframe = document.getElementById('_anvation_print_frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = '_anvation_print_frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const win = iframe.contentWindow;
  if (!win) return;

  const doc = win.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - KSSEM Anvation 2026</title>
        <style>
          body { font-family: 'Georgia', serif; color: #1e293b; padding: 40px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 20px; margin-bottom: 30px; }
          .inst-title { color: #0f172a; font-size: 24px; font-weight: bold; margin: 0; }
          .sub-title { color: #b91c1c; font-size: 16px; margin-top: 5px; font-weight: bold; }
          .address { color: #64748b; font-size: 13px; font-family: sans-serif; }
          h2 { color: #0284c7; font-family: sans-serif; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: sans-serif; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
          th { background: #f1f5f9; color: #0f172a; }
          .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .qr-box { text-align: center; margin: 20px 0; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="inst-title">K. S. SCHOOL OF ENGINEERING & MANAGEMENT</div>
          <div class="sub-title">DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING</div>
          <div class="address">No.15, Mallasandra, Off. Kanakapura Road, Bengaluru-560109 | Affiliated to VTU | AICTE Approved | NAAC & NBA Accredited</div>
        </div>
        ${htmlContent}
        <div class="footer">
          Anvation 2026 Official Document | Generated on ${new Date().toLocaleDateString()} | Verified by KSSEM Dept. of CSE
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.focus(); window.print(); }, 150); };
        </script>
      </body>
    </html>
  `);
  doc.close();
}

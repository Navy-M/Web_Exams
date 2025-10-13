async function waitForAssets(root: HTMLElement | Document) {
  const doc = root instanceof HTMLElement ? root.ownerDocument! : (root as Document);
  try { if ((doc as any).fonts?.ready) await (doc as any).fonts.ready; } catch {}
  const scope = root instanceof HTMLElement ? root : (root as Document).body;
  const imgs: HTMLImageElement[] = Array.from(scope.querySelectorAll("img"));
  await Promise.allSettled(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return;
      return new Promise<void>((res) => {
        const done = () => res();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    })
  );
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

function forceA4(el: HTMLElement) {
  // ≈210mm در 96dpi
  el.style.width = "794px";
  el.style.maxWidth = "794px";
  el.style.background = "#fff";
  el.style.opacity = "1";
  el.style.visibility = "visible";
  el.style.transform = "none";
  el.style.willChange = "auto";
  // برای اطمینان از ارتفاع حداقلی
  el.style.minHeight = "1123px";
}

export async function printElementToPDF(el: HTMLElement, filename = "report.pdf") {
  let attachedTemp = false;
  if (!document.body.contains(el)) {
    attachedTemp = true;
    el.style.position = "fixed";
    el.style.left = "-99999px";
    el.style.top = "0";
    document.body.appendChild(el);
  }

  forceA4(el);
  await waitForAssets(el);

  // یک رندر چرخه بده تا layout تثبیت شود
  await new Promise((r) => setTimeout(r, 50));

  try {
    const mod: any = await import("html2pdf.js");
    const html2pdf = mod?.default || (window as any).html2pdf;
    if (!html2pdf) throw new Error("html2pdf not available");

    const opt = {
      margin: [10, 12, 10, 12],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
        windowWidth: 794,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    await html2pdf().set(opt).from(el).save();
    return;
  } catch (e) {
    console.warn("html2pdf failed, fallback:", e);
  }

  // --- Fallback ---
  const [{ default: html2canvas }, { jsPDF }]: any = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    scrollY: -window.scrollY,
    windowWidth: 794,
    logging: false,
  });
  const img = canvas.toDataURL("image/jpeg", 0.98);

  const pageW = 210, pageH = 297, m = 12;
  const imgW = pageW - m * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let pos = m;

  pdf.addImage(img, "JPEG", m, pos, imgW, imgH);
  heightLeft -= pageH - m * 2;

  while (heightLeft > 0) {
    pdf.addPage();
    pos = m - heightLeft;
    pdf.addImage(img, "JPEG", m, pos, imgW, imgH);
    heightLeft -= pageH - m * 2;
  }

  pdf.save(filename);

  if (attachedTemp) {
    try { document.body.removeChild(el); } catch {}
  }
}

export function printHTMLStringToPDF(html: string, filename = "report.pdf") {
  // استایل‌های داخلی را بردار
  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const inlineStyles = styleMatches.map((m) => m[1]).join("\n");

  // فقط بادی
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : html;

  const container = document.createElement("div");
  container.setAttribute("dir", "rtl");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.background = "#fff";

  // یک تم پایه برای جلوگیری از متن سفید
  const baseStyles = `
    <style>
      body, .report-root { color:#0f172a; font-family:"Vazirmatn", Arial, sans-serif; }
      @page { size: A4; margin: 14mm; }
    </style>
  `;

  container.innerHTML = `${baseStyles}${inlineStyles ? `<style>${inlineStyles}</style>` : ""}<div class="report-root">${bodyInner}</div>`;
  document.body.appendChild(container);

  forceA4(container);

  return printElementToPDF(container, filename).finally(() => {
    try { document.body.removeChild(container); } catch {}
  });
}
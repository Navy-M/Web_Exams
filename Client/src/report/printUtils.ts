export async function printElementToPDF(
  el: HTMLElement,
  filename = "report.pdf"
) {
  try {
    const mod: any = await import("html2pdf.js");
    const html2pdf = mod?.default || (window as any).html2pdf;
    if (!html2pdf) throw new Error("html2pdf not available");

    const opt = {
      margin: [10, 12, 10, 12],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    await html2pdf().set(opt).from(el).save();
    return;
  } catch (e) {
    console.warn("html2pdf failed, falling back to jsPDF+html2canvas:", e);
  }

  const [{ default: html2canvas }, { jsPDF }]: any = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth - 24;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 12;
  pdf.addImage(imgData, "JPEG", 12, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - 24;

  while (heightLeft > 0) {
    pdf.addPage();
    position = 12 - heightLeft;
    pdf.addImage(imgData, "JPEG", 12, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 24;
  }

  pdf.save(filename);
}

export function printHTMLStringToPDF(html: string, filename = "report.pdf") {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  return printElementToPDF(container, filename).finally(() => {
    document.body.removeChild(container);
  });
}


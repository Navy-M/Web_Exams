export const printUserReport = ({ user, results, formatDate }) => {
  const testTypeMap = {
    PERSONAL_FAVORITES: "اولویت‌های شخصی",
    GHQ: "سلامت عمومی",
    CLIFTON: "نقاط قوت کلیفتون",
    GARDNER: "هوش‌های چندگانه گاردنر",
  };

  const styles = `
    @font-face {
      font-family: 'Vazir';
      src: url('https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.woff2') format('woff2');
    }
    body { font-family: 'Vazir', Arial, sans-serif; direction: rtl; margin: 20mm; color: #333; }
    @page { size: A4; margin: 20mm; }
    h1 { text-align: center; font-size: 18pt; color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { font-size: 14pt; color: #34495e; margin: 20px 0 10px; border-right: 4px solid #4CAF50; padding-right: 10px; }
    h3 { font-size: 12pt; color: #555; margin: 15px 0 8px; }
    .section { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
    .profile-table, .results-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .profile-table td, .results-table th, .results-table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
    .profile-table td:first-child { font-weight: bold; width: 30%; background: #f0faff; }
    .results-table th { background: #4CAF50; color: #fff; font-weight: 700; }
    .results-table tr:nth-child(even) { background: #f9f9f9; }
    .no-data { text-align: center; color: #e74c3c; font-style: italic; }
    .footer { text-align: center; font-size: 10pt; color: #777; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
  `;

  const profile = user?.profile || {};

  const analysisBlock = (r) => {
    if (!r?.analysis) {
      return `<p class="no-data">تحلیل برای این آزمون انجام نشده است.</p>`;
    }
    if (r.testType === "PERSONAL_FAVORITES") {
      const traits = r.analysis.traits || {};
      const prefs = r.analysis.topPreferences || {};
      return `
        <p><strong>خلاصه:</strong> ${r.analysis.summary || "نامشخص"}</p>
        <p><strong>زمان تحلیل:</strong> ${formatDate(r.analysis.analyzedAt)}</p>
        <table class="results-table">
          <thead><tr><th>ویژگی</th><th>ترجیح برتر</th><th>تکرار انتخاب‌ها</th></tr></thead>
          <tbody>
            ${Object.entries(traits)
              .map(([k, t]) => `
                <tr>
                  <td>${t?.name || k}</td>
                  <td>${t?.topPreference || "هیچ"}</td>
                  <td>${
                    Object.entries(t?.frequency || {})
                      .map(([opt, count]) => `${opt}: ${count} بار`)
                      .join("<br>") || "هیچ"
                  }</td>
                </tr>
              `)
              .join("")}
          </tbody>
        </table>
        <h3>پیشنهادات</h3>
        <ul>
          ${
            Object.entries(prefs)
              .filter(([, v]) => v !== null)
              .map(
                ([trait, { value }]) =>
                  `<li>فعالیت‌های مرتبط با «${value}» برای تقویت «${traits[trait]?.name || trait}»</li>`
              )
              .join("") || "<li>پیشنهادی موجود نیست</li>"
          }
        </ul>
      `;
    }
    if (r.testType === "GHQ") {
      const traits = r.analysis.traits || {};
      const risk = r.analysis.riskLevel;
      const riskFa =
        risk === "High" ? "بالا (نیاز به توجه)" : risk === "Moderate" ? "متوسط" : "پایین (خوب)";
      return `
        <p><strong>سطح خطر:</strong> ${riskFa}</p>
        <p><strong>امتیاز کل:</strong> ${r.analysis.totalScore || 0} (${r.analysis.normalizedTotal || 0}%)</p>
        <p><strong>خلاصه:</strong> ${r.analysis.summary || "نامشخص"}</p>
        <p><strong>زمان تحلیل:</strong> ${formatDate(r.analysis.analyzedAt)}</p>
        <table class="results-table">
          <thead><tr><th>ویژگی</th><th>امتیاز</th><th>توضیح</th></tr></thead>
          <tbody>
            ${Object.entries(traits)
              .map(
                ([k, t]) =>
                  `<tr><td>${t?.name || k}</td><td>${t?.score || 0}%</td><td>${t?.description || "—"}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;
    }
    return `<p>تحلیل برای ${testTypeMap[r.testType] || r.testType} در دسترس نیست.</p>`;
  };

  const resultsHTML = (results || [])
    .map(
      (r) => `
      <div class="section">
        <h3>آزمون: ${testTypeMap[r.testType] || r.testType}</h3>
        <p><strong>تاریخ انجام:</strong> ${r.completedAt ? formatDate(r.completedAt) : "—"}</p>
        <p><strong>مدت زمان:</strong> ${r.duration ? `${r.duration} ثانیه` : "—"}</p>
        <p><strong>بازخورد ادمین:</strong> ${r.adminFeedback || "بدون بازخورد"}</p>
        ${analysisBlock(r)}
      </div>
    `
    )
    .join("");

  return `
    <html dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>کارنامه کاربر - ${profile.fullName || "نامشخص"}</title>
        <style>${styles}</style>
      </head>
      <body>
        <h1>کارنامه کاربر: ${profile.fullName || "نامشخص"}</h1>

        <div class="section">
          <h2>اطلاعات فردی</h2>
          <table class="profile-table">
            <tr><td>نام و نام خانوادگی</td><td>${profile.fullName || "—"}</td></tr>
            <tr><td>نام کاربری</td><td>${user.username || "—"}</td></tr>
            <tr><td>سن</td><td>${profile.age ?? "—"}</td></tr>
            <tr><td>وضعیت تاهل</td><td>${profile.age ? (profile.single ? "مجرد" : "متاهل") : "نامشخص"}</td></tr>
            <tr><td>تحصیلات</td><td>${profile.education || "—"}</td></tr>
            <tr><td>رشته</td><td>${profile.field || "—"}</td></tr>
            <tr><td>تلفن</td><td>${profile.phone || "—"}</td></tr>
            <tr><td>شهر</td><td>${profile.city || "—"}</td></tr>
            <tr><td>استان</td><td>${profile.province || "—"}</td></tr>
            <tr><td>شماره دانشجویی</td><td>${profile.jobPosition || "—"}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>نتایج آزمون‌ها</h2>
          ${results && results.length ? resultsHTML : '<p class="no-data">هیچ نتیجه‌ای وجود ندارد.</p>'}
        </div>

        <div class="footer">
          <p>تولید شده در تاریخ: ${formatDate(new Date())}</p>
          <p>سامانه استعدادیابی دانشجویی</p>
          <p>دانشگاه علوم دریایی امام خمینی (ره)</p>
        </div>
      </body>
    </html>
  `;
};

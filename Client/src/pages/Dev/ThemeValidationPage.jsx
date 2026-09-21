import React, { useEffect, useState } from "react";
import { Bell, Check, ChevronLeft, Info, Moon, Sun, X } from "lucide-react";
import ShowAnalysis from "../../components/Common/ShowAnalysis";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import { useTheme } from "../../context/ThemeContext";
import "./themeValidation.css";

const chartSample = {
  normalizedScores: { D: 76, I: 62, S: 48, C: 84 },
  traits: {
    D: { name: "سلطه‌گری" }, I: { name: "تأثیرگذاری" },
    S: { name: "ثبات" }, C: { name: "وظیفه‌شناسی" },
  },
};

export default function ThemeValidationPage() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("summary");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("theme");
    if (requested === "light" || requested === "dark") setTheme(requested);
  }, [setTheme]);

  return (
    <main className="theme-validation" dir="rtl">
      <header className="theme-validation__header">
        <div>
          <h1>اعتبارسنجی سیستم ظاهری</h1>
          <p className="muted">کنترل متمرکز مؤلفه‌ها در حالت روشن و تیره</p>
        </div>
        <button className="btn primary" type="button" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          {theme === "dark" ? "حالت روشن" : "حالت تیره"}
        </button>
      </header>

      <section className="theme-validation__section">
        <h2>دکمه‌ها و وضعیت‌ها</h2>
        <div className="theme-validation__row">
          <button className="btn primary">اصلی</button><button className="btn">ثانویه</button>
          <button className="btn ghost">بدون پس‌زمینه</button><button className="btn success"><Check size={16} /> موفق</button>
          <button className="btn danger"><X size={16} /> خطر</button><button className="btn" disabled>غیرفعال</button>
        </div>
        <div className="theme-validation__row">
          <span className="badge success">تحلیل شده</span><span className="badge warning">منتظر تحلیل</span>
          <span className="badge error">خطا</span><span className="badge info">منتشر شده</span><span className="badge">خنثی</span>
        </div>
      </section>

      <section className="theme-validation__grid">
        <article className="card theme-validation__card">
          <h2>فرم‌ها</h2>
          <label>نام کامل<input placeholder="نام و نام خانوادگی" /></label>
          <label>دوره<select defaultValue="day"><option value="day">روزانه</option><option value="night">شبانه</option></select></label>
          <label>توضیحات<textarea placeholder="توضیحات تکمیلی" /></label>
          <label className="theme-validation__check"><input type="checkbox" defaultChecked /> تأیید اطلاعات</label>
          <label>وزن معیار<input type="range" defaultValue="62" /></label>
          <input disabled value="فیلد غیرفعال" readOnly />
        </article>

        <article className="card theme-validation__card">
          <h2>اعلان و بارگذاری</h2>
          <div className="app-toast app-toast--success theme-validation__toast"><Check size={18} /><span>اطلاعات با موفقیت ثبت شد.</span><button><X size={16} /></button></div>
          <div className="app-toast app-toast--warning theme-validation__toast"><Bell size={18} /><span>این نتیجه هنوز منتشر نشده است.</span><button><X size={16} /></button></div>
          <div className="theme-validation__loader"><LoadingSpinner size={34} /><span>در حال دریافت اطلاعات...</span></div>
          <div className="skeleton-row" /><div className="skeleton-card" />
        </article>
      </section>

      <section className="theme-validation__section">
        <div className="theme-validation__tabs" role="tablist">
          <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>خلاصه</button>
          <button className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>جزئیات</button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>تاریخچه</button>
        </div>
        <div className="theme-validation__table-wrap">
          <table>
            <thead><tr><th>داوطلب</th><th>آزمون</th><th>امتیاز</th><th>وضعیت</th></tr></thead>
            <tbody>
              <tr><td>کاربر نمونه</td><td>DISC</td><td>۷۶</td><td><span className="badge success">تکمیل</span></td></tr>
              <tr className="selected"><td>داوطلب دوم</td><td>MBTI</td><td>۶۸</td><td><span className="badge warning">در انتظار</span></td></tr>
              <tr><td>داوطلب سوم</td><td>Gardner</td><td>۸۱</td><td><span className="badge info">منتشر شده</span></td></tr>
            </tbody>
          </table>
        </div>
        <nav className="theme-validation__pagination"><button aria-label="صفحه قبل"><ChevronLeft size={16} /></button><button className="active">۱</button><button>۲</button><button>۳</button></nav>
      </section>

      <section className="theme-validation__section">
        <div className="theme-validation__section-head"><h2>نمودار تحلیل</h2><button className="btn" onClick={() => setModalOpen(true)}>نمایش مودال</button></div>
        <ShowAnalysis testType="DISC" analysisData={chartSample} />
      </section>

      {modalOpen && (
        <div className="ts-modal-overlay" onMouseDown={() => setModalOpen(false)}>
          <div className="ts-modal theme-validation__modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="ts-modal-header"><div><h2>تنظیمات اولویت‌بندی</h2><p>نمونه نمایش Modal در تم جاری</p></div><button className="btn ghost" onClick={() => setModalOpen(false)}><X size={18} /></button></header>
            <div className="ts-modal-content"><p><Info size={16} /> ظرفیت و وزن معیارها پیش از اجرا قابل تنظیم است.</p><label>ظرفیت رشته<input type="number" defaultValue="25" /></label></div>
            <footer className="ts-modal-footer"><button className="btn" onClick={() => setModalOpen(false)}>انصراف</button><button className="btn primary">اجرای اولویت‌بندی</button></footer>
          </div>
        </div>
      )}
    </main>
  );
}

import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import "./CliftonStrengthsAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CliftonStrengthsAnalysis = ({ data }) => {
  if (!data) return <p>داده‌ای برای نمایش موجود نیست.</p>;

  const {
    topThemes,
    signatureTheme,
    rawScores,
    normalizedScores,
    themeDetails,
    developmentSuggestions,
    chartData,
    summary,
    analyzedAt,
  } = data;

  const formattedDate = new Date(analyzedAt).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="clifton-container">
      <h2 className="title">تحلیل نقاط قوت کلیفتون</h2>

      <section className="summary-section">
        <p>
          <strong>تم‌های برتر شما: </strong>
          {topThemes.join("، ")}
        </p>
        <p>
          <strong>تم اصلی: </strong>
          {signatureTheme}
        </p>
        <p>
          <strong>خلاصه: </strong>
          {summary}
        </p>
        <p>
          <strong>زمان تحلیل: </strong>
          {formattedDate}
        </p>
      </section>

      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <table className="scores-table">
          <thead>
            <tr>
              <th>تم</th>
              <th>نام تم</th>
              <th>امتیاز خام</th>
              <th>نمره نرمال‌شده (%)</th>
            </tr>
          </thead>
          <tbody>
            {themeDetails.map(({ theme, name, score, percentage, isTop }) => (
              <tr key={theme} className={isTop ? "top-theme" : ""}>
                <td>{theme}</td>
                <td>{name}</td>
                <td>{score}</td>
                <td>{percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="details-section">
        <h3>توضیحات تم‌ها</h3>
        <div className="themes-list">
          {themeDetails.map(({ theme, name, description, characteristics, isTop }) => (
            <div key={theme} className={`theme-card ${isTop ? "top" : ""}`}>
              <h4>{name} {isTop && <span className="top-label">تم برتر</span>}</h4>
              <p><strong>توضیح: </strong>{description}</p>
              <p><strong>ویژگی‌ها: </strong>{characteristics}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="development-section">
        <h3>پیشنهادات توسعه</h3>
        {developmentSuggestions.map(({ theme, suggestions }) => (
          <div key={theme} className="development-card">
            <h4>{theme}</h4>
            <ul>
              {suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="chart-section">
        <h3>نمودار نمرات تم‌ها</h3>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            scales: {
              y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: { label: ctx => `${ctx.parsed.y}%` },
              },
            },
          }}
        />
      </section>
    </div>
  );
};

export default CliftonStrengthsAnalysis;

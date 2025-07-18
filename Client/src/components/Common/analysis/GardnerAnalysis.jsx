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
import "./GardnerAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const GardnerAnalysis = ({ data }) => {
  if (!data) return <p>داده‌ای برای نمایش موجود نیست.</p>;

  const {
    topIntelligences,
    primaryIntelligence,
    rawScores,
    normalizedScores,
    intelligenceProfiles,
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
    <div className="gardner-analysis-container">
      <h2 className="title">تحلیل هوش‌های چندگانه گاردنر</h2>

      <section className="summary-section">
        <p><strong>هوش‌های برتر شما: </strong> {topIntelligences.map(i => intelligenceProfiles[i]?.name || i).join("، ")}</p>
        <p><strong>هوش اصلی: </strong> {intelligenceProfiles[primaryIntelligence]?.name || primaryIntelligence}</p>
        <p><strong>خلاصه: </strong> {summary}</p>
        <p><strong>زمان تحلیل: </strong> {formattedDate}</p>
      </section>

      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <table className="scores-table">
          <thead>
            <tr>
              <th>کد هوش</th>
              <th>نام هوش</th>
              <th>امتیاز خام</th>
              <th>نمره نرمال‌شده (%)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rawScores).map(([code, rawScore]) => {
              const profile = intelligenceProfiles[code];
              return (
                <tr key={code} className={profile?.isTop ? "top-intelligence" : ""}>
                  <td>{code}</td>
                  <td>{profile?.name || "-"}</td>
                  <td>{rawScore}</td>
                  <td>{normalizedScores[code]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="profiles-section">
        <h3>توضیحات هوش‌ها</h3>
        <div className="profiles-list">
          {Object.entries(intelligenceProfiles).map(([code, profile]) => (
            <div key={code} className={`profile-card ${profile.isTop ? "top" : ""}`}>
              <h4>{profile.name} {profile.isTop && <span className="top-label">هوش برتر</span>}</h4>
              <p><strong>نام انگلیسی:</strong> {profile.englishName}</p>
              <p><strong>توضیح:</strong> {profile.description}</p>
              <p><strong>ویژگی‌ها:</strong> {profile.characteristics}</p>
              <p><strong>مشاغل پیشنهادی:</strong> {profile.careers}</p>
              <p><strong>امتیاز: </strong>{profile.score} ({profile.percentage}%)</p>
            </div>
          ))}
        </div>
      </section>

      <section className="development-section">
        <h3>پیشنهادات توسعه هوش</h3>
        {developmentSuggestions.map(({ intelligence, suggestions }) => (
          <div key={intelligence} className="development-card">
            <h4>{intelligence}</h4>
            <ul>
              {suggestions.map((sugg, idx) => (
                <li key={idx}>{sugg}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="chart-section">
        <h3>نمودار نمرات هوش‌ها</h3>
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

export default GardnerAnalysis;

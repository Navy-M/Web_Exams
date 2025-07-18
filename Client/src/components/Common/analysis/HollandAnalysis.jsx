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
import "./HollandAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const HollandAnalysis = ({ data }) => {
  if (!data) return <p>داده‌ای برای نمایش موجود نیست.</p>;

  const {
    hollandCode,
    dominantTraits,
    rawScores,
    normalizedScores,
    traits,
    careerSuggestions,
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
    <div className="holland-analysis-container">
      <h2 className="title">تحلیل آزمون هالند</h2>

      <section className="summary-section">
        <p><strong>کد هالند شما: </strong> <span className="holland-code">{hollandCode}</span></p>
        <p><strong>خلاصه: </strong> {summary}</p>
        <p><strong>زمان تحلیل: </strong> {formattedDate}</p>
      </section>

      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <table className="scores-table">
          <thead>
            <tr>
              <th>ویژگی</th>
              <th>نام</th>
              <th>امتیاز خام</th>
              <th>نمره نرمال‌شده (%)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rawScores).map(([key, rawScore]) => {
              const traitInfo = traits[key];
              return (
                <tr key={key} className={traitInfo?.isDominant ? "dominant-trait" : ""}>
                  <td>{key}</td>
                  <td>{traitInfo?.name || "-"}</td>
                  <td>{rawScore}</td>
                  <td>{normalizedScores[key]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="traits-details-section">
        <h3>توضیحات ویژگی‌ها</h3>
        <div className="traits-list">
          {Object.entries(traits).map(([key, trait]) => (
            <div
              key={key}
              className={`trait-card ${trait.isDominant ? "dominant" : ""}`}
            >
              <h4>{trait.name} {trait.isDominant && <span className="dominant-label">ویژگی غالب</span>}</h4>
              <p><strong>توضیح:</strong> {trait.description}</p>
              <p><strong>مشاغل پیشنهادی:</strong> {trait.careers}</p>
              <p><strong>امتیاز: </strong>{trait.score} ({trait.percentage}%)</p>
            </div>
          ))}
        </div>
      </section>

      <section className="career-suggestions-section">
        <h3>پیشنهادات شغلی</h3>
        <ul>
          {careerSuggestions.map((job, idx) => (
            <li key={idx}>{job}</li>
          ))}
        </ul>
      </section>

      <section className="chart-section">
        <h3>نمودار نمرات</h3>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: { stepSize: 20 },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.parsed.y}%`,
                },
              },
            },
          }}
        />
      </section>
    </div>
  );
};

export default HollandAnalysis;

import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import "./DiscAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const DiscAnalysis = ({ data }) => {
  if (!data) return <p>داده‌ای برای نمایش موجود نیست.</p>;

  const {
    rawScores,
    normalizedScores,
    dominantTraits,
    primaryTrait,
    secondaryTrait,
    traits,
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
    <div className="disc-analysis-container">
      <h2 className="title">تحلیل آزمون DISC</h2>

      <section className="summary-section">
        <p><strong>خلاصه تحلیل:</strong> {summary}</p>
        <p><strong>زمان تحلیل:</strong> {formattedDate}</p>
      </section>

      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <table className="scores-table">
          <thead>
            <tr>
              <th>ویژگی</th>
              <th>نمره خام</th>
              <th>نمره نرمال‌شده (%)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(rawScores).map((traitKey) => (
              <tr key={traitKey} className={dominantTraits.includes(traitKey) ? "dominant-row" : ""}>
                <td>{traits[traitKey].name}</td>
                <td>{rawScores[traitKey]}</td>
                <td>{normalizedScores[traitKey]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="traits-section">
        <h3>توضیح ویژگی‌ها</h3>
        <div className="traits-list">
          {Object.entries(traits).map(([key, trait]) => (
            <div
              key={key}
              className={`trait-card ${
                key === primaryTrait ? "primary" : key === secondaryTrait ? "secondary" : ""
              }`}
            >
              <h4>{trait.name}</h4>
              <p>{trait.description}</p>
              <p><strong>نمره: </strong>{trait.score} ({trait.percentile}%)</p>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-section">
        <h3>نمودار پروفایل</h3>
        <Bar data={chartData} options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { stepSize: 20 }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.parsed.y}%`
              }
            }
          }
        }} />
      </section>
    </div>
  );
};

export default DiscAnalysis;

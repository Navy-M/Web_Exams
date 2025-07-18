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
import "./MbtiAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const MbtiAnalysis = ({ data }) => {
  if (!data) return <p>داده‌ای برای نمایش موجود نیست.</p>;

  const { mbtiType, typeName, rawScores, normalizedScores, dimensions, chartData, analyzedAt } = data;

  const formattedDate = new Date(analyzedAt).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mbti-analysis-container">
      <h2 className="title">تحلیل آزمون MBTI</h2>

      <section className="summary-section">
        <p>
          <strong>نوع MBTI شما: </strong>
          <span className="mbti-type">{mbtiType}</span> - {typeName}
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
              <th>بعد</th>
              <th>سمت اول</th>
              <th>نمره خام</th>
              <th>نمره نرمال‌شده (%)</th>
              <th>سمت دوم</th>
              <th>نمره خام</th>
              <th>نمره نرمال‌شده (%)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(rawScores).map((dim) => {
              const side1 = Object.keys(rawScores[dim])[0];
              const side2 = Object.keys(rawScores[dim])[1];
              return (
                <tr key={dim}>
                  <td>{dim}</td>
                  <td>{dimensions.find(d => d.dimension === dim)?.scores[side1].name}</td>
                  <td>{rawScores[dim][side1]}</td>
                  <td>{normalizedScores[dim][side1]}</td>
                  <td>{dimensions.find(d => d.dimension === dim)?.scores[side2].name}</td>
                  <td>{rawScores[dim][side2]}</td>
                  <td>{normalizedScores[dim][side2]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="dimensions-section">
        <h3>توضیحات ابعاد شخصیتی</h3>
        <div className="dimensions-list">
          {dimensions.map(({ dimension, yourSide, difference, description }) => (
            <div key={dimension} className="dimension-card">
              <h4>
                بعد {dimension}: سمت غالب شما <span className="your-side">{yourSide}</span>
              </h4>
              <p>{description}</p>
              <p><strong>تفاوت نمرات: </strong>{difference}</p>
            </div>
          ))}
        </div>
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

export default MbtiAnalysis;

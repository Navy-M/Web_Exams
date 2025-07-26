import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import "./GHQAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const GHQAnalysis = ({ data }) => {
  if (!data) return <p>داده‌ای برای نمایش موجود نیست.</p>;

  const {
    rawScores,
    normalizedScores,
    totalScore,
    normalizedTotal,
    riskLevel,
    traits,
    chartData,
    summary,
    analyzedAt,
  } = data;

  // Generate development suggestions based on risk level and high-scoring traits
  const developmentSuggestions = Object.entries(normalizedScores)
    .filter(([_, score]) => score >= 60) // Consider traits with high scores
    .map(([trait]) => ({
      trait: traits[trait].name,
      suggestions: [
        `تمرین تکنیک‌های مدیریت ${traits[trait].name}، مانند ${trait === "Stress" ? "مدیتیشن یا تنفس عمیق" : trait === "Mood" ? "فعالیت‌های شادی‌آور" : trait === "Function" ? "برنامه‌ریزی روزانه" : "مشارکت در گروه‌های اجتماعی"}`,
        `مشاوره با متخصص برای بهبود ${traits[trait].name}`,
        `ثبت و پیگیری تغییرات در ${traits[trait].name} در طول زمان`,
      ],
    }));

  if (riskLevel === "High" || riskLevel === "Moderate") {
    developmentSuggestions.push({
      trait: "سلامت کلی",
      suggestions: [
        `مشاوره با روانشناس یا متخصص سلامت روان برای ارزیابی دقیق‌تر`,
        `ایجاد روال‌های روزانه برای کاهش استرس و بهبود خلق`,
        `تماس با پشتیبانی‌های اجتماعی یا گروه‌های حمایتی`,
      ],
    });
  }

  const formattedDate = new Date(analyzedAt).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="ghq-analysis-container">
      <h2 className="title">تحلیل آزمون سلامت عمومی (GHQ)</h2>

      <section className="summary-section">
        <p><strong>سطح خطر: </strong> {riskLevel === "High" ? "بالا (نیاز به توجه)" : riskLevel === "Moderate" ? "متوسط" : "پایین (خوب)"}</p>
        <p><strong>امتیاز کل: </strong> {totalScore} ({normalizedTotal}%)</p>
        <p><strong>خلاصه: </strong> {summary}</p>
        <p><strong>زمان تحلیل: </strong> {formattedDate}</p>
      </section>

      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <table className="scores-table">
          <thead>
            <tr>
              <th>ویژگی</th>
              <th>نام ویژگی</th>
              <th>امتیاز خام</th>
              <th>نمره نرمال‌شده (%)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rawScores).map(([trait, rawScore]) => (
              <tr key={trait} className={normalizedScores[trait] >= 60 ? "high-risk" : ""}>
                <td>{trait}</td>
                <td>{traits[trait]?.name || "-"}</td>
                <td>{rawScore}</td>
                <td>{normalizedScores[trait]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="profiles-section">
        <h3>توضیحات ویژگی‌ها</h3>
        <div className="profiles-list">
          {Object.entries(traits).map(([trait, profile]) => (
            <div key={trait} className={`profile-card ${normalizedScores[trait] >= 60 ? "high" : ""}`}>
              <h4>{profile.name} {normalizedScores[trait] >= 60 && <span className="high-label">نیاز به توجه</span>}</h4>
              <p><strong>توضیح:</strong> {profile.description}</p>
              <p><strong>امتیاز: </strong>{profile.score} ({profile.percentage}%)</p>
            </div>
          ))}
        </div>
      </section>

      <section className="development-section">
        <h3>پیشنهادات بهبود سلامت روان</h3>
        {developmentSuggestions.length > 0 ? (
          developmentSuggestions.map(({ trait, suggestions }) => (
            <div key={trait} className="development-card">
              <h4>{trait}</h4>
              <ul>
                {suggestions.map((sugg, idx) => (
                  <li key={idx}>{sugg}</li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p>هیچ پیشنهاد خاصی نیاز نیست، سلامت روانی شما در وضعیت خوبی است.</p>
        )}
      </section>

      <section className="chart-section">
        <h3>نمودار نمرات ویژگی‌ها</h3>
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
                callbacks: { label: (ctx) => `${ctx.parsed.y}%` },
              },
            },
          }}
        />
      </section>
    </div>
  );
};

export default GHQAnalysis;
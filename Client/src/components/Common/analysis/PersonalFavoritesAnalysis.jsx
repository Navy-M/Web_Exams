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
import "./PersonalFavoritesAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PersonalFavoritesAnalysis = ({ data }) => {
  if (!data || !data.frequencies || !data.traits || !data.topPreferences || !data.chartData) {
    return <p data-testid="no-data">داده‌ای برای نمایش موجود نیست.</p>;
  }

  const {
    frequencies,
    topPreferences,
    traits,
    chartData,
    summary,
    analyzedAt,
  } = data;

  // Map Persian trait name to English key
  const getTraitKey = (persianName) => {
    const traitMap = {
      سرگرمی: "Hobby",
      کار: "Work",
      اجتماعی: "Social",
      "سبک زندگی": "Lifestyle",
    };
    return traitMap[persianName] || persianName;
  };

  // Generate development suggestions based on top preferences
  const developmentSuggestions = Object.entries(topPreferences)
    .filter(([_, pref]) => pref !== null)
    .map(([trait, { value }]) => ({
      trait: traits[trait]?.name || trait,
      suggestions: [
        `افزایش مشارکت در فعالیت‌های مرتبط با ${value}`,
        `کاوش فرصت‌های جدید برای توسعه ${traits[trait]?.name || trait}، مانند دوره‌های آموزشی یا گروه‌های مرتبط`,
        `برنامه‌ریزی برای ادغام ${value} در زندگی روزمره`,
      ],
    }));

  // Prepare chart data with correct labels and datasets
  const uniqueOptions = [...new Set(
    Object.values(frequencies).flatMap((freq) => Object.keys(freq || {}))
  )]; // Handle null/undefined freq

  const formattedChartData = {
    labels: uniqueOptions.length > 0 ? uniqueOptions : ["هیچ"], // Fallback if no options
    datasets: chartData.datasets.map((dataset) => ({
      ...dataset,
      label: dataset.label, // Persian trait name (e.g., "سرگرمی")
      data: uniqueOptions.length > 0
        ? uniqueOptions.map((option) => frequencies[getTraitKey(dataset.label)]?.[option] || 0)
        : [0], // Fallback data
    })),
  };

  const formattedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "نامشخص";

  return (
    <div className="personal-favorites-analysis-container">
      <h2 className="title">تحلیل آزمون اولویت‌های شخصی</h2>

      <section className="summary-section">
        <p><strong>ترجیحات برتر: </strong> {summary || "هیچ"}</p>
        <p><strong>زمان تحلیل: </strong> {formattedDate}</p>
      </section>

      <section className="profiles-section">
        <h3>جزئیات ترجیحات</h3>
        <div className="profiles-list">
          {Object.entries(traits).map(([traitKey, profile]) => (
            <div key={traitKey} className={`profile-card ${profile.topPreference !== "هیچ" ? "top" : ""}`}>
              <h4>{profile.name} {profile.topPreference !== "هیچ" && <span className="top-label">ترجیح برتر</span>}</h4>
              <p><strong>توضیح:</strong> {profile.description || "نامشخص"}</p>
              <p><strong>ترجیح برتر:</strong> {profile.topPreference || "هیچ"}</p>
              <p><strong>تکرار انتخاب‌ها:</strong></p>
              <ul>
                {Object.entries(profile.frequency || {}).map(([value, count]) => (
                  <li key={value}>{`${value}: ${count} بار`}</li>
                ))}
                {Object.keys(profile.frequency || {}).length === 0 && <li>هیچ انتخابی ثبت نشده</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="development-section">
        <h3>پیشنهادات برای تقویت ترجیحات</h3>
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
          <p>هیچ ترجیح برتری شناسایی نشد.</p>
        )}
      </section>

      <section className="chart-section">
        <h3>نمودار ترجیحات</h3>
        <Bar
          data={formattedChartData}
          options={{
            responsive: true,
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
            plugins: {
              legend: { display: true, position: "top" },
              tooltip: {
                callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} بار` },
              },
            },
          }}
        />
      </section>
    </div>
  );
};

export default PersonalFavoritesAnalysis;
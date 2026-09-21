import React from "react";
import ShowAnalysis from "../../components/Common/ShowAnalysis";
import { buildChartModel } from "../../utils/chartAdapters";
import { PrintDocument } from "../../print/PrintKit";
import "./chartValidation.css";

const samples = {
  MBTI: { normalizedScores: { EI: { E: 57, I: 63 }, SN: { S: 56, N: 64 }, TF: { T: 66, F: 54 }, JP: { J: 74, P: 46 } }, mbtiType: "INTJ", dimensions: [] },
  DISC: { normalizedScores: { D: 51, I: 49, S: 47, C: 51 }, traits: { D: { name: "سلطه‌گری" }, I: { name: "تأثیرگذاری" }, S: { name: "ثبات" }, C: { name: "وظیفه‌شناسی" } } },
  HOLLAND: { normalizedScores: { R: 59, I: 65, A: 58, S: 56, E: 24, C: 29 } },
  GARDNER: { normalizedScores: { L: 51, M: 60, S: 52, B: 51, Mu: 50, I: 55, In: 52, N: 51 } },
  CLIFTON: { normalizedScores: { Communication: 13, Includer: 9, Analytical: 6, Individualization: 5, Belief: 5, Competition: 5, Input: 4, Focus: 4, Strategic: 4, Consistency: 4, Positivity: 2, Learner: 2 } },
  GHQ: { normalizedScores: { Stress: 60, Mood: 67, Function: 73, Social: 40 }, rawScores: { Stress: 6, Mood: 10, Function: 11, Social: 2 }, riskLevel: "Moderate", totalScore: 29, normalizedTotal: 64 },
  PERSONAL_FAVORITES: { normalizedScores: { Work: 69 }, dataForUI: { traits: ["Work"] } },
};

export default function ChartValidationPage() {
  if (new URLSearchParams(window.location.search).get("mode") === "print") {
    const results = Object.entries(samples).map(([testType, analysis], index) => ({
      _id: `validation-${index}`,
      testType,
      analysis,
      createdAt: new Date().toISOString(),
    }));
    return (
      <div id="print-root">
        <PrintDocument
          user={{ username: "chart-validation", profile: { fullName: "کاربر نمونه اعتبارسنجی" } }}
          results={results}
          formatDate={(value) => new Date(value).toLocaleDateString("fa-IR")}
        />
      </div>
    );
  }

  return (
    <main className="chart-validation" dir="rtl">
      <header>
        <h1>اعتبارسنجی نمودارهای گزارش</h1>
        <p>این صفحه فقط در محیط توسعه در دسترس است.</p>
      </header>
      {Object.entries(samples).map(([testType, source]) => {
        const normalized = buildChartModel(testType, source);
        return (
          <section className="chart-validation__case" key={testType} data-validation-test={testType}>
            <h2>{testType}</h2>
            <details>
              <summary>داده خام و قرارداد نهایی</summary>
              <div className="chart-validation__data">
                <pre>{JSON.stringify(source, null, 2)}</pre>
                <pre>{JSON.stringify(normalized, null, 2)}</pre>
              </div>
            </details>
            <ShowAnalysis testType={testType} analysisData={source} />
          </section>
        );
      })}
    </main>
  );
}

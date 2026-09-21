import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Chart } from "chart.js";
import "./ReportChart.css";

Chart.defaults.animation = false;

const ReportChart = forwardRef(function ReportChart(
  { children, testType, height = 320, className = "", onChartReady },
  forwardedRef
) {
  const rootRef = useRef(null);
  const [snapshot, setSnapshot] = useState("");

  const setRootRef = useCallback((node) => {
    rootRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  useEffect(() => {
    let cancelled = false;
    let frameOne = 0;
    let frameTwo = 0;

    const capture = () => {
      const canvas = rootRef.current?.querySelector("canvas");
      if (!canvas || canvas.width < 2 || canvas.height < 2) return;
      const chart = Chart.getChart(canvas);
      chart?.resize();
      chart?.update("none");
      try {
        const image = canvas.toDataURL("image/png", 1);
        if (!cancelled && image && image !== "data:,") {
          setSnapshot(image);
          rootRef.current.dataset.chartReady = "true";
          onChartReady?.(testType);
          window.dispatchEvent(new CustomEvent("report-chart-ready", { detail: { testType } }));
        }
      } catch {
        rootRef.current.dataset.chartReady = "false";
      }
    };

    const scheduleCapture = () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      frameOne = requestAnimationFrame(() => {
        frameTwo = requestAnimationFrame(capture);
      });
    };

    Promise.resolve(document.fonts?.ready).then(scheduleCapture);
    const observer = new ResizeObserver(scheduleCapture);
    if (rootRef.current) observer.observe(rootRef.current);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      observer.disconnect();
    };
  }, [children, onChartReady, testType]);

  return (
    <div
      ref={setRootRef}
      className={`chart-wrap report-chart ${className}`.trim()}
      style={{ "--report-chart-height": `${height}px` }}
      data-report-chart={testType}
      data-chart-ready={snapshot ? "true" : "false"}
    >
      <div className="report-chart__live">{children}</div>
      {snapshot && <img className="report-chart__snapshot" src={snapshot} alt={`نمودار ${testType}`} />}
    </div>
  );
});

ReportChart.propTypes = {
  children: PropTypes.node.isRequired,
  testType: PropTypes.string.isRequired,
  height: PropTypes.number,
  className: PropTypes.string,
  onChartReady: PropTypes.func,
};

export default ReportChart;

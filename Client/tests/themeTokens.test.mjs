import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/styles/theme-system.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const rgb = (hex) => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
};
const luminance = (hex) => {
  const channels = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
};
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};

test("theme stylesheet defines central light, dark, status and chart tokens", () => {
  for (const token of ["--background-default", "--background-paper", "--text-primary", "--text-muted", "--border-default", "--primary-main", "--success", "--warning", "--error", "--info", "--chart-axis", "--chart-grid"]) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /@media print/);
});

test("core light and dark text combinations satisfy WCAG AA", () => {
  const combinations = [
    ["#1f2937", "#f7f8fa"], ["#5b6879", "#ffffff"], ["#64748b", "#ffffff"],
    ["#e6edf3", "#0f141a"], ["#b3bec9", "#171d24"], ["#9aa7b4", "#171d24"],
    ["#ffffff", "#2457c5"], ["#111820", "#79a6ff"],
  ];
  combinations.forEach(([foreground, background]) => assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background}`));
});

test("theme is initialized before the React entry script to prevent a startup flash", () => {
  assert.ok(html.indexOf("document.documentElement.dataset.theme") < html.indexOf('/src/main.jsx'));
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /localStorage\.getItem\("theme"\)/);
});

import type { ParentReportContent } from "@child-health/contracts";

const DISCLAIMER = "本内容为健康科普，不替代医生面诊。";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderPosterSvg(content: ParentReportContent): string {
  const bulletLines = content.posterBullets
    .map((bullet, index) => `<text x="72" y="${250 + index * 48}" class="bullet">- ${escapeXml(bullet)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960" role="img" aria-label="${escapeXml(
    content.posterTitle
  )}">
  <style>
    .title { font: 700 44px sans-serif; fill: #17453f; }
    .summary { font: 400 26px sans-serif; fill: #243b36; }
    .bullet { font: 500 30px sans-serif; fill: #1f4f8a; }
    .disclaimer { font: 400 22px sans-serif; fill: #5f6f6a; }
  </style>
  <rect width="720" height="960" rx="0" fill="#f7fbf7"/>
  <rect x="40" y="40" width="640" height="880" rx="8" fill="#ffffff" stroke="#d9e6df"/>
  <text x="72" y="132" class="title">${escapeXml(content.posterTitle)}</text>
  <text x="72" y="196" class="summary">${escapeXml(content.summary)}</text>
  ${bulletLines}
  <text x="72" y="860" class="disclaimer">${DISCLAIMER}</text>
</svg>`;
}

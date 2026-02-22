document.getElementById("dashboardBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:5173" });
});

function manipColor(score) {
  if (score > 66) return "#b91c1c";
  if (score > 33) return "#b45309";
  return "#15803d";
}

const POLITICAL_COLORS = {
  "left":          "#1d4ed8",
  "liberal":       "#0369a1",
  "right":         "#b91c1c",
  "conservative":  "#b45309",
  "authoritarian": "#7e22ce",
  "libertarian":   "#a16207",
  "centrist":      "#475569",
  "unclear":       "#94a3b8"
};
chrome.storage.local.get(["feedAnalysis", "lastUpdated", "tweetCount"], (result) => {
  if (!result.feedAnalysis) return;

  const data = result.feedAnalysis;
  const ago = Math.round((Date.now() - result.lastUpdated) / 1000);
  const score = data.overall_manipulation_score ?? 0;
  const color = manipColor(score);

  const topTopics = Object.entries(data.topics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const politicalBreakdown = Object.entries(data.political_breakdown || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([, pct]) => pct > 0);

  document.getElementById("main").innerHTML = `
    <!-- Manipulation Score -->
    <div class="score-section">
      <div class="score-label">manipulation score</div>
      <div class="score-row">
        <div class="score-number" style="color:${color}">${score}</div>
        <div style="flex:1">
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width:${score}%;background:${color}"></div>
          </div>
          <div style="color:#94a3b8;font-size:9px;margin-top:3px">${
            score > 66 ? "high manipulation detected" :
            score > 33 ? "moderate signals present" :
            "feed looks relatively clean"
          }</div>
        </div>
      </div>
    </div>

    <!-- Political Breakdown -->
    ${politicalBreakdown.length > 0 ? `
      <div class="section-label">political breakdown</div>
      ${politicalBreakdown.map(([lean, pct]) => `
        <div class="topic-row">
          <div class="topic-name" style="color:${POLITICAL_COLORS[lean] || '#94a3b8'}">${lean}</div>
          <div class="topic-bar-track">
            <div class="topic-bar-fill" style="width:${pct}%;background:${POLITICAL_COLORS[lean] || '#94a3b8'}"></div>
          </div>
          <div class="topic-pct">${pct}%</div>
        </div>
      `).join("")}
    ` : ""}

    <!-- Topics -->
    ${topTopics.length > 0 ? `
      <div class="section-label" style="margin-top:10px">top topics</div>
      ${topTopics.map(([topic, pct]) => `
        <div class="topic-row">
          <div class="topic-name">${topic}</div>
          <div class="topic-bar-track">
            <div class="topic-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="topic-pct">${pct}%</div>
        </div>
      `).join("")}
    ` : ""}

    <div class="status">analyzed ${ago}s ago · ${result.tweetCount || 0} tweets total</div>
  `;
});
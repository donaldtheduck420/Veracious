const tweetCache = new Map();
let isAnalyzing = false;

const POLITICAL_STYLES = {
  "left":          { bg: "#dbeafe", color: "#1d4ed8", label: "left" },
  "right":         { bg: "#fee2e2", color: "#b91c1c", label: "right" },
  "liberal":       { bg: "#e0f2fe", color: "#0369a1", label: "liberal" },
  "conservative":  { bg: "#fef3c7", color: "#b45309", label: "conservative" },
  "authoritarian": { bg: "#f3e8ff", color: "#7e22ce", label: "authoritarian" },
  "libertarian":   { bg: "#fef9c3", color: "#a16207", label: "libertarian" },
  "centrist":      { bg: "#f1f5f9", color: "#475569", label: "centrist" },
  "unclear":       { bg: "#f8fafc", color: "#94a3b8", label: "unclear" }
};

function manipColor(score) {
  if (score > 66) return { bg: "#fee2e2", color: "#b91c1c" };
  if (score > 33) return { bg: "#fef3c7", color: "#b45309" };
  return { bg: "#dcfce7", color: "#15803d" };
}

function buildTag(analysis) {
  const political = (analysis.political_lean || "unclear").toLowerCase();
  const style = POLITICAL_STYLES[political] || POLITICAL_STYLES["unclear"];
  const score = analysis.manipulation_score ?? 0;
  const mc = manipColor(score);

  const tag = document.createElement("div");
  tag.className = "veracious-tag";
  tag.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-bottom: 7px;
    background: white;
    border: 1.5px solid #e2e8f0;
    border-radius: 999px;
    padding: 2px 3px 2px 3px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    gap: 3px;
  `;

  tag.innerHTML = `
    <span style="
      background: ${style.bg};
      color: ${style.color};
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      letter-spacing: 0.01em;
    ">${style.label}</span>
    <span style="
      color: #cbd5e1;
      font-size: 11px;
      font-family: monospace;
      padding: 0 1px;
    ">|</span>
    <span style="
      background: ${mc.bg};
      color: ${mc.color};
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      letter-spacing: 0.01em;
    "">mani: ${score}%</span>
  `;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "margin-bottom: 6px;";
  wrapper.appendChild(tag);
  return wrapper;
}

function injectCachedTags() {
  for (const el of document.querySelectorAll('[data-testid="tweetText"]')) {
    const text = el.innerText.trim();
    if (!text || el.querySelector(".veracious-tag")) continue;
    if (tweetCache.has(text)) {
      el.prepend(buildTag(tweetCache.get(text)));
    }
  }
}

async function analyzeFeed() {
  if (isAnalyzing) return;

  injectCachedTags();

  const tweetElements = [...document.querySelectorAll('[data-testid="tweetText"]')]
    .filter(el => {
      const text = el.innerText.trim();
      return (
        text.length > 10 &&
        !tweetCache.has(text) &&
        !el.querySelector(".veracious-tag")
      );
    })
    .slice(0, 3)

  if (tweetElements.length === 0) return;

  isAnalyzing = true;

  tweetElements.forEach(el => {
    const placeholder = document.createElement("div");
    placeholder.className = "veracious-tag veracious-pending";
    placeholder.style.cssText = "height:0;overflow:hidden;";
    el.appendChild(placeholder);
  });

  const tweets = tweetElements.map(el => el.innerText.trim());
  console.log(`Veracious: analyzing ${tweets.length} tweets...`);

  chrome.runtime.sendMessage(
    { type: "ANALYZE_TWEETS", tweets },
    (response) => {
      isAnalyzing = false;

      tweetElements.forEach(el => {
        const pending = el.querySelector(".veracious-pending");
        if (pending) pending.remove();
      });

      if (!response?.success) {
        console.error("Veracious: failed —", response?.error);
        return;
      }

      const data = response.data;

      if (data.per_tweet) {
        data.per_tweet.forEach((analysis, i) => {
          const text = tweets[i];
          const el = tweetElements[i];
          if (!text || !el) return;

          tweetCache.set(text, analysis);

          if (!el.querySelector(".veracious-tag")) {
            el.prepend(buildTag(analysis));
          }
        });
      }

      const leanCounts = {};
      tweetCache.forEach(a => {
        const lean = (a.political_lean || "unclear").toLowerCase();
        leanCounts[lean] = (leanCounts[lean] || 0) + 1;
      });
      const total = Object.values(leanCounts).reduce((a, b) => a + b, 0);
      const leanPct = {};
      for (const [k, v] of Object.entries(leanCounts)) {
        leanPct[k] = Math.round((v / total) * 100);
      }

      chrome.storage.local.set({
        feedAnalysis: { ...data, political_breakdown: leanPct },
        tweetCount: tweetCache.size,
        lastUpdated: Date.now()
      });
    }
  );
}

let debounceTimer;
const observer = new MutationObserver(() => {
  injectCachedTags();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    analyzeFeed();
  }, 2000);
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(analyzeFeed, 500);
console.log("Veracious: loaded");
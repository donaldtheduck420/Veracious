import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const API = "http://localhost:8000";

const THEME = {
  bg:         "#0d0d0d",
  panel:      "#1e1e1e",
  panel2:     "#252526",
  border:     "#3c3f41",
  borderLight:"#4b4f52",
  text:       "#a9b7c6",
  textBright: "#e8eaec",
  textDim:    "#6e7478",
  yellow:     "#ffc66d",
  green:      "#6a8759",
  greenBright:"#8aad6f",
  blue:       "#6897bb",
  orange:     "#cc7832",
  red:        "#ff6b68",
  purple:     "#9876aa",
  cyan:       "#299999",
};

const POLITICAL_COLORS = {
  left:          "#6897bb",
  liberal:       "#299999",
  right:         "#ff6b68",
  conservative:  "#cc7832",
  authoritarian: "#9876aa",
  libertarian:   "#ffc66d",
  centrist:      "#6e7478",
  unclear:       "#3c3f41",
};

function manipColor(s) {
  if (s > 66) return THEME.red;
  if (s > 33) return THEME.orange;
  return THEME.greenBright;
}
function manipLabel(s) {
  if (s > 66) return "HIGH RISK";
  if (s > 33) return "MODERATE";
  return "CLEAN";
}

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: THEME.panel2, border: `1px solid ${THEME.border}`,
      padding: "8px 12px", borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      boxShadow: "0 4px 16px rgba(0,0,0,0.6)"
    }}>
      <div style={{ color: THEME.textBright, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || THEME.blue }}>
          {p.value}%
        </div>
      ))}
    </div>
  );
};

function LoadingBar({ label = "analyzing your session..." }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ color: THEME.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ width: "100%", height: 3, background: THEME.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          borderRadius: 2,
          background: `linear-gradient(90deg, ${THEME.yellow}44, ${THEME.yellow}, ${THEME.yellow}44)`,
          backgroundSize: "200% auto",
          animation: "progress 8s ease forwards, shimmer 1.5s linear infinite",
        }} />
      </div>
    </div>
  );
}

function SimilarTweets() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/similar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query, top_k: 5 })
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { }
    setSearching(false);
  };

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
      <div style={{ color: THEME.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        semantic search — find similar tweets
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="type a topic or phrase..."
          style={{
            flex: 1, background: THEME.bg, border: `1px solid ${THEME.border}`,
            color: THEME.text, fontFamily: "JetBrains Mono", fontSize: 11,
            padding: "6px 10px", borderRadius: 3, outline: "none"
          }}
        />
        <button onClick={search} style={{
          background: "transparent", border: `1px solid ${THEME.border}`,
          color: THEME.yellow, fontFamily: "JetBrains Mono", fontSize: 11,
          padding: "6px 12px", borderRadius: 3, cursor: "pointer"
        }}>
          {searching ? "..." : "search"}
        </button>
      </div>
      {results.map((r, i) => (
        <div key={i} style={{
          padding: "6px 10px", marginBottom: 4, background: THEME.bg,
          border: `1px solid ${THEME.border}`, borderRadius: 3,
          fontSize: 11, color: THEME.text, lineHeight: 1.6
        }}>
          <span style={{ color: THEME.greenBright, marginRight: 8 }}>
            {Math.round(r.score * 100)}%
          </span>
          {r.text}
        </div>
      ))}
    </div>
  );
}

function SpinningDonut({ topicData, TOPIC_COLORS }) {
  const [rotation, setRotation] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const rotationRef = useRef(0);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    const animate = (timestamp) => {
      if (!isHovered) {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = timestamp; // initialize without skipping
        }
        const delta = timestamp - lastTimeRef.current;
        rotationRef.current = (rotationRef.current + delta * 0.03) % 360;
        setRotation(rotationRef.current);
        lastTimeRef.current = timestamp;
      } else {
        lastTimeRef.current = null;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: "pointer" }}
    >
      <ResponsiveContainer width="100%" height={500}>
        <PieChart>
          <Pie
            data={topicData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={150}
            paddingAngle={3}
            dataKey="value"
            startAngle={rotation}
            endAngle={rotation + 360}
          >
            {topicData.map((_, i) => (
              <Cell key={i} fill={TOPIC_COLORS[i % 6]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={v => (
              <span style={{ color: THEME.textDim, fontSize: 10, fontFamily: "JetBrains Mono" }}>{v}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PoliticalCompass({ tweets }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const pad = 52;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    const qFills = [
      { x: pad,  y: pad,  w: innerW/2, h: innerH/2, color: "#1a1f2e" }, // auth left — blue tint
      { x: cx,   y: pad,  w: innerW/2, h: innerH/2, color: "#2e1a1a" }, // auth right — red tint
      { x: pad,  y: cy,   w: innerW/2, h: innerH/2, color: "#1a2e20" }, // lib left — green tint
      { x: cx,   y: cy,   w: innerW/2, h: innerH/2, color: "#2e2a1a" }, // lib right — orange tint
    ];
    qFills.forEach(q => {
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.w, q.h);
    });

    ctx.strokeStyle = THEME.borderLight;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, innerW, innerH);

    ctx.strokeStyle = THEME.borderLight;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(cx, pad); ctx.lineTo(cx, H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(W - pad, cy); ctx.stroke();

    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = THEME.text;
    ctx.textAlign = "center";
    ctx.fillText("AUTHORITARIAN", cx, pad - 10);
    ctx.fillText("LIBERTARIAN",   cx, H - pad + 16);
    ctx.textAlign = "left";  ctx.fillText("LEFT",  pad + 6, cy - 8);
    ctx.textAlign = "right"; ctx.fillText("RIGHT", W - pad - 6, cy - 8);

    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillStyle = THEME.borderLight;
    ctx.textAlign = "left";  ctx.fillText("AUTH LEFT",  pad + 7, pad + 16);
    ctx.textAlign = "right"; ctx.fillText("AUTH RIGHT", W - pad - 7, pad + 16);
    ctx.textAlign = "left";  ctx.fillText("LIB LEFT",   pad + 7, H - pad - 8);
    ctx.textAlign = "right"; ctx.fillText("LIB RIGHT",  W - pad - 7, H - pad - 8);

    const hasPositions = tweets.some(
      t => t.political_lean !== "unclear" && (t.political_lean_x != null || t.political_lean_y != null)
    );

    if (!hasPositions || tweets.length === 0) {
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = THEME.textDim;
      ctx.textAlign = "center";
      ctx.fillText("unclear — no strong political signals detected", cx, cy + 5);
      return;
    }

    tweets.forEach(t => {
      if (t.political_lean === "unclear") return;
      const xv = t.political_lean_x ?? 0;
      const yv = t.political_lean_y ?? 0;
      const px = cx + xv * (innerW / 2 - 16);
      const py = cy - yv * (innerH / 2 - 16);
      const score = t.manipulation_score ?? 0;
      const r = 4 + (score / 100) * 5;
      const col = POLITICAL_COLORS[(t.political_lean || "unclear").toLowerCase()] || THEME.textDim;

      const grd = ctx.createRadialGradient(px, py, 0, px, py, r + 6);
      grd.addColorStop(0, col + "55");
      grd.addColorStop(1, col + "00");
      ctx.beginPath();
      ctx.arc(px, py, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = col + "ee";
      ctx.fill();
      ctx.strokeStyle = THEME.textBright;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillStyle = THEME.textDim;
    ctx.textAlign = "left";
    ctx.fillText("dot size = manipulation score", pad + 4, H - 6);

  }, [tweets]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={320}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}

export default function App() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [audioUrl, setAudioUrl]       = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const [fullReport, setFullReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/results`)
      .then(r => { if (!r.ok) throw new Error("No analysis yet"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });

    fetch(`${API}/full-report`, { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(report => {
        if (report) setFullReport(report);
        setReportLoading(false);
      })
      .catch(() => setReportLoading(false));
  }, []);

  const handleAudio = async () => {
    // If playing, stop it
    if (audioPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setAudioPlaying(false);
      return;
    }

    // If we already have the audio, just play it
    if (audioUrl) {
      const a = new Audio(audioUrl);
      audioRef.current = a;
      a.play();
      setAudioPlaying(true);
      a.onended = () => setAudioPlaying(false);
      return;
    }

    // Fetch from backend
    setAudioLoading(true);
    try {
      const res = await fetch(`${API}/audio`);
      if (!res.ok) throw new Error("unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const a = new Audio(url);
      audioRef.current = a;
      a.play();
      setAudioPlaying(true);
      a.onended = () => setAudioPlaying(false);
    } catch {
      setAudioPlaying(false);
      alert("audio unavailable — ElevenLabs not yet configured");
    }
    setAudioLoading(false);
  };

  if (loading) return (
    <div style={S.centered}>
      <div style={{ width: 280 }}>
        <LoadingBar label="loading feed analysis..." />
      </div>
    </div>
  );

  if (error) return (
    <div style={S.centered}>
      <div style={{ color: THEME.red, fontFamily: "JetBrains Mono", fontSize: 13 }}>{error}!</div>
      <div style={{ color: THEME.textDim, fontFamily: "JetBrains Mono", fontSize: 11, marginTop: 8 }}>
        open x.com and scroll your feed first
      </div>
    </div>
  );

  const score      = data.overall_manipulation_score ?? 0;
  const mc         = manipColor(score);
  const perTweet   = data.per_tweet || [];
  const ago        = data.timestamp ? Math.round(Date.now() / 1000 - data.timestamp) : null;
  const totalTweets = perTweet.length;
  const politicalTweets = perTweet.filter(t => t.political_lean && t.political_lean !== "unclear").length;
  const politicalPct = totalTweets > 0 ? Math.round((politicalTweets / totalTweets) * 100) : 0;
  const topLean    = Object.entries(data.political_breakdown || {})
    .filter(([k]) => k !== "unclear").sort((a,b) => b[1]-a[1])[0]?.[0] || null;
  const topTopic   = Object.entries(data.topics || {}).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

  const emotionData = Object.entries(data.emotional_tone || {}).map(([k,v]) => ({ name: k, value: v }));
  const manipData   = Object.entries(data.manipulation_signals || {}).map(([k,v]) => ({ name: k.replace(/_/g," "), value: v }));
  const rawTopics = Object.entries(data.topics || {}).sort((a,b) => b[1]-a[1]).slice(0,6);
  const topicTotal = rawTopics.reduce((sum, [,v]) => sum + v, 0);
  const topicData = rawTopics.map(([k,v]) => ({ 
    name: k, 
    value: topicTotal > 0 ? Math.round((v / topicTotal) * 100) : v 
  }));

  const EMOTION_COLORS = [THEME.red, THEME.greenBright, THEME.orange, THEME.textDim];
  const TOPIC_COLORS   = [THEME.blue, THEME.cyan, THEME.orange, THEME.greenBright, THEME.purple, THEME.yellow];

  return (
    <div style={S.root}>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <span style={S.toolbarLogo}>Veracious</span>
          <span style={S.toolbarSep}>|</span>
          <span style={S.toolbarItem}>Feed Report</span>
          <span style={S.toolbarSep}>|</span>
          <span style={{ ...S.toolbarItem, color: THEME.textDim }}>{ago ? `${ago}s ago` : "live"}</span>
        </div>
        <button
          onClick={handleAudio}
          disabled={audioLoading}
          style={{ ...S.toolbarBtn, ...(audioPlaying ? { color: THEME.greenBright, borderColor: THEME.green } : {}) }}
        >
          {audioLoading ? "generating..." : audioPlaying ? "▶ playing..." : "▶ audio digest"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        <div style={S.tabActive}>
          <span style={{ color: THEME.yellow, marginRight: 6 }}>📊</span>
          FeedAnalysis.report
        </div>
      </div>

      <main style={S.main}>

        {/* Hero row */}
        <div style={S.heroRow}>

          {/* Score */}
          <div style={{ ...S.card, minWidth: 190 }}>
            <div style={S.cardLabel}>manipulation score</div>
            <div style={{ ...S.heroNum, color: mc }}>
              <AnimatedNumber value={score} />
            </div>
            <div style={{ ...S.badge, background: mc + "33", color: mc, border: `1px solid ${mc}66` }}>
              {manipLabel(score)}
            </div>
            <div style={S.heroBar}>
              <div style={{ ...S.heroBarFill, width: `${score}%`, background: `linear-gradient(90deg,${mc}88,${mc})` }} />
            </div>
            <div style={{ color: THEME.textDim, fontSize: 10, marginTop: 8 }}>
              {score > 66 ? "high manipulation detected"
                : score > 33 ? "moderate signals present"
                : "feed looks relatively clean"}
            </div>
          </div>

          {/* Session summary */}
          <div style={{ ...S.card, flex: 2 }}>
            <div style={S.cardLabel}>session summary</div>

            {/* Stats row */}
            <div style={S.summaryStats}>
              {[
                { label: "tweets analyzed",  val: totalTweets,          color: THEME.yellow },
                { label: "political content", val: `${politicalPct}%`,  color: topLean ? POLITICAL_COLORS[topLean] : THEME.textDim },
                { label: "avg manipulation",  val: `${score}%`,          color: mc },
                { label: "top topic",         val: topTopic || "—",      color: THEME.cyan },
              ].map((s, i) => (
                <div key={i} style={{ display: "contents" }}>
                  {i > 0 && <div style={S.statDivider} />}
                  <div style={S.statBlock}>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{s.val}</div>
                    <div style={{ color: THEME.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feed summary — what actually happened */}
            {!reportLoading && fullReport ? (
              <div style={S.feedSummaryBox}>
                <div style={{ color: THEME.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                  full session report
                </div>
                {[
                  { key: "narrative_summary",     label: "what you scrolled" },
                  { key: "political_analysis",    label: "political landscape" },
                  { key: "manipulation_analysis", label: "manipulation patterns" },
                  { key: "recommendations",       label: "recommendations" },
                  { key: "notable_patterns", label: "notable patterns" },
                ].map(({ key, label }) => fullReport[key] ? (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ color: THEME.yellow, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ color: THEME.text, fontSize: 11, lineHeight: 1.8 }}>
                      {fullReport[key]}
                    </div>
                  </div>
                ) : null)}
              </div>
            ) : reportLoading ? (
              <div style={S.feedSummaryBox}>
                <LoadingBar label="generating full report..." />
              </div>
            ) : (
              <div style={S.feedSummaryBox}>
                <div style={{ color: THEME.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  what you scrolled
                </div>
                <div style={{ color: THEME.text, fontSize: 12, lineHeight: 1.8 }}>
                  {data.feed_summary || "analyzing..."}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Charts grid */}
        <div style={S.grid}>

          {/* Political compass */}
          <div style={S.card}>
            <div style={S.cardLabel}>political compass</div>
            <PoliticalCompass tweets={perTweet} />
          </div>

          {/* Topic donut */}
          <div style={S.card}>
            <div style={S.cardLabel}>topic clusters</div>
            <SpinningDonut topicData={topicData} TOPIC_COLORS={TOPIC_COLORS} />
          </div>

          {/* Emotional tone */}
          <div style={S.card}>
            <div style={S.cardLabel}>emotional tone</div>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={emotionData} margin={{ top: 8, right: 8, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: THEME.textDim, fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis tick={{ fill: THEME.textDim, fontSize: 9, fontFamily: "JetBrains Mono" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[3,3,0,0]}>
                  {emotionData.map((_,i) => <Cell key={i} fill={EMOTION_COLORS[i%4]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Manipulation signals */}
          <div style={S.card}>
            <div style={S.cardLabel}>manipulation signals</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={manipData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <XAxis type="number" domain={[0,100]} tick={{ fill: THEME.textDim, fontSize: 9, fontFamily: "JetBrains Mono" }} />
                <YAxis type="category" dataKey="name" tick={{ fill: THEME.text, fontSize: 10, fontFamily: "JetBrains Mono" }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0,3,3,0]}>
                  {manipData.map((e,i) => <Cell key={i} fill={manipColor(e.value)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tweet list */}
        <div style={{ ...S.card, gridColumn: "1 / -1", maxHeight: 280, overflowY: "auto" }}>
          <div style={S.cardLabel}>tweets this session · {perTweet.length} total</div>
          {perTweet.map((t, i) => {
            const tc = manipColor(t.manipulation_score ?? 0);
            const pc = POLITICAL_COLORS[(t.political_lean || "unclear").toLowerCase()] || THEME.textDim;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", marginBottom: 4,
                background: THEME.panel2, border: `1px solid ${THEME.border}`,
                borderRadius: 3, gap: 12
              }}>
                <div style={{ fontSize: 11, color: THEME.text, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.full_text || t.text_preview || "..."}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: pc + "22", color: pc, border: `1px solid ${pc}44` }}>
                    {t.political_lean || "unclear"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: tc + "22", color: tc, border: `1px solid ${tc}44` }}>
                    mani: {t.manipulation_score ?? 0}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        </div>

        {/* Status bar */}
        <div style={S.statusBar}>
          <span style={{ color: THEME.greenBright }}>● ready</span>
          <span style={S.statusSep}>|</span>
          <span>{data.per_tweet?.length || 0} tweets analyzed</span>
          <span style={S.statusSep}>|</span>
          <span style={{ color: mc }}>manipulation: {manipLabel(score)}</span>
          <span style={{ marginLeft: "auto", color: THEME.textDim }}>Veracious v1.0</span>
        </div>

      </main>
    </div>
  );
}

const S = {
  root: { width: "100%", minHeight: "100vh", background: THEME.bg, color: THEME.text, fontFamily: "'JetBrains Mono','Consolas',monospace", display: "flex", flexDirection: "column" },
  centered: { width: "100%", minHeight: "100vh", background: THEME.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  toolbar: { width: "100%", background: "#1e1e1e", borderBottom: `1px solid ${THEME.border}`, padding: "0 20px", height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 12 },
  toolbarLogo: { color: THEME.yellow, fontWeight: 700, fontSize: 13, letterSpacing: "0.05em" },
  toolbarSep: { color: THEME.border },
  toolbarItem: { color: THEME.text, fontSize: 12 },
  toolbarBtn: { background: "transparent", border: `1px solid ${THEME.border}`, color: THEME.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "5px 14px", borderRadius: 3, cursor: "pointer" },
  tabBar: { display: "flex", background: THEME.panel2, borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 },
  tabActive: { padding: "8px 20px", background: THEME.bg, borderRight: `1px solid ${THEME.border}`, borderTop: `2px solid ${THEME.yellow}`, color: THEME.textBright, fontSize: 12, display: "flex", alignItems: "center" },
  main: { flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 },
  heroRow: { display: "flex", gap: 16, alignItems: "stretch" },
  card: { background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 4, padding: "16px 18px" },
  cardLabel: { fontSize: 10, color: THEME.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 },
  heroNum: { fontSize: 60, fontWeight: 700, lineHeight: 1, marginBottom: 8 },
  badge: { display: "inline-block", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 3, letterSpacing: "0.08em", marginBottom: 10 },
  heroBar: { height: 4, background: THEME.panel2, borderRadius: 2, overflow: "hidden" },
  heroBarFill: { height: "100%", borderRadius: 2, transition: "width 1s ease" },
  summaryStats: { display: "flex", alignItems: "center", marginBottom: 16 },
  statBlock: { flex: 1, textAlign: "center", padding: "0 10px" },
  statDivider: { width: 1, height: 52, background: THEME.border, flexShrink: 0 },
  feedSummaryBox: { background: THEME.panel2, border: `1px solid ${THEME.border}`, borderRadius: 3, padding: "12px 14px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  statusBar: { display: "flex", alignItems: "center", gap: 12, background: THEME.panel2, border: `1px solid ${THEME.border}`, borderRadius: 4, padding: "8px 16px", fontSize: 10, color: THEME.textDim, flexShrink: 0 },
  statusSep: { color: THEME.border },
};

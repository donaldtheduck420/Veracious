chrome.runtime.onInstalled.addListener(() => {
  console.log("Veracious installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_TWEETS") {
    fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweets: request.tweets })
    })
      .then(async res => {
        if (res.status === 429) {
          const data = await res.json();
          console.warn("Veracious: rate limited —", data.detail);
          sendResponse({ success: false, rateLimited: true, error: data.detail });
          return;
        }
        const data = await res.json();
        sendResponse({ success: true, data });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
});
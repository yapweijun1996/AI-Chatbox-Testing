/**
 * Direct API Stream Client for OpenAI-compatible completions.
 */
async function streamChatCompletion(config, messages, onChunk, signal) {
  const streamStartTime = performance.now();
  let firstTokenReceived = false;
  let ttft = 0;
  let fbl = 0;
  let aiResponse = "";

  const apiPayload = {
    model: config.model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: true
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deobfuscate(config.apiKey)}`
    },
    body: JSON.stringify(apiPayload),
    signal: signal
  });

  fbl = performance.now() - streamStartTime; // Connection / First Byte Latency

  if (!response.ok) {
    throw new Error(`API Error (${response.status}): ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned === "data: [DONE]") continue;
      if (cleaned.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(cleaned.slice(6));
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if (!firstTokenReceived && delta.trim().length > 0) {
            firstTokenReceived = true;
            ttft = performance.now() - streamStartTime;
          }
          if (delta) {
            aiResponse += delta;
            onChunk({ delta, fullText: aiResponse });
          }
        } catch (err) {
          // Ignore parse errors on partial chunks
        }
      }
    }
  }

  const streamEndTime = performance.now();
  const e2e = streamEndTime - streamStartTime;
  const tokenCount = Math.max(1, aiResponse.length / 3.2);
  const decodeDuration = (e2e - ttft) / 1000;
  const tps = decodeDuration > 0 ? (tokenCount / decodeDuration) : 0;
  const itl = tokenCount > 0 ? ((e2e - ttft) / tokenCount) : 0;

  return {
    fbl,
    ttft,
    tps,
    itl,
    tokenCount,
    e2e,
    fullText: aiResponse
  };
}

/**
 * Direct API Stream Client for OpenAI-compatible completions.
 */
async function streamChatCompletion(config, messages, onChunk, signal) {
  const streamStartTime = performance.now();
  let firstTokenReceived = false;
  let ttft = 0;
  let fbl = 0;
  let aiResponse = "";
  let reasoningResponse = "";

  const apiPayload = {
    model: config.model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: true
  };

  if (config.reasoningEffort && config.reasoningEffort !== "none") {
    apiPayload.reasoning_effort = config.reasoningEffort;
  }

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
  let sseBuffer = "";

  function handleSseLine(line) {
    const cleaned = line.trim();
    if (!cleaned || cleaned === "data: [DONE]") return;
    if (!cleaned.startsWith("data: ")) return;

    const parsed = JSON.parse(cleaned.slice(6));
    const deltaObj = parsed.choices?.[0]?.delta || {};
    const delta = typeof deltaObj.content === "string" ? deltaObj.content : "";
    const reasoningDelta = [
      deltaObj.reasoning_content,
      deltaObj.reasoningContent,
      deltaObj.reasoning,
      deltaObj.thinking
    ].find(value => typeof value === "string") || "";
    if (!firstTokenReceived && (delta.trim().length > 0 || reasoningDelta.trim().length > 0)) {
      firstTokenReceived = true;
      ttft = performance.now() - streamStartTime;
    }
    if (delta || reasoningDelta) {
      aiResponse += delta;
      reasoningResponse += reasoningDelta;
      onChunk({ delta, fullText: aiResponse, reasoningDelta, fullReasoning: reasoningResponse });
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split(/\r?\n/);
    sseBuffer = lines.pop() || "";

    for (const line of lines) {
      try {
        handleSseLine(line);
      } catch (err) {
        // Ignore malformed provider packets without breaking the stream.
      }
    }
  }

  sseBuffer += decoder.decode();
  if (sseBuffer.trim()) {
    try {
      handleSseLine(sseBuffer);
    } catch (err) {
      // Ignore a trailing malformed provider packet.
    }
  }

  const streamEndTime = performance.now();
  const e2e = streamEndTime - streamStartTime;
  const tokenCount = Math.max(1, (aiResponse.length + reasoningResponse.length) / 3.2);
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
    fullText: aiResponse,
    reasoning: reasoningResponse
  };
}

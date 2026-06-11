/**
 * Telemetry badge rendering.
 * Builds the interactive performance-metrics row appended to assistant messages.
 */

function renderPerformanceBadge(perf) {
  if (!perf) return "";

  const fblStr = perf.fbl < 1000 ? `${Math.round(perf.fbl)}ms` : `${(perf.fbl / 1000).toFixed(2)}s`;
  const ttftStr = perf.ttft < 1000 ? `${Math.round(perf.ttft)}ms` : `${(perf.ttft / 1000).toFixed(2)}s`;
  const tpsStr = perf.tps > 0 && isFinite(perf.tps) ? perf.tps.toFixed(1) : "0.0";
  const itlStr = perf.itl > 0 && isFinite(perf.itl) ? `${Math.round(perf.itl)}ms` : "N/A";
  const e2eStr = perf.e2e < 1000 ? `${Math.round(perf.e2e)}ms` : `${(perf.e2e / 1000).toFixed(2)}s`;
  const modelStr = perf.model || "Unknown";

  return `
    <div class="message-meta">
      <span data-tooltip="[Model Name] The model that generated this response.">${svgIcon("cpu", 11)} ${modelStr}</span>
      <span data-tooltip="[Connection Latency] The time elapsed from sending the request to establishing the connection and receiving the first byte. Lower means faster network response.">${svgIcon("activity", 11)} Connection: ${fblStr}</span>
      <span data-tooltip="[Time to First Token] The duration from initiating the request until the model generates its first character token. Measures model prefill and thinking time.">${svgIcon("clock", 11)} TTFT: ${ttftStr}</span>
      <span data-tooltip="[Generation Speed] The average number of token units generated per second. Measures raw model inference and decoding throughput.">${svgIcon("speed", 11)} Speed: ${tpsStr} tps</span>
      <span data-tooltip="[Inter-Token Latency] The average duration between generating consecutive tokens. Lower values indicate a smoother and more fluid reading pace.">${svgIcon("itl", 11)} ITL: ${itlStr}</span>
      <span data-tooltip="[End-to-End Duration] The total round-trip time from clicking send until the stream is completely closed.">${svgIcon("timer", 11)} Total: ${e2eStr}</span>
    </div>
  `;
}

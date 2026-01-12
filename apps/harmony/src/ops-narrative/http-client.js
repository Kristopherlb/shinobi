import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("ops-narrative");

export async function fetchJson(url, options = {}) {
  return await tracer.startActiveSpan("http.fetch", async (span) => {
    span.setAttribute("http.url", url);
    span.setAttribute("http.method", options.method ?? "GET");

    try {
      const response = await fetch(url, options);
      span.setAttribute("http.status_code", response.status);

      let body = null;
      if (response.status !== 204) {
        const text = await response.text();
        body = text ? JSON.parse(text) : null;
      }

      return { response, body };
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export class HttpEmbeddingProvider {
  constructor({ apiKey, baseUrl, model }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async embedText(text) {
    if (!this.apiKey) {
      throw new Error("Embedding provider requires apiKey");
    }

    const url = new URL("/embeddings", this.baseUrl);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: text
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Embedding request failed: ${response.status} ${detail}`);
    }

    const payload = await response.json();
    const embedding = payload?.data?.[0]?.embedding;

    if (!Array.isArray(embedding)) {
      throw new Error("Embedding response missing vector data");
    }

    return embedding;
  }
}

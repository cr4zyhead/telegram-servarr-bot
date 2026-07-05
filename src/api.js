export class Servarr {
  constructor({ hostname, port, apiKey, ssl = false, urlBase = "" }) {
    this.base = `${ssl ? "https" : "http"}://${hostname}:${port}${urlBase}/api/v3/`;
    this.apiKey = apiKey;
  }

  async #req(method, path, { query, body } = {}) {
    const url = new URL(path, this.base);
    for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
    const res = await fetch(url, {
      method,
      headers: {
        "X-Api-Key": this.apiKey,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${method} ${path} → HTTP ${res.status} ${text}`.slice(0, 300));
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  get(path, query) { return this.#req("GET", path, { query }); }
  post(path, body) { return this.#req("POST", path, { body }); }
  del(path, query) { return this.#req("DELETE", path, { query }); }
}

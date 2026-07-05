import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Servarr } from "../src/api.js";

function fetchMock(status = 200, body = {}) {
  return mock.fn(async () => new Response(JSON.stringify(body), { status }));
}

test("GET arma URL /api/v3 con query y api key", async () => {
  const f = fetchMock(200, [{ id: 1 }]);
  global.fetch = f;
  const api = new Servarr({ hostname: "h", port: 7878, apiKey: "KEY" });
  const out = await api.get("movie/lookup", { term: "dune part" });
  assert.deepEqual(out, [{ id: 1 }]);
  const [url, opts] = f.mock.calls[0].arguments;
  assert.equal(url.toString(), "http://h:7878/api/v3/movie/lookup?term=dune+part");
  assert.equal(opts.headers["X-Api-Key"], "KEY");
});

test("POST manda JSON", async () => {
  const f = fetchMock(201, { ok: true });
  global.fetch = f;
  const api = new Servarr({ hostname: "h", port: 1, apiKey: "K" });
  await api.post("command", { name: "RssSync" });
  const [, opts] = f.mock.calls[0].arguments;
  assert.equal(opts.method, "POST");
  assert.equal(opts.headers["Content-Type"], "application/json");
  assert.equal(opts.body, '{"name":"RssSync"}');
});

test("status no-2xx lanza error legible", async () => {
  global.fetch = fetchMock(401, {});
  const api = new Servarr({ hostname: "h", port: 1, apiKey: "K" });
  await assert.rejects(() => api.get("movie"), /401/);
});

test("DELETE con query y body vacío → null", async () => {
  const f = mock.fn(async () => new Response("", { status: 200 }));
  global.fetch = f;
  const api = new Servarr({ hostname: "h", port: 1, apiKey: "K" });
  const out = await api.del("movie/5", { deleteFiles: "true" });
  assert.equal(out, null);
  const [url, opts] = f.mock.calls[0].arguments;
  assert.equal(opts.method, "DELETE");
  assert.equal(url.toString(), "http://h:1/api/v3/movie/5?deleteFiles=true");
});

test("PUT manda JSON", async () => {
  const f = mock.fn(async () => new Response("{}", { status: 202 }));
  global.fetch = f;
  const api = new Servarr({ hostname: "h", port: 1, apiKey: "K" });
  await api.put("series/6", { id: 6 });
  const [, opts] = f.mock.calls[0].arguments;
  assert.equal(opts.method, "PUT");
  assert.equal(opts.body, '{"id":6}');
});

test("urlBase sin slash inicial se normaliza", async () => {
  const f = mock.fn(async () => new Response("[]", { status: 200 }));
  global.fetch = f;
  const api = new Servarr({ hostname: "h", port: 1, apiKey: "K", urlBase: "radarr" });
  await api.get("movie");
  assert.equal(f.mock.calls[0].arguments[0].toString(), "http://h:1/radarr/api/v3/movie");
});

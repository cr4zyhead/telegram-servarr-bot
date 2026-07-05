import { test } from "node:test";
import assert from "node:assert/strict";
import { posterOf, captionFor } from "../src/wizard.js";

test("posterOf prefiere remotePoster, luego images, luego null", () => {
  assert.equal(posterOf({ remotePoster: "http://a/p.jpg" }), "http://a/p.jpg");
  assert.equal(posterOf({ images: [{ coverType: "banner", remoteUrl: "x" }, { coverType: "poster", remoteUrl: "http://b/p.jpg" }] }), "http://b/p.jpg");
  assert.equal(posterOf({ images: [] }), null);
  assert.equal(posterOf({}), null);
});

test("captionFor arma título, año, sinopsis y contador", () => {
  const c = captionFor({ title: "Dune", year: 2021, overview: "Arrakis." }, 1, 8);
  assert.match(c, /^Dune \(2021\)\n\nArrakis\./);
  assert.match(c, /2\/8$/);
});

test("captionFor tolera año y sinopsis ausentes", () => {
  const c = captionFor({ title: "Dune" }, 0, 1);
  assert.match(c, /^Dune\n/);
  assert.match(c, /1\/1$/);
});

test("captionFor trunca a 1024", () => {
  const c = captionFor({ title: "X", year: 2020, overview: "a".repeat(2000) }, 0, 5);
  assert.ok(c.length <= 1024);
  assert.match(c, /1\/5$/);
});

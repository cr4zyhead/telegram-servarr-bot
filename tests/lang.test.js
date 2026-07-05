import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { es, en } from "../src/strings.js";
import { resolveLang } from "../src/lang.js";
import { Acl } from "../src/acl.js";

function tmpAcl(data = { allowedUsers: [], revokedUsers: [] }) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acl-")), "acl.json");
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

test("es y en tienen el mismo keyset", () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test("resolveLang: default es, language_code en, override manda", () => {
  const acl = new Acl(tmpAcl({ allowedUsers: [{ id: 1, lang: "en" }, { id: 2 }], revokedUsers: [] }));
  assert.equal(resolveLang(acl, undefined), es);
  assert.equal(resolveLang(acl, { id: 9, language_code: "en" }), en);
  assert.equal(resolveLang(acl, { id: 9, language_code: "en-US" }), en);
  assert.equal(resolveLang(acl, { id: 9, language_code: "de" }), es);
  assert.equal(resolveLang(acl, { id: 1, language_code: "es" }), en); // override
  assert.equal(resolveLang(acl, { id: 2, language_code: "en" }), en);
});

test("setLang persiste", () => {
  const file = tmpAcl({ allowedUsers: [{ id: 7 }], revokedUsers: [] });
  new Acl(file).setLang(7, "en");
  assert.equal(new Acl(file).allowedUsers[0].lang, "en");
});

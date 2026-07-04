import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Acl } from "../src/acl.js";

function tmpAcl(data = { allowedUsers: [], revokedUsers: [] }) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acl-")), "acl.json");
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

test("allow persiste y isAllowed responde", () => {
  const file = tmpAcl();
  const acl = new Acl(file);
  acl.allow({ id: 7, first_name: "Ana" });
  assert.ok(acl.isAllowed(7));
  assert.ok(new Acl(file).isAllowed(7)); // releído desde disco
});

test("revoke mueve a revokedUsers, unrevoke lo saca", () => {
  const file = tmpAcl({ allowedUsers: [{ id: 7, username: "ana" }], revokedUsers: [] });
  const acl = new Acl(file);
  acl.revoke(7);
  assert.ok(!acl.isAllowed(7));
  assert.ok(acl.isRevoked(7));
  acl.unrevoke(7);
  assert.ok(!new Acl(file).isRevoked(7));
});

test("name prefiere username y arma nombre completo", () => {
  const acl = new Acl(tmpAcl());
  assert.equal(acl.name({ id: 1, username: "ana" }), "ana");
  assert.equal(acl.name({ id: 1, first_name: "Ana", last_name: "B" }), "Ana B");
});

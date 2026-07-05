import fs from "node:fs";

export class Acl {
  constructor(file) {
    this.file = file;
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    this.allowedUsers = d.allowedUsers || [];
    this.revokedUsers = d.revokedUsers || [];
  }

  #save() {
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(
      { allowedUsers: this.allowedUsers, revokedUsers: this.revokedUsers }, null, 2));
    fs.renameSync(tmp, this.file);
  }

  isAllowed(id) { return this.allowedUsers.some((u) => u.id === id); }
  isRevoked(id) { return this.revokedUsers.some((u) => u.id === id); }

  allow(user) { this.allowedUsers.push(user); this.#save(); }

  revoke(id) {
    const i = this.allowedUsers.findIndex((u) => u.id === id);
    if (i < 0) return;
    this.revokedUsers.push(this.allowedUsers[i]);
    this.allowedUsers.splice(i, 1);
    this.#save();
  }

  unrevoke(id) {
    const i = this.revokedUsers.findIndex((u) => u.id === id);
    if (i < 0) return;
    this.revokedUsers.splice(i, 1);
    this.#save();
  }

  setLang(id, lang) {
    const user = this.allowedUsers.find((u) => u.id === id);
    if (!user) return;
    user.lang = lang;
    this.#save();
  }

  name(u) { return u.username || [u.first_name, u.last_name].filter(Boolean).join(" "); }
}

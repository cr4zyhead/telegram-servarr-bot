import { es, en } from "./strings.js";

export function resolveLang(acl, from) {
  const user = from && acl.allowedUsers.find((u) => u.id === from.id);
  const code = user?.lang ?? user?.language_code ?? from?.language_code ?? "es";
  return code.startsWith("en") ? en : es;
}

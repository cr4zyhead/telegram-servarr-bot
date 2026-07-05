import { es, en } from "./strings.js";

export function resolveLang(acl, from) {
  const user = from && acl.allowedUsers.find((u) => u.id === from.id);
  const code = user?.lang ?? from?.language_code ?? "es";
  return code.startsWith("en") ? en : es;
}

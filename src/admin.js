import { InlineKeyboard } from "grammy";
import { t } from "./strings.js";

export function registerAdmin(bot, acl, isAdmin) {
  const admin = (h) => (ctx) => {
    if (isAdmin(ctx.from?.id)) return h(ctx);
    if (ctx.callbackQuery) return ctx.answerCallbackQuery({ text: t.adminOnly });
    return ctx.reply(t.adminOnly);
  };

  const userKeyboard = (users, prefix) => {
    const kb = new InlineKeyboard();
    users.forEach((u) => kb.text(acl.name(u), `${prefix}:${u.id}`).row());
    kb.text(t.cancel, "adm:cancel");
    return kb;
  };

  bot.command("cid", admin((ctx) =>
    ctx.reply(t.cid(ctx.chat.id), { parse_mode: "Markdown" })));

  bot.command("users", admin((ctx) => {
    if (!acl.allowedUsers.length) return ctx.reply(t.noUsers);
    return ctx.reply(
      [t.usersTitle, ...acl.allowedUsers.map((u) => `➸ ${acl.name(u)}`)].join("\n"));
  }));

  bot.command("revoke", admin((ctx) => {
    if (!acl.allowedUsers.length) return ctx.reply(t.noUsers);
    return ctx.reply(t.revokeWho, { reply_markup: userKeyboard(acl.allowedUsers, "rvk") });
  }));

  bot.command("unrevoke", admin((ctx) => {
    if (!acl.revokedUsers.length) return ctx.reply(t.noRevoked);
    return ctx.reply(t.unrevokeWho, { reply_markup: userKeyboard(acl.revokedUsers, "urv") });
  }));

  bot.callbackQuery("adm:cancel", admin(async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.editMessageText(t.cleared);
  }));

  const confirm = (listName, confirmPrefix, confirmText) =>
    admin(async (ctx) => {
      await ctx.answerCallbackQuery();
      const id = Number(ctx.match[1]);
      const user = acl[listName].find((u) => u.id === id);
      if (!user) return ctx.editMessageText(t.error(t.userNotFound));
      const kb = new InlineKeyboard()
        .text(t.yes, `${confirmPrefix}:${id}`).text(t.no, "adm:cancel");
      return ctx.editMessageText(confirmText(acl.name(user)), { reply_markup: kb });
    });

  bot.callbackQuery(/^rvk:(\d+)$/, confirm("allowedUsers", "rvkc", t.confirmRevoke));
  bot.callbackQuery(/^urv:(\d+)$/, confirm("revokedUsers", "urvc", t.confirmUnrevoke));

  bot.callbackQuery(/^rvkc:(\d+)$/, admin(async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = Number(ctx.match[1]);
    const user = acl.allowedUsers.find((u) => u.id === id);
    if (!user) return ctx.editMessageText(t.error(t.userNotFound));
    acl.revoke(id);
    return ctx.editMessageText(t.revoked(acl.name(user)));
  }));

  bot.callbackQuery(/^urvc:(\d+)$/, admin(async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = Number(ctx.match[1]);
    const user = acl.revokedUsers.find((u) => u.id === id);
    if (!user) return ctx.editMessageText(t.error(t.userNotFound));
    acl.unrevoke(id);
    return ctx.editMessageText(t.unrevoked(acl.name(user)));
  }));
}

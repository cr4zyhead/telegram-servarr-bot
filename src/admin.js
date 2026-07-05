import { InlineKeyboard } from "grammy";

export function registerAdmin(bot, acl, isAdmin) {
  const admin = (h) => (ctx) => {
    if (isAdmin(ctx.from?.id)) return h(ctx);
    if (ctx.callbackQuery) return ctx.answerCallbackQuery({ text: ctx.t.adminOnly });
    return ctx.reply(ctx.t.adminOnly);
  };

  const userKeyboard = (t, users, prefix) => {
    const kb = new InlineKeyboard();
    users.forEach((u) => kb.text(acl.name(u), `${prefix}:${u.id}`).row());
    kb.text(t.cancel, "adm:cancel");
    return kb;
  };

  bot.command("cid", admin((ctx) =>
    ctx.reply(ctx.t.cid(ctx.chat.id), { parse_mode: "Markdown" })));

  bot.command("users", admin((ctx) => {
    if (!acl.allowedUsers.length) return ctx.reply(ctx.t.noUsers);
    return ctx.reply(
      [ctx.t.usersTitle, ...acl.allowedUsers.map((u) => `➸ ${acl.name(u)}`)].join("\n"));
  }));

  bot.command("revoke", admin((ctx) => {
    if (!acl.allowedUsers.length) return ctx.reply(ctx.t.noUsers);
    return ctx.reply(ctx.t.revokeWho,
      { reply_markup: userKeyboard(ctx.t, acl.allowedUsers, "rvk") });
  }));

  bot.command("unrevoke", admin((ctx) => {
    if (!acl.revokedUsers.length) return ctx.reply(ctx.t.noRevoked);
    return ctx.reply(ctx.t.unrevokeWho,
      { reply_markup: userKeyboard(ctx.t, acl.revokedUsers, "urv") });
  }));

  bot.callbackQuery("adm:cancel", admin(async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.editMessageText(ctx.t.cleared);
  }));

  const confirm = (listName, confirmPrefix, confirmKey) =>
    admin(async (ctx) => {
      await ctx.answerCallbackQuery();
      const id = Number(ctx.match[1]);
      const user = acl[listName].find((u) => u.id === id);
      if (!user) return ctx.editMessageText(ctx.t.error(ctx.t.userNotFound));
      const kb = new InlineKeyboard()
        .text(ctx.t.yes, `${confirmPrefix}:${id}`).text(ctx.t.no, "adm:cancel");
      return ctx.editMessageText(ctx.t[confirmKey](acl.name(user)), { reply_markup: kb });
    });

  bot.callbackQuery(/^rvk:(\d+)$/, confirm("allowedUsers", "rvkc", "confirmRevoke"));
  bot.callbackQuery(/^urv:(\d+)$/, confirm("revokedUsers", "urvc", "confirmUnrevoke"));

  bot.callbackQuery(/^rvkc:(\d+)$/, admin(async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = Number(ctx.match[1]);
    const user = acl.allowedUsers.find((u) => u.id === id);
    if (!user) return ctx.editMessageText(ctx.t.error(ctx.t.userNotFound));
    acl.revoke(id);
    return ctx.editMessageText(ctx.t.revoked(acl.name(user)));
  }));

  bot.callbackQuery(/^urvc:(\d+)$/, admin(async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = Number(ctx.match[1]);
    const user = acl.revokedUsers.find((u) => u.id === id);
    if (!user) return ctx.editMessageText(ctx.t.error(ctx.t.userNotFound));
    acl.unrevoke(id);
    return ctx.editMessageText(ctx.t.unrevoked(acl.name(user)));
  }));
}

import { InlineKeyboard } from "grammy";
import { t } from "./strings.js";

// ponytail: callback data = índice en el array; el array vive en la conversación,
// no hace falta cache externo.
export async function pick(conversation, ctx, items, labelFn, title) {
  const kb = new InlineKeyboard();
  items.forEach((it, i) => kb.text(labelFn(it), `pick:${i}`).row());
  kb.text(t.cancel, "pick:cancel");
  await ctx.reply(title, { reply_markup: kb });
  const res = await conversation.waitForCallbackQuery(/^pick:(\d+|cancel)$/, { next: true });
  await res.answerCallbackQuery();
  const v = res.callbackQuery.data.slice(5);
  if (v === "cancel") {
    await res.reply(t.cleared);
    return null;
  }
  return items[Number(v)];
}

export async function yesNo(conversation, ctx, title) {
  const kb = new InlineKeyboard()
    .text(t.yes, "yn:yes").text(t.no, "yn:no").row()
    .text(t.cancel, "yn:cancel");
  await ctx.reply(title, { reply_markup: kb });
  const res = await conversation.waitForCallbackQuery(/^yn:(yes|no|cancel)$/, { next: true });
  await res.answerCallbackQuery();
  const v = res.callbackQuery.data.slice(3);
  if (v === "cancel") {
    await res.reply(t.cleared);
    return null;
  }
  return v === "yes";
}

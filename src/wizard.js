import { InlineKeyboard } from "grammy";

// ponytail: callback data = índice en el array; el array vive en la conversación,
// no hace falta cache externo.
export async function pick(conversation, ctx, t, items, labelFn, title) {
  const kb = new InlineKeyboard();
  items.forEach((it, i) => kb.text(labelFn(it), `pick:${i}`).row());
  kb.text(t.cancel, "pick:cancel");
  await ctx.reply(title, { reply_markup: kb });
  let res;
  for (;;) {
    res = await conversation.waitForCallbackQuery(/^pick:(\d+|cancel)$/, { next: true });
    if (res.from.id !== ctx.from.id) {
      await res.answerCallbackQuery({ text: t.notYourMenu });
      continue;
    }
    break;
  }
  await res.answerCallbackQuery();
  const v = res.callbackQuery.data.slice(5);
  if (v === "cancel") {
    await res.reply(t.cleared);
    return null;
  }
  return items[Number(v)];
}

export function posterOf(item) {
  return item.remotePoster ??
    item.images?.find((i) => i.coverType === "poster")?.remoteUrl ?? null;
}

export function captionFor(item, i, total) {
  const head = item.title + (item.year ? ` (${item.year})` : "");
  const counter = `${i + 1}/${total}`;
  const body = item.overview ? `\n\n${item.overview}` : "";
  const tail = `\n\n${counter}`;
  return (head + body).slice(0, 1024 - tail.length) + tail;
}

export async function carousel(conversation, ctx, t, items) {
  let i = 0;
  let msg = null;

  const show = async () => {
    const kb = new InlineKeyboard()
      .text("◀️", "car:prev").text(t.addThis, "car:pick").text("▶️", "car:next").row()
      .text(t.cancel, "car:cancel");
    const caption = captionFor(items[i], i, items.length);
    const photo = posterOf(items[i]);
    if (msg) await ctx.api.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
    if (photo) {
      try {
        msg = await ctx.replyWithPhoto(photo, { caption, reply_markup: kb });
        return;
      } catch {} // ponytail: URL de póster rechazada por Telegram → texto
    }
    msg = await ctx.reply(caption, { reply_markup: kb });
  };

  await show();
  for (;;) {
    const res = await conversation.waitForCallbackQuery(/^car:(prev|next|pick|cancel)$/, { next: true });
    if (res.from.id !== ctx.from.id) {
      await res.answerCallbackQuery({ text: t.notYourMenu });
      continue;
    }
    await res.answerCallbackQuery();
    const action = res.callbackQuery.data.slice(4);
    if (action === "cancel") {
      await res.reply(t.cleared);
      return null;
    }
    if (action === "pick") return items[i];
    i = (i + (action === "next" ? 1 : -1) + items.length) % items.length;
    await show();
  }
}

export async function yesNo(conversation, ctx, t, title) {
  const kb = new InlineKeyboard()
    .text(t.yes, "yn:yes").text(t.no, "yn:no").row()
    .text(t.cancel, "yn:cancel");
  await ctx.reply(title, { reply_markup: kb });
  let res;
  for (;;) {
    res = await conversation.waitForCallbackQuery(/^yn:(yes|no|cancel)$/, { next: true });
    if (res.from.id !== ctx.from.id) {
      await res.answerCallbackQuery({ text: t.notYourMenu });
      continue;
    }
    break;
  }
  await res.answerCallbackQuery();
  const v = res.callbackQuery.data.slice(3);
  if (v === "cancel") {
    await res.reply(t.cleared);
    return null;
  }
  return v === "yes";
}

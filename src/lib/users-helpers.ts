export type ChatMessage = {
  id: string
  from: "staff" | "user"
  text: string
  at: string
}

/**
 * チャット式 push UI 用のサンプル会話。ユーザー ID から決定論的に生成。
 * 自分（事務局スタッフ）= staff、相手（LINEユーザー）= user
 */
export function getSampleMessages(userId: string, userName: string): ChatMessage[] {
  const tail = parseInt(userId.replace(/\D/g, ""), 10) || 0
  const seed = tail % 5
  const baseDay = 10 + (tail % 10)

  const presets: Array<Omit<ChatMessage, "id">> = [
    {
      from: "staff",
      text: `${userName} 様、いつもありがとうございます。`,
      at: `2026-04-${String(baseDay).padStart(2, "0")}T10:30:00+09:00`,
    },
    {
      from: "user",
      text: "こちらこそ、お世話になっております。",
      at: `2026-04-${String(baseDay).padStart(2, "0")}T14:20:00+09:00`,
    },
    {
      from: "staff",
      text: "新しい事例（マッチング先候補）を配信予定です。詳細は後日お送りします。",
      at: `2026-04-${String(baseDay + 5).padStart(2, "0")}T09:15:00+09:00`,
    },
  ]
  if (seed % 2 === 0) {
    presets.push({
      from: "user",
      text: "ありがとうございます。確認いたします。",
      at: `2026-04-${String(baseDay + 5).padStart(2, "0")}T15:00:00+09:00`,
    })
  }
  if (seed === 0) {
    presets.push({
      from: "staff",
      text: "次回相談会の日程候補をお送りしました。ご確認ください。",
      at: `2026-04-${String(baseDay + 8).padStart(2, "0")}T11:00:00+09:00`,
    })
  }

  return presets.map((m, i) => ({ ...m, id: `${userId}_msg_${i}` }))
}

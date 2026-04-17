import type { DiaryTarotCard } from "@/data/tarotCards";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface DiaryEntry {
  id: string;
  date: string;
  spreadName: string;
  spreadEmoji: string;
  labels: string[];
  cards: DiaryTarotCard[];
  note: string;
}

function rowToEntry(row: {
  id: string;
  reading_date: string;
  spread_name: string;
  spread_emoji: string | null;
  labels: string[] | null;
  cards: unknown;
  note: string | null;
}): DiaryEntry {
  return {
    id: row.id,
    date: row.reading_date,
    spreadName: row.spread_name,
      spreadEmoji: row.spread_emoji ?? "",
    labels: row.labels ?? [],
    cards: row.cards as DiaryTarotCard[],
    note: row.note ?? "",
  };
}

export async function getDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("user_id", userId)
    .order("reading_date", { ascending: false });

  if (error) {
    console.error("getDiaryEntries", error);
    return [];
  }
  return (data ?? []).map(rowToEntry);
}

export async function saveDiaryEntry(
  userId: string,
  entry: Omit<DiaryEntry, "id" | "date"> & { id?: string; date?: string }
): Promise<DiaryEntry | null> {
  const id = entry.id ?? crypto.randomUUID();
  const readingDate = entry.date ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("diary_entries")
    .insert({
      id,
      user_id: userId,
      spread_name: entry.spreadName,
      spread_emoji: entry.spreadEmoji,
      labels: entry.labels,
      cards: entry.cards as unknown as Json,
      note: entry.note,
      reading_date: readingDate,
    })
    .select()
    .single();

  if (error) {
    console.error("saveDiaryEntry", error);
    return null;
  }
  return rowToEntry(data);
}

export async function deleteDiaryEntry(userId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from("diary_entries").delete().eq("id", id).eq("user_id", userId);
  return !error;
}

export async function updateDiaryNote(
  userId: string,
  id: string,
  note: string
): Promise<boolean> {
  const { error } = await supabase
    .from("diary_entries")
    .update({ note })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

import { TarotCard } from "@/data/tarotCards";

export interface DiaryEntry {
  id: string;
  date: string;
  spreadName: string;
  spreadEmoji: string;
  labels: string[];
  cards: TarotCard[];
  note: string;
}

const DIARY_KEY = "tarot-diary";

export const getDiaryEntries = (): DiaryEntry[] => {
  try {
    const data = localStorage.getItem(DIARY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveDiaryEntry = (entry: DiaryEntry) => {
  const entries = getDiaryEntries();
  entries.unshift(entry);
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
};

export const deleteDiaryEntry = (id: string) => {
  const entries = getDiaryEntries().filter((e) => e.id !== id);
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
};

export const updateDiaryNote = (id: string, note: string) => {
  const entries = getDiaryEntries().map((e) =>
    e.id === id ? { ...e, note } : e
  );
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
};

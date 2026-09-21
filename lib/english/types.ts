export type Rating = 'again' | 'good';
export type VocabularyKind = 'word' | 'phrase';
export type CollectionKind = VocabularyKind | 'confusion';
export type Mode = 'all' | CollectionKind;
export type MemoryState = {
  revision: number;
  seen: number;
  lapses: number;
  intervalDays: number;
  dueAt: string | null;
  lastReviewedAt: string | null;
  lastAdvancedAt: string | null;
  lastRating: Rating | 'hard' | null;
};
export type Vocabulary = {
  id: number;
  word: string;
  meaning: string;
  kind: VocabularyKind;
  source: string | null;
  sourceContext: string | null;
  notes: string | null;
  senses: { pos?: string; meaning: string; example?: string; translation?: string }[] | null;
  family: { word: string; pos?: string; meaning: string }[] | null;
  confusables: { word: string; meaning: string; tip?: string }[] | null;
  etymology: string | null;
  createdAt: string | null;
};
export type Collection = { id: number; name: string; kind: CollectionKind; createdAt: string; wordIds: number[] };
export type Confusion = { id: string; wordId: number; otherWord: string; otherMeaning: string; tip: string; createdAt: string };
export type Workspace = {
  words: Vocabulary[];
  collections: Collection[];
  confusions: Confusion[];
  memory: Record<string, MemoryState>;
};
export type StudyItem = {
  key: string;
  wordId: number;
  wordIds?: number[];
  kind: CollectionKind;
  term: string;
  meaning: string;
  example?: string;
  translation?: string;
  entries?: { term: string; meaning: string }[];
  tip?: string;
};
export type ImportRow = {
  word: string;
  meaning: string;
  kind: VocabularyKind;
  example?: string;
  translation?: string;
  sourceContext?: string;
  source?: string;
};
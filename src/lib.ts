export type TestKey = 'iq' | 'english' | 'aptitude';

export type QuestionType =
  | 'number_series'
  | 'logical_reasoning'
  | 'verbal_analogy'
  | 'figure_reasoning'
  | 'grammar'
  | 'reading'
  | 'likert';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: string[];
  answerIndex: number; // for aptitude/likert: used for scoring preference only in this demo
  explanation?: string;
  figure?: string; // e.g. "svg:pattern1"
}

export interface TestSpec {
  key: TestKey;
  title: string;
  durationMinutes: number;
  itemCount: number;
}

export const TEST_SPECS: Record<TestKey, TestSpec> = {
  iq: { key: 'iq', title: 'IQ Assessment', durationMinutes: 20, itemCount: 20 },
  english: { key: 'english', title: 'English Assessment', durationMinutes: 25, itemCount: 25 },
  aptitude: { key: 'aptitude', title: 'Aptitude & Personality', durationMinutes: 18, itemCount: 30 },
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickN<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (arr.length <= n) return shuffle(arr);
  return shuffle(arr).slice(0, n);
}

export function formatDuration(secondsRemaining: number): string {
  const m = Math.max(0, Math.floor(secondsRemaining / 60));
  const s = Math.max(0, secondsRemaining % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function scoreSimple(questions: Question[], answers: Record<string, number>): { correct: number; total: number } {
  let correct = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (typeof a === 'number' && a === q.answerIndex && q.type !== 'likert') correct++;
  }
  const total = questions.filter(q => q.type !== 'likert').length;
  return { correct, total: Math.max(1, total) };
}

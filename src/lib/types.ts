export interface VocabItem {
  front: string;
  back: string;
}

export interface PromptsConfig {
  name: string;
  systemPrompt: string;
  questionInstructions: string;
  evaluationInstructions: string;
  uiLabels: {
    answerLabel: string;
    tip: string;
  };
}

export interface QuizQuestion {
  prompt: string;
}

export interface QuizFeedback {
  result: 'PASS' | 'FAIL';
  feedback: string;
}

export interface QuizSettings {
  promptsConfig: PromptsConfig;
  direction: 'front → back' | 'back → front';
  maxWords: number;
  deckFilter: string;
  exposeOneSideOnly: boolean;
  model: 'claude-haiku-4-5' | 'claude-sonnet-4-5';
  showCardsReference: boolean;
  textDirection: 'auto' | 'ltr' | 'rtl';
  ankiConnectUrl: string;
  anthropicApiKey: string;
}

export interface AnkiCardStats {
  cardId: number;
  interval: number;
  factor: number;
  reps: number;
  lapses: number;
  type: number; // 0=new, 1=learning, 2=review, 3=relearning
  queue: number;
  due: number;
}

export interface ReviewNote {
  noteId: number;
  front: string;
  frontFieldName: string;
  back: string;
  backFieldName: string;
  tags: string[];
  stats: {
    grade: string;
    color: string;
    summary: string;
    details: string; // Formatting string for hover
  };
}

export type ReviewMode = 'visible' | 'editable' | 'saveable' | 'hidden';

export type ColumnState = 'visible' | 'hidden';

export const DEFAULT_PROMPTS: PromptsConfig = {
  name: "Default",
  systemPrompt: "You help students practice with their study cards. Create questions that test their understanding of the card content. When evaluating answers, be fair and thorough.",
  questionInstructions: "Create a practice question for the student.\n\nPlease respond in this exact format:\nPROMPT: [your question here]",
  evaluationInstructions: "Please evaluate their answer and respond in this exact format:\nRESULT: PASS or FAIL\nFEEDBACK: [Your concise feedback, 2-3 sentences max.]",
  uiLabels: {
    answerLabel: "Your Answer",
    tip: ""
  }
};

export const DEFAULT_SETTINGS: QuizSettings = {
  promptsConfig: DEFAULT_PROMPTS,
  direction: 'back → front',
  maxWords: 1000,
  deckFilter: '',
  exposeOneSideOnly: true,
  model: 'claude-haiku-4-5',
  showCardsReference: false,
  textDirection: 'auto',
  ankiConnectUrl: 'http://localhost:8765',
  anthropicApiKey: '',
};

export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const rtlMatches = text.match(rtlRegex);
  const rtlCount = rtlMatches ? rtlMatches.length : 0;
  const totalChars = text.replace(/\s/g, '').length;

  return totalChars > 0 && rtlCount / totalChars > 0.5 ? 'rtl' : 'ltr';
}

export function getTextDirection(text: string, setting: 'auto' | 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  if (setting === 'auto') {
    return detectTextDirection(text);
  }
  return setting;
}

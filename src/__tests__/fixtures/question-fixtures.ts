import { Question } from '@prisma/client';
import { AnswerCheckResult } from '../../domain/repositories/IQuestionRepository';

/**
 * 過去問テストデータのファクトリ
 */
export const QuestionFixtures = {
  /**
   * 基本的な過去問データ
   */
  createBasicQuestion: (overrides: Partial<Question> = {}): Question => ({
    id: 'ap2022spring_am_01',
    year: 2022,
    season: 'spring',
    section: 'morning',
    number: 1,
    category: '基礎理論',
    subcategory: '論理回路',
    difficulty: 3,
    question: 'NAND回路2個を使ってNOT回路を構成するとき、正しい接続方法はどれか。',
    choices: ['入力を両方のNAND回路に接続し、出力を直列接続', '1つのNAND回路の入力を同じ信号に接続', '2つのNAND回路を並列接続', '入力を交互に接続'] as any,
    answer: 'B',
    explanation: 'NAND回路の入力を同じ信号に接続すると、NOT回路として動作する（A NAND A = NOT A）',
    tags: ['論理回路', 'NAND', 'NOT'] as any,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    ...overrides,
  }),

  /**
   * 複数の過去問データ
   */
  createMultipleQuestions: (count: number = 2): Question[] => {
    return Array.from({ length: count }, (_, index) =>
      QuestionFixtures.createBasicQuestion({
        id: `ap2022spring_am_${String(index + 1).padStart(2, '0')}`,
        number: index + 1,
        category: index % 2 === 0 ? '基礎理論' : 'コンピュータシステム',
        subcategory: index % 2 === 0 ? '論理回路' : '割込み',
        question: index % 2 === 0 
          ? 'NAND回路2個を使ってNOT回路を構成するとき、正しい接続方法はどれか。'
          : '外部割込みが発生したとき、CPUが最初に行う処理はどれか。',
        choices: index % 2 === 0
          ? ['選択肢A', '選択肢B', '選択肢C', '選択肢D'] as any
          : ['割込みハンドラの実行', 'プログラムカウンタの退避', '割込み要因の特定', '割込み禁止フラグの設定'] as any,
        explanation: index % 2 === 0
          ? 'NAND回路の入力を同じ信号に接続すると、NOT回路として動作する'
          : '割込み発生時、まず現在の実行状況（プログラムカウンタなど）を退避してから割込み処理を開始する',
        tags: index % 2 === 0 ? ['論理回路', 'NAND', 'NOT'] as any : ['割込み', 'CPU', 'プログラムカウンタ'] as any,
      })
    );
  },

  /**
   * カテゴリ別の過去問データ
   */
  createQuestionsByCategory: (category: string, count: number = 3): Question[] => {
    return Array.from({ length: count }, (_, index) =>
      QuestionFixtures.createBasicQuestion({
        id: `${category.toLowerCase()}_question_${index + 1}`,
        number: index + 1,
        category,
        subcategory: `${category}のサブカテゴリ${index + 1}`,
        question: `${category}に関する問題${index + 1}`,
      })
    );
  },

  /**
   * 年度別の過去問データ
   */
  createQuestionsByYear: (year: number, count: number = 5): Question[] => {
    return Array.from({ length: count }, (_, index) =>
      QuestionFixtures.createBasicQuestion({
        id: `ap${year}spring_am_${String(index + 1).padStart(2, '0')}`,
        year,
        number: index + 1,
        question: `${year}年度の問題${index + 1}`,
      })
    );
  },

  /**
   * 難易度別の過去問データ
   */
  createQuestionsByDifficulty: (difficulty: number, count: number = 3): Question[] => {
    return Array.from({ length: count }, (_, index) =>
      QuestionFixtures.createBasicQuestion({
        id: `difficulty_${difficulty}_question_${index + 1}`,
        number: index + 1,
        difficulty,
        question: `難易度${difficulty}の問題${index + 1}`,
      })
    );
  },

  /**
   * 正解チェック結果のファクトリ
   */
  createAnswerCheckResult: (overrides: Partial<AnswerCheckResult> = {}): AnswerCheckResult => ({
    isCorrect: true,
    correctAnswer: 'B',
    explanation: 'NAND回路の入力を同じ信号に接続すると、NOT回路として動作する（A NAND A = NOT A）',
    userAnswer: 'B',
    ...overrides,
  }),

  /**
   * 不正解のチェック結果
   */
  createIncorrectAnswerResult: (userAnswer: string = 'A'): AnswerCheckResult => ({
    isCorrect: false,
    correctAnswer: 'B',
    explanation: 'NAND回路の入力を同じ信号に接続すると、NOT回路として動作する（A NAND A = NOT A）',
    userAnswer,
  }),

  /**
   * 解説なしの正解チェック結果
   */
  createAnswerResultWithoutExplanation: (): AnswerCheckResult => ({
    isCorrect: true,
    correctAnswer: 'B',
    explanation: undefined,
    userAnswer: 'B',
  }),
};

/**
 * テスト用の定数データ
 */
export const TEST_CONSTANTS = {
  QUESTION_IDS: {
    VALID: 'ap2022spring_am_01',
    NONEXISTENT: 'nonexistent_question_id',
    RANDOM: 'random_question_123',
  },
  CATEGORIES: {
    BASIC_THEORY: '基礎理論',
    COMPUTER_SYSTEM: 'コンピュータシステム',
    NONEXISTENT: '存在しないカテゴリ',
  },
  YEARS: {
    RECENT: 2022,
    OLD: 2020,
    FUTURE: 2030,
  },
  SECTIONS: {
    MORNING: 'morning',
    AFTERNOON: 'afternoon',
  },
  SEASONS: {
    SPRING: 'spring',
    AUTUMN: 'autumn',
  },
  DIFFICULTIES: {
    EASY: 1,
    NORMAL: 3,
    HARD: 5,
  },
  ANSWERS: {
    CORRECT: 'B',
    INCORRECT: 'A',
    CASE_DIFFERENT: 'b',
  },
} as const;
import { Question } from '@prisma/client';

/**
 * 問題検索フィルター
 * 応用情報技術者試験の問題を条件で絞り込むためのフィルタオプション
 */
export interface QuestionFilters {
  /** 試験実施年度（例：2023） */
  year?: number;
  /** 試験時期（春期、秋期） */
  season?: string;
  /** 試験区分（午前I、午前II、午後） */
  section?: string;
  /** 主カテゴリ（例：ネットワーク、データベース） */
  category?: string;
  /** サブカテゴリ（より詳細な分野） */
  subcategory?: string;
  /** 難易度レベル（1-5、5が最難） */
  difficulty?: number;
}

/**
 * 問題クエリオプション
 * 検索結果の制御やページネーションに使用
 */
export interface QuestionQueryOptions {
  /** 取得件数制限 */
  limit?: number;
  /** 取得開始位置（ページネーション） */
  offset?: number;
  /** ランダム順序フラグ */
  random?: boolean;
}

/**
 * 回答チェック結果
 * ユーザーの回答が正解かどうかの判定結果を含む
 */
export interface AnswerCheckResult {
  /** 回答が正解かどうか */
  isCorrect: boolean;
  /** 正解の選択肢 */
  correctAnswer: string;
  /** 解説（オプショナル） */
  explanation?: string;
  /** ユーザーが選択した回答 */
  userAnswer: string;
}

/**
 * 問題リポジトリインターフェース
 * 
 * 応用情報技術者試験の問題データへのアクセスを抽象化するリポジトリパターン。
 * データベースの実装詳細を隠蔽し、テスタビリティと保守性を向上させます。
 */
export interface IQuestionRepository {
  /**
   * IDによる問題の取得
   * @param id 問題のユニークID
   * @returns 問題データまたはnull（見つからない場合）
   */
  findById(id: string): Promise<Question | null>;

  /**
   * 条件に基づく問題の一覧取得
   * @param filters フィルター条件
   * @param options クエリオプション（制限、ページネーション等）
   * @returns 条件に一致する問題の配列
   */
  findMany(filters?: QuestionFilters, options?: QuestionQueryOptions): Promise<Question[]>;

  /**
   * カテゴリによる問題の取得
   * @param category カテゴリ名
   * @param options クエリオプション
   * @returns 指定カテゴリの問題配列
   */
  findByCategory(category: string, options?: QuestionQueryOptions): Promise<Question[]>;

  /**
   * ランダムな問題の取得（学習・テスト用）
   * @param count 取得する問題数
   * @param filters フィルター条件
   * @returns ランダムに選択された問題配列
   */
  findRandom(count: number, filters?: QuestionFilters): Promise<Question[]>;

  /**
   * ユーザー回答の正解判定
   * @param questionId 問題ID
   * @param userAnswer ユーザーが選択した回答
   * @returns 回答チェック結果（正解/不正解、解説等）
   */
  checkAnswer(questionId: string, userAnswer: string): Promise<AnswerCheckResult>;

  /**
   * 問題と選択肢の取得（UI表示用）
   * @param questionId 問題ID
   * @returns 問題データ（選択肢含む）
   */
  getQuestionWithChoices(questionId: string): Promise<Question | null>;

  /**
   * 条件に一致する問題の総数取得
   * @param filters フィルター条件
   * @returns 一致する問題の総数
   */
  countQuestions(filters?: QuestionFilters): Promise<number>;
}
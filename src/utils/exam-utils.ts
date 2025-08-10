/**
 * 試験関連のユーティリティ関数
 */

/**
 * 試験日までの残り日数を計算する
 * @param examDate 試験日
 * @returns 残り日数（負の値の場合は試験日が過ぎている）
 */
export const calculateRemainingDays = (examDate: Date): number => {
  const now = new Date();
  const exam = new Date(examDate);
  
  // 時間を0にして日付のみで計算
  now.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  
  const diffTime = exam.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * 残り期間のステータスを取得する
 * @param remainingDays 残り日数
 * @returns ステータス文字列
 */
export const getExamStatus = (remainingDays: number): string => {
  if (remainingDays < 0) {
    return 'expired'; // 試験日が過ぎている
  } else if (remainingDays === 0) {
    return 'today'; // 今日が試験日
  } else if (remainingDays <= 7) {
    return 'urgent'; // 1週間以内
  } else if (remainingDays <= 30) {
    return 'approaching'; // 1ヶ月以内
  } else {
    return 'normal'; // 通常
  }
};

/**
 * 残り日数を人間が読みやすい形式に変換する
 * @param remainingDays 残り日数
 * @returns 読みやすい文字列
 */
export const formatRemainingDays = (remainingDays: number): string => {
  if (remainingDays < 0) {
    return `試験日から${Math.abs(remainingDays)}日経過`;
  } else if (remainingDays === 0) {
    return '今日が試験日';
  } else if (remainingDays === 1) {
    return '明日が試験日';
  } else if (remainingDays <= 7) {
    return `あと${remainingDays}日`;
  } else if (remainingDays <= 30) {
    return `あと${remainingDays}日 (約${Math.ceil(remainingDays / 7)}週間)`;
  } else {
    const weeks = Math.floor(remainingDays / 7);
    const months = Math.floor(remainingDays / 30);
    
    if (months > 0) {
      return `あと${remainingDays}日 (約${months}ヶ月)`;
    } else {
      return `あと${remainingDays}日 (約${weeks}週間)`;
    }
  }
};

/**
 * 学習推奨度を計算する（残り日数に基づく）
 * @param remainingDays 残り日数
 * @returns 推奨度（1-5、5が最も推奨）
 */
export const calculateStudyUrgency = (remainingDays: number): number => {
  if (remainingDays <= 0) {
    return 1; // 試験日が過ぎている場合は最低
  } else if (remainingDays <= 7) {
    return 5; // 1週間以内は最高
  } else if (remainingDays <= 14) {
    return 4; // 2週間以内
  } else if (remainingDays <= 30) {
    return 3; // 1ヶ月以内
  } else if (remainingDays <= 60) {
    return 2; // 2ヶ月以内
  } else {
    return 1; // それ以上は通常
  }
};
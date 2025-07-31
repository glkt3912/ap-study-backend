// データベースの初期データシード

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 12週間の学習計画データ
const studyPlanData = [
  {
    weekNumber: 1,
    title: "基礎固め期 - Week 1",
    phase: "基礎固め期",
    goals: JSON.stringify(["基本的な概念理解", "コンピュータ基礎の習得"]),
    days: [
      {
        day: "月",
        subject: "コンピュータの基礎理論",
        topics: JSON.stringify(["2進数、8進数、16進数", "論理演算", "補数表現"]),
        estimatedTime: 180
      },
      {
        day: "火", 
        subject: "アルゴリズムとデータ構造",
        topics: JSON.stringify(["ソート", "探索", "計算量"]),
        estimatedTime: 180
      },
      {
        day: "水",
        subject: "ハードウェア基礎",
        topics: JSON.stringify(["CPU", "メモリ", "入出力装置"]),
        estimatedTime: 180
      },
      {
        day: "木",
        subject: "ソフトウェア基礎", 
        topics: JSON.stringify(["OS", "ミドルウェア", "ファイルシステム"]),
        estimatedTime: 180
      },
      {
        day: "金",
        subject: "午前問題演習",
        topics: JSON.stringify(["1-20問", "基礎理論分野"]), 
        estimatedTime: 120
      }
    ]
  },
  {
    weekNumber: 2,
    title: "基礎固め期 - Week 2", 
    phase: "基礎固め期",
    goals: JSON.stringify(["ネットワーク基礎の理解", "データベース基礎の習得"]),
    days: [
      {
        day: "月",
        subject: "ネットワーク基礎",
        topics: JSON.stringify(["TCP/IP", "OSI参照モデル", "ルーティング"]),
        estimatedTime: 180
      },
      {
        day: "火",
        subject: "データベース基礎", 
        topics: JSON.stringify(["関係モデル", "正規化", "SQL基礎"]),
        estimatedTime: 180
      },
      {
        day: "水",
        subject: "セキュリティ基礎",
        topics: JSON.stringify(["暗号化", "認証", "ファイアウォール"]),
        estimatedTime: 180
      },
      {
        day: "木", 
        subject: "システム開発基礎",
        topics: JSON.stringify(["開発プロセス", "要件定義", "設計"]),
        estimatedTime: 180
      },
      {
        day: "金",
        subject: "午前問題演習",
        topics: JSON.stringify(["21-40問", "ネットワーク・DB分野"]),
        estimatedTime: 120
      }
    ]
  }
]

async function seedDatabase() {
  console.log('🌱 データベースの初期化を開始...')
  
  try {
    // 既存データを削除
    await prisma.studyDay.deleteMany()
    await prisma.studyWeek.deleteMany()
    
    // 学習週データを作成
    for (const weekData of studyPlanData) {
      const week = await prisma.studyWeek.create({
        data: {
          weekNumber: weekData.weekNumber,
          title: weekData.title,
          phase: weekData.phase,
          goals: weekData.goals,
        }
      })
      
      // 学習日データを作成
      for (const dayData of weekData.days) {
        await prisma.studyDay.create({
          data: {
            weekId: week.id,
            day: dayData.day,
            subject: dayData.subject,
            topics: dayData.topics,
            estimatedTime: dayData.estimatedTime,
            actualTime: 0,
            completed: false,
            understanding: 0
          }
        })
      }
    }
    
    console.log('✅ データベースの初期化が完了しました')
    console.log(`📊 作成されたデータ: ${studyPlanData.length}週間分の学習計画`)
    
    // 作成されたデータを確認
    const weekCount = await prisma.studyWeek.count()
    const dayCount = await prisma.studyDay.count()
    
    console.log(`📅 学習週: ${weekCount}件`)
    console.log(`📝 学習日: ${dayCount}件`)
    
  } catch (error) {
    console.error('❌ データベースの初期化に失敗しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 直接実行された場合のみシードを実行
seedDatabase()
  .then(() => {
    console.log('🎉 シード処理が完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 シード処理でエラーが発生しました:', error)
    process.exit(1) 
  })

export { seedDatabase }
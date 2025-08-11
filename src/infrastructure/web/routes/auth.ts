import { Hono } from 'hono'
import type { Variables } from '../middleware/auth'
import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { authMiddleware } from '../middleware/auth.js'
import { setCookie, deleteCookie } from 'hono/cookie'
import crypto from 'crypto'

// バリデーションスキーマ
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional()
})

const app = new Hono<{ Variables: Variables }>()
const prisma = new PrismaClient()

/**
 * ユーザー登録
 */
app.post('/signup', zValidator('json', signupSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid('json')
    const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key'
    
    // 既存ユーザーチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return c.json({
        success: false,
        error: 'このメールアドレスは既に使用されています',
        errorCode: 'USER_ALREADY_EXISTS',
        message: 'User already exists with this email'
      }, 409)
    }
    
    // パスワードハッシュ化
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0], // nameが未提供の場合、emailのlocal部分を使用
        role: 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
    
    // JWT生成
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2時間有効
    }
    
    const token = await sign(payload, JWT_SECRET)
    
    // リフレッシュトークン生成（7日間有効）
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const refreshTokenExp = new Date()
    refreshTokenExp.setDate(refreshTokenExp.getDate() + 7)
    
    // リフレッシュトークンをDBに保存
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExp
      }
    })
    
    // HttpOnly Cookieに設定
    setCookie(c, 'access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 2 * 60 * 60 // 2時間
    })
    
    setCookie(c, 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 // 7日間
    })
    
    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        token, // フロントエンド互換性のため残す
        user,
        expiresIn: '2h',
        refreshToken // セキュリティ強化版
      }
    }, 201)
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    // Zodバリデーションエラー
    if (error instanceof Error && error.name === 'ZodError') {
      return c.json({
        success: false,
        error: '入力内容に問題があります',
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.message
      }, 400)
    }
    
    
    return c.json({
      success: false,
      error: '内部サーバーエラーが発生しました',
      errorCode: 'INTERNAL_ERROR',
      message: 'Internal server error during signup'
    }, 500)
  }
})

/**
 * ユーザーログイン
 */
app.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')
    const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key'
    
    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      return c.json({
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }, 401)
    }
    
    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return c.json({
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }, 401)
    }
    
    // JWT生成
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2時間有効
    }
    
    const token = await sign(payload, JWT_SECRET)
    
    // リフレッシュトークン生成（7日間有効）
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const refreshTokenExp = new Date()
    refreshTokenExp.setDate(refreshTokenExp.getDate() + 7)
    
    // リフレッシュトークンをDBに保存
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExp
      }
    })
    
    // HttpOnly Cookieに設定
    setCookie(c, 'access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 2 * 60 * 60 // 2時間
    })
    
    setCookie(c, 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 // 7日間
    })
    
    // レスポンスからパスワードを除外
    const { password: _, ...userWithoutPassword } = user
    
    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        token, // フロントエンド互換性のため残す
        user: userWithoutPassword,
        expiresIn: '2h',
        refreshToken // セキュリティ強化版
      }
    })
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    // Zodバリデーションエラー
    if (error instanceof Error && error.name === 'ZodError') {
      return c.json({
        success: false,
        error: '入力内容に問題があります',
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.message
      }, 400)
    }
    
    
    return c.json({
      success: false,
      error: '内部サーバーエラーが発生しました',
      errorCode: 'INTERNAL_ERROR',
      message: 'Internal server error during login'
    }, 500)
  }
})

/**
 * ユーザー情報取得（要認証）
 */
app.get('/me', authMiddleware, async (c) => {
  try {
    // 認証ミドルウェアで設定された認証情報を取得
    const authUser = c.get('authUser')
    
    if (!authUser || authUser.userId === 0) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    
    // ユーザー詳細情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }
    
    return c.json({
      success: true,
      data: { user }
    })
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

/**
 * リフレッシュトークンベースのトークン更新
 */
app.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key'
    
    // Cookieからリフレッシュトークン取得 (優先)
    let refreshTokenFromCookie = null
    try {
      const cookieHeader = c.req.header('Cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
          const [name, value] = cookie.trim().split('=')
          acc[name] = value
          return acc
        }, {})
        refreshTokenFromCookie = cookies['refresh_token']
      }
    } catch (error) {
      console.warn('Cookie parsing failed:', error)
    }
    
    // リクエストボディからリフレッシュトークン取得 (フォールバック)
    const validatedBody = c.req.valid('json')
    const refreshTokenFromBody = validatedBody.refreshToken
    
    const refreshToken = refreshTokenFromCookie || refreshTokenFromBody
    
    if (!refreshToken) {
      throw new HTTPException(401, { 
        message: 'Refresh token required' 
      })
    }
    
    // DBからユーザー情報とリフレッシュトークンを検証
    const user = await prisma.user.findFirst({
      where: {
        refreshToken,
        refreshTokenExp: {
          gt: new Date() // 有効期限内
        }
      }
    })
    
    if (!user) {
      throw new HTTPException(401, { 
        message: 'Invalid or expired refresh token' 
      })
    }
    
    // 新しいアクセストークン生成
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2時間有効
    }
    
    const newToken = await sign(payload, JWT_SECRET)
    
    // 新しいリフレッシュトークン生成
    const newRefreshToken = crypto.randomBytes(64).toString('hex')
    const newRefreshTokenExp = new Date()
    newRefreshTokenExp.setDate(newRefreshTokenExp.getDate() + 7)
    
    // リフレッシュトークンをDBに更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExp: newRefreshTokenExp
      }
    })
    
    // HttpOnly Cookieに設定
    setCookie(c, 'access_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 2 * 60 * 60 // 2時間
    })
    
    setCookie(c, 'refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 // 7日間
    })
    
    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken, // フロントエンド互換性のため残す
        refreshToken: newRefreshToken,
        expiresIn: '2h'
      }
    })
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { 
      message: 'Internal server error during token refresh' 
    })
  }
})

/**
 * 開発環境用：テストユーザー作成
 */
if (process.env.NODE_ENV === 'development') {
  app.post('/dev/create-test-user', async (c) => {
    try {
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com'
      const testPassword = process.env.TEST_USER_PASSWORD || 'development-test-password'
      
      // 既存テストユーザーを削除
      await prisma.user.deleteMany({
        where: { email: testEmail }
      })
      
      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(testPassword, 12)
      
      // テストユーザー作成
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          name: 'Test User',
          role: 'user'
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      })
      
      return c.json({
        success: true,
        message: 'Test user created successfully',
        data: {
          user,
          credentials: {
            email: testEmail,
            password: testPassword
          }
        }
      })
      
    } catch (error) {
      throw new HTTPException(500, { message: 'Failed to create test user' })
    }
  })
}

export default app
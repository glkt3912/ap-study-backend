import { Hono } from 'hono'
import type { Variables } from '../middleware/auth'
import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { authMiddleware } from '../middleware/auth.js'

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
      throw new HTTPException(409, { message: 'User already exists with this email' })
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
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24時間有効
    }
    
    const token = await sign(payload, JWT_SECRET)
    
    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user,
        expiresIn: '24h'
      }
    }, 201)
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('Signup error:', error)
    throw new HTTPException(500, { message: 'Internal server error during signup' })
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
      throw new HTTPException(401, { message: 'Invalid email or password' })
    }
    
    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      throw new HTTPException(401, { message: 'Invalid email or password' })
    }
    
    // JWT生成
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24時間有効
    }
    
    const token = await sign(payload, JWT_SECRET)
    
    // レスポンスからパスワードを除外
    const { password: _, ...userWithoutPassword } = user
    
    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userWithoutPassword,
        expiresIn: '24h'
      }
    })
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('Login error:', error)
    throw new HTTPException(500, { message: 'Internal server error during login' })
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
    
    console.error('Get user profile error:', error)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

/**
 * トークンリフレッシュ
 */
app.post('/refresh', authMiddleware, async (c) => {
  try {
    const authUser = c.get('authUser')
    
    if (!authUser || authUser.userId === 0) {
      throw new HTTPException(401, { message: 'Valid authentication required for token refresh' })
    }
    
    const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key'
    
    // 新しいトークン生成
    const payload = {
      sub: authUser.userId,
      userId: authUser.userId,
      email: authUser.email,
      role: authUser.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24時間有効
    }
    
    const newToken = await sign(payload, JWT_SECRET)
    
    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        expiresIn: '24h'
      }
    })
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('Token refresh error:', error)
    throw new HTTPException(500, { message: 'Internal server error during token refresh' })
  }
})

/**
 * 開発環境用：テストユーザー作成
 */
if (process.env.NODE_ENV === 'development') {
  app.post('/dev/create-test-user', async (c) => {
    try {
      const testEmail = 'test@example.com'
      const testPassword = 'test1234'
      
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
      console.error('Test user creation error:', error)
      throw new HTTPException(500, { message: 'Failed to create test user' })
    }
  })
}

export default app
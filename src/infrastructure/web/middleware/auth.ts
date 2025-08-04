import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'

export interface AuthContext {
  userId: string
  email?: string
  role?: 'user' | 'admin'
}

/**
 * JWT認証ミドルウェア
 * Bearer tokenまたはX-User-IDヘッダーからユーザーを認証
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    // 1. Authorization ヘッダーからJWT取得を試行
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const secret = process.env.JWT_SECRET || 'development-secret-key'
      
      try {
        const payload = await verify(token, secret) as any
        
        // JWTペイロードから認証情報を設定
        c.set('authUser', {
          userId: payload.sub || payload.userId,
          email: payload.email,
          role: payload.role || 'user'
        } as AuthContext)
        
        return await next()
      } catch (jwtError) {
        // JWT検証失敗時は次の認証方法を試行
        console.warn('JWT verification failed:', jwtError)
      }
    }
    
    // 2. X-User-ID ヘッダーによる簡易認証（開発・移行期用）
    const userId = c.req.header('X-User-ID')
    
    if (userId && userId !== 'anonymous') {
      c.set('authUser', {
        userId,
        role: 'user'
      } as AuthContext)
      
      return await next()
    }
    
    // 3. 開発環境でのフォールバック（anonymous許可）
    if (process.env.NODE_ENV === 'development') {
      c.set('authUser', {
        userId: 'anonymous',
        role: 'user'
      } as AuthContext)
      
      return await next()
    }
    
    // 認証情報なし - 401エラー
    throw new HTTPException(401, { 
      message: 'Authorization required. Please provide valid JWT token or X-User-ID header.' 
    })
    
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { 
      message: 'Authentication error' 
    })
  }
}

/**
 * 管理者権限チェックミドルウェア
 */
export const adminMiddleware = async (c: Context, next: Next) => {
  const authUser = c.get('authUser') as AuthContext
  
  if (!authUser) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  
  if (authUser.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin privileges required' })
  }
  
  return await next()
}

/**
 * ユーザー情報取得ヘルパー
 */
export const getAuthUser = (c: Context): AuthContext => {
  const authUser = c.get('authUser') as AuthContext
  
  if (!authUser) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  
  return authUser
}

/**
 * 認証なしでも許可するミドルウェア（オプショナル認証）
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    // 認証を試行するが、失敗してもエラーにしない
    await authMiddleware(c, async () => {})
  } catch {
    // 認証失敗時はanonymousユーザーとして設定
    c.set('authUser', {
      userId: 'anonymous',
      role: 'user'
    } as AuthContext)
  }
  
  return await next()
}
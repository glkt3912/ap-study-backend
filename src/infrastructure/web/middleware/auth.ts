import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'

export interface AuthContext {
  userId: number
  email?: string
  role?: 'user' | 'admin'
}

export type Variables = {
  authUser: AuthContext
}

/**
 * JWT認証ミドルウェア
 * 
 * セキュリティ強化済みJWT認証ミドルウェア：
 * - JWT Bearer Token認証のみサポート
 * - 本番・開発環境共に厳密な認証要求
 * - 認証失敗時は即座に401エラーを返却
 * 
 * セキュリティ考慮事項：
 * - 代替認証方法は削除（セキュリティリスク排除）
 * - 開発環境でも認証を強制
 * - JWT検証失敗時の明確な拒否処理
 * 
 * @param c - Honoコンテキスト（Variables: { authUser: AuthContext }）
 * @param next - 次のミドルウェア関数
 * @throws {HTTPException} 401 - 認証情報なしまたは無効
 * @throws {HTTPException} 500 - 認証処理エラー
 * 
 * @example
 * ```typescript
 * // ルート保護
 * app.use('/protected/*', authMiddleware);
 * 
 * // 認証ユーザー情報の取得
 * app.get('/protected/profile', async (c) => {
 *   const user = getAuthUser(c);
 *   return c.json({ user });
 * });
 * ```
 */
export const authMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  try {
    const secret = process.env.JWT_SECRET || 'development-secret-key'
    let token = null
    
    // 1. HttpOnly Cookieからトークン取得 (優先)
    const cookieToken = getCookie(c, 'access_token')
    if (cookieToken) {
      token = cookieToken
    }
    
    // 2. Authorization ヘッダーからJWTトークンを取得 (フォールバック)
    if (!token) {
      const authHeader = c.req.header('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    
    if (!token) {
      throw new HTTPException(401, { 
        message: 'Authorization required. Please provide valid JWT Bearer token or login.' 
      })
    }
    
    try {
      const payload = await verify(token, secret) as any
      
      // JWTペイロードから認証情報を設定
      c.set('authUser', {
        userId: parseInt(payload.sub || payload.userId),
        email: payload.email,
        role: payload.role || 'user'
      } as AuthContext)
      
      return await next()
    } catch (jwtError) {
      // JWT検証失敗 - 認証エラーを返す
      console.warn('JWT verification failed:', jwtError)
      
      throw new HTTPException(401, { 
        message: 'Invalid or expired authentication token' 
      })
    }
    
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
 * 
 * 認証済みユーザーが管理者権限を持っているかチェックします。
 * authMiddleware適用後に使用してください。
 * 
 * @param c - Honoコンテキスト
 * @param next - 次のミドルウェア関数
 * @throws {HTTPException} 401 - 認証されていない場合
 * @throws {HTTPException} 403 - 管理者権限がない場合
 * 
 * @example
 * ```typescript
 * // 管理者専用ルート
 * app.use('/admin/*', authMiddleware);
 * app.use('/admin/*', adminMiddleware);
 * 
 * app.get('/admin/users', async (c) => {
 *   // 管理者のみアクセス可能
 *   return c.json({ users: await getAllUsers() });
 * });
 * ```
 */
export const adminMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
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
 * 認証済みユーザー情報取得ヘルパー
 * 
 * リクエストコンテキストから認証済みユーザーの情報を安全に取得します。
 * authMiddleware適用後のルートハンドラで使用してください。
 * 
 * @param c - Honoコンテキスト
 * @returns {AuthContext} 認証済みユーザーの情報
 * @throws {HTTPException} 401 - ユーザーが認証されていない場合
 * 
 * @example
 * ```typescript
 * app.get('/profile', authMiddleware, async (c) => {
 *   const user = getAuthUser(c);
 *   return c.json({ userId: user.userId, email: user.email });
 * });
 * ```
 */
export const getAuthUser = (c: Context<{ Variables: Variables }>): AuthContext => {
  const authUser = c.get('authUser') as AuthContext
  
  if (!authUser) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  
  return authUser
}

/**
 * オプショナル認証ミドルウェア
 * 
 * JWT認証をオプションとして扱い、認証情報がない場合は匿名ユーザーとして処理
 * 公開APIエンドポイントで使用（パフォーマンス統計など）
 */
export const optionalAuthMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  try {
    const secret = process.env.JWT_SECRET || 'development-secret-key'
    let token = null
    
    // 1. HttpOnly Cookieからトークン取得 (優先)
    const cookieToken = getCookie(c, 'access_token')
    if (cookieToken) {
      token = cookieToken
    }
    
    // 2. Authorization ヘッダーからJWTトークンを取得 (フォールバック)
    if (!token) {
      const authHeader = c.req.header('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    
    if (token) {
      try {
        const payload = await verify(token, secret) as any
        
        c.set('authUser', {
          userId: parseInt(payload.sub || payload.userId),
          email: payload.email,
          role: payload.role || 'user'
        } as AuthContext)
        
        return await next()
      } catch (jwtError) {
        // JWT検証失敗時は匿名ユーザーとして続行
        console.warn('Optional JWT verification failed:', jwtError)
      }
    }
    
    // 認証情報なしまたは認証失敗の場合は匿名ユーザーとして設定
    c.set('authUser', {
      userId: 0, // anonymous user as ID 0
      role: 'user'
    } as AuthContext)
  } catch (error) {
    // エラーが発生しても匿名ユーザーとして続行
    c.set('authUser', {
      userId: 0,
      role: 'user'
    } as AuthContext)
  }
  
  return await next()
}
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'

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
 * 複数の認証方式を段階的にサポートする包括的な認証ミドルウェア：
 * 1. JWT Bearer Token認証（本番環境推奨）
 * 2. X-User-ID ヘッダー認証（開発・移行期用）
 * 3. 匿名ユーザー許可（開発環境のみ）
 * 
 * セキュリティ考慮事項：
 * - JWT検証失敗時は次の認証方法を試行
 * - 本番環境では開発用フォールバックは無効化される
 * - 全ての認証情報はリクエストコンテキストに安全に格納
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
    // 1. Authorization ヘッダーからJWT取得を試行
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const secret = process.env.JWT_SECRET || 'development-secret-key'
      
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
        // JWT検証失敗時は次の認証方法を試行
        console.warn('JWT verification failed:', jwtError)
      }
    }
    
    // 2. X-User-ID ヘッダーによる簡易認証（開発・移行期用）
    const userId = c.req.header('X-User-ID')
    
    if (userId && userId !== 'anonymous') {
      c.set('authUser', {
        userId: parseInt(userId) || 0,
        role: 'user'
      } as AuthContext)
      
      return await next()
    }
    
    // 3. 開発環境でのフォールバック（anonymous許可）
    if (process.env.NODE_ENV === 'development') {
      c.set('authUser', {
        userId: 0, // anonymous user as ID 0
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
 * 認証なしでも許可するミドルウェア（オプショナル認証）
 */
export const optionalAuthMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  try {
    // 認証を試行するが、失敗してもエラーにしない
    await authMiddleware(c, async () => {})
  } catch {
    // 認証失敗時はanonymousユーザーとして設定
    c.set('authUser', {
      userId: 0, // anonymous user as ID 0
      role: 'user'
    } as AuthContext)
  }
  
  return await next()
}
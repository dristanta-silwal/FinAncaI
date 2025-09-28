import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
type Env = {
    JWT_SECRET: string;
};
type UserPayload = {
    id: string;
    exp: number;
};
export const authMiddleware = createMiddleware<{ Bindings: Env, Variables: { user: { id: string } } }>(async (c, next) => {
    const token = getCookie(c, 'auth_token');
    if (!token) {
        return c.json({ success: false, error: 'Unauthorized: No token provided' }, 401);
    }
    try {
        const decoded = await verify(token, c.env.JWT_SECRET) as UserPayload;
        if (decoded.exp < Date.now() / 1000) {
            return c.json({ success: false, error: 'Unauthorized: Token expired' }, 401);
        }
        c.set('user', { id: decoded.id });
        await next();
    } catch (error) {
        return c.json({ success: false, error: 'Unauthorized: Invalid token' }, 401);
    }
});
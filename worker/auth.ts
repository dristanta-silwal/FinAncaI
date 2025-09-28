import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from './middleware';
type Env = {
    DB: D1Database;
    JWT_SECRET: string;
};
const app = new Hono<{ Bindings: Env }>();
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
app.post('/register', zValidator('json', authSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const passwordHash = await hashPassword(password);
    const userId = `user_${crypto.randomUUID()}`;
    try {
        await c.env.DB.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
            .bind(userId, email, passwordHash)
            .run();
        return c.json({ success: true, message: 'User registered successfully' });
    } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed')) {
            return c.json({ success: false, error: 'Email already in use' }, 409);
        }
        console.error('Registration error:', e);
        return c.json({ success: false, error: 'Registration failed' }, 500);
    }
});
app.post('/login', zValidator('json', authSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const passwordHash = await hashPassword(password);
    const user = await c.env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?')
        .bind(email)
        .first<{ id: string; password_hash: string }>();
    if (!user || user.password_hash !== passwordHash) {
        return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }
    const payload = {
        id: user.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };
    const token = await sign(payload, c.env.JWT_SECRET);
    setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 60 * 60 * 24,
    });
    return c.json({ success: true, user: { id: user.id, email } });
});
app.post('/logout', (c) => {
    deleteCookie(c, 'auth_token', { path: '/' });
    return c.json({ success: true, message: 'Logged out successfully' });
});
app.get('/session', authMiddleware, (c) => {
    const user = c.get('user');
    return c.json({ success: true, user });
});
export default app;
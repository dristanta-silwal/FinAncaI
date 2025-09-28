import { create } from 'zustand';
import { toast } from 'sonner';
interface User {
    id: string;
    email?: string;
}
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: any) => Promise<boolean>;
    register: (credentials: any) => Promise<boolean>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}
export const useAuth = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: async (credentials) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            const data = await response.json();
            if (data.success) {
                set({ user: data.user, isAuthenticated: true });
                toast.success('Login successful!');
                return true;
            } else {
                toast.error(data.error || 'Login failed.');
                return false;
            }
        } catch (error) {
            toast.error('An error occurred during login.');
            return false;
        }
    },
    register: async (credentials) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Registration successful! Please log in.');
                return true;
            } else {
                toast.error(data.error || 'Registration failed.');
                return false;
            }
        } catch (error) {
            toast.error('An error occurred during registration.');
            return false;
        }
    },
    logout: async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error("Logout failed on server, clearing client state anyway.");
        } finally {
            set({ user: null, isAuthenticated: false });
            toast.info('You have been logged out.');
        }
    },
    checkSession: async () => {
        set({ isLoading: true });
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    set({ user: data.user, isAuthenticated: true });
                } else {
                    set({ user: null, isAuthenticated: false });
                }
            } else {
                set({ user: null, isAuthenticated: false });
            }
        } catch (error) {
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },
}));
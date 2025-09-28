import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { PiggyBank } from 'lucide-react';
const authSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});
type AuthFormData = z.infer<typeof authSchema>;
export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuth();
    const { register: formRegister, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFormData>({
        resolver: zodResolver(authSchema),
    });
    const onSubmit = async (data: AuthFormData) => {
        if (isLogin) {
            await login(data);
        } else {
            const success = await register(data);
            if (success) {
                setIsLogin(true); // Switch to login form on successful registration
            }
        }
    };
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-brand-yellow border-2 border-black flex items-center justify-center">
                        <PiggyBank className="w-10 h-10 text-black" />
                    </div>
                    <h1 className="text-5xl font-mono font-bold uppercase">Analyst Ledger</h1>
                </div>
                <div className="brutalist-card p-8">
                    <h2 className="text-3xl font-bold text-center mb-6">{isLogin ? 'Login' : 'Register'}</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="text-lg font-bold uppercase">Email</label>
                            <input
                                id="email"
                                type="email"
                                {...formRegister('email')}
                                className="brutalist-input mt-2"
                                disabled={isSubmitting}
                            />
                            {errors.email && <p className="text-red-500 mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="password" className="text-lg font-bold uppercase">Password</label>
                            <input
                                id="password"
                                type="password"
                                {...formRegister('password')}
                                className="brutalist-input mt-2"
                                disabled={isSubmitting}
                            />
                            {errors.password && <p className="text-red-500 mt-1">{errors.password.message}</p>}
                        </div>
                        <button type="submit" className="brutalist-button brutalist-button-yellow w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
                        </button>
                    </form>
                    <p className="mt-6 text-center">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="font-bold underline ml-2 hover:text-brand-yellow">
                            {isLogin ? 'Register' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { HomePage } from '@/pages/HomePage';
import { AuthPage } from '@/pages/AuthPage';
import { Toaster } from '@/components/ui/sonner';
function App() {
    const isAuthenticated = useAuth(state => state.isAuthenticated);
    const checkSession = useAuth(state => state.checkSession);
    const isLoading = useAuth(state => state.isLoading);
    useEffect(() => {
        checkSession();
    }, [checkSession]);
    if (isLoading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-background">
                <div className="text-2xl font-mono animate-pulse">ANALYZING...</div>
            </div>
        );
    }
    return (
        <>
            <Routes>
                <Route
                    path="/"
                    element={isAuthenticated ? <HomePage /> : <Navigate to="/auth" replace />}
                />
                <Route
                    path="/auth"
                    element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" replace />}
                />
            </Routes>
            <Toaster />
        </>
    );
}
export default App;
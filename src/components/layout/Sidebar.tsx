import { NAV_ITEMS, ViewName } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PiggyBank, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
interface SidebarProps {
  currentView: ViewName;
  setCurrentView: (view: ViewName) => void;
}
export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const logout = useAuth(state => state.logout);
  return (
    <aside className="w-[250px] fixed top-0 left-0 h-full bg-background border-r-2 border-black flex flex-col p-8">
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-brand-yellow border-2 border-black flex items-center justify-center">
            <PiggyBank className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-mono font-bold uppercase">Analyst Ledger</h1>
        </div>
        <nav className="flex flex-col gap-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setCurrentView(item.name)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-lg font-bold border-2 border-black rounded-none transition-all duration-200',
                  isActive
                    ? 'bg-black text-white shadow-[4px_4px_0px_#FFFF00]'
                    : 'bg-background text-black hover:bg-yellow-300'
                )}
              >
                <Icon className="w-6 h-6" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 text-lg font-bold border-2 border-black rounded-none transition-all duration-200 bg-background text-black hover:bg-red-500 hover:text-white"
        >
          <LogOut className="w-6 h-6" />
          <span>Logout</span>
        </button>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Built with ❤️ at Cloudflare
        </p>
      </div>
    </aside>
  );
}
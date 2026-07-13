import { useEffect } from 'react';
import { Menu, Sparkles, User } from 'lucide-react';
import { Sidebar } from '../sidebar/Sidebar';
import { ChatArea } from '../chat/ChatArea';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { useChatStore } from '../../store/useChatStore';
import { SettingsDrawer } from './SettingsDrawer';
import { cn } from '../../lib/utils';

export const Layout = () => {
  const { theme, avatar } = useChatStore();

  // Apply dark mode by default if theme is 'system'
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <div className="flex h-screen w-full overflow-hidden text-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        
        {/* Top header bar */}
        <header className="h-[60px] border-b border-border/40 flex items-center justify-between px-5 bg-background/50 backdrop-blur-2xl z-20 sticky top-0 shrink-0">
          
          {/* Left: Mobile menu + branding */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r-0 bg-background/95 backdrop-blur-2xl">
                <div className="h-full w-full">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 via-primary/20 to-violet-500/20 border border-primary/25 flex items-center justify-center shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-[14px] text-foreground">Nova AI</span>
                <span className="ml-1.5 text-[11px] text-muted-foreground/60 font-medium hidden sm:inline">Private RAG</span>
              </div>
            </div>
          </div>



          {/* Right: Stats + Settings + Avatar */}
          <div className="flex items-center gap-2.5 flex-1 justify-end">
            <SettingsDrawer />

            {/* User avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 transition-all",
              avatar ? "border-primary/40 shadow-sm shadow-primary/20" : "border-border/50 bg-muted/50"
            )}>
              {avatar ? (
                <img src={avatar} alt="User" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat area */}
        <ChatArea />
      </main>
    </div>
  );
};

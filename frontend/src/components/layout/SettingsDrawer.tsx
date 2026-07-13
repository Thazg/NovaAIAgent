import { useRef, useState, useEffect } from 'react';
import { Settings as SettingsIcon, Monitor, User, MessageSquare, Info, Upload, Keyboard, Globe, Shield, Trash2, Heart, Code, HardDrive, Cpu, Database, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useChatStore } from '../../store/useChatStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { api, type Document } from '../../services/api';

export const SettingsDrawer = () => {
  const { theme, setTheme, avatar, setAvatar, displayName, setDisplayName, settingsOpen, setSettingsOpen, customInstructions, setCustomInstructions, characterStyle, setCharacterStyle, nickname, setNickname, developerMode, setDeveloperMode } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState('general');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [summarizingFile, setSummarizingFile] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  const devSections = developerMode
    ? [
        { id: 'backend', icon: HardDrive, label: 'Backend' },
        { id: 'system', icon: Cpu, label: 'System' },
      ]
    : [];

  const sections = [
    { id: 'general', icon: Globe, label: 'General' },
    { id: 'appearance', icon: Monitor, label: 'Appearance' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'personalization', icon: Heart, label: 'Personalization' },
    { id: 'privacy', icon: Shield, label: 'Privacy & Data' },
    { id: 'shortcuts', icon: Keyboard, label: 'Shortcuts' },
    { id: 'storage', icon: Database, label: 'Storage' },
    ...devSections,
    { id: 'developer', icon: Code, label: 'Developer' },
    { id: 'about', icon: Info, label: 'About' },
  ];

  useEffect(() => {
    if (settingsOpen && activeSection === 'storage') {
      setLoadingDocs(true);
      api.getDocuments()
        .then(setDocuments)
        .catch(() => setDocuments([]))
        .finally(() => setLoadingDocs(false));
    }
  }, [settingsOpen, activeSection]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground group">
          <SettingsIcon className="h-5 w-5 transition-transform group-hover:rotate-45 duration-300" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl p-0 border-l border-border/50 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="p-6 border-b border-border/50 text-left">
          <SheetTitle className="text-xl font-medium tracking-tight">Settings</SheetTitle>
        </SheetHeader>
        
        <div className="flex h-[calc(100vh-80px)]">
          {/* Sidebar Navigation */}
          <div className="w-52 border-r border-border/50 p-4 hidden sm:block">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1 px-6 py-6 pb-24">
            <div className="space-y-8 max-w-2xl">
              
              {/* General */}
              {activeSection === 'general' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Globe className="h-4 w-4" />
                    General
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Notifications</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Sound Effects</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Auto-save Conversations</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Appearance (with Animations merged) */}
              {activeSection === 'appearance' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Monitor className="h-4 w-4" />
                    Appearance
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['light', 'dark', 'system'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t as any)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          theme === t 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Font Size</label>
                      <select className="h-8 rounded-lg bg-background border border-border/50 px-2 text-sm">
                        <option>Small</option>
                        <option selected>Medium</option>
                        <option>Large</option>
                      </select>
                    </div>
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-[11px] font-medium text-muted-foreground/70 mb-2">Animations</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Reduce Motion</label>
                          <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Message Animations</label>
                          <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Sidebar Animations</label>
                          <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Profile */}
              {activeSection === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <User className="h-4 w-4" />
                    Profile
                  </div>
                  <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border/50 bg-muted flex items-center justify-center shrink-0">
                          {avatar ? <img src={avatar} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
                        </div>
                        <Button 
                          size="icon" 
                          className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full shadow-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleAvatarChange}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                        <Input 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="h-9 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Chat */}
              {activeSection === 'chat' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Streaming</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Auto Scroll</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Show Timestamps</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Markdown Rendering</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Personalization */}
              {activeSection === 'personalization' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Heart className="h-4 w-4" />
                    Personalization
                  </div>
                  <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Character Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'warm', label: 'Warm', desc: 'Caring, affectionate tone' },
                          { id: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic, excited' },
                          { id: 'professional', label: 'Professional', desc: 'Formal, polished' },
                          { id: 'concise', label: 'Concise', desc: 'Direct, to the point' },
                          { id: 'friendly', label: 'Friendly', desc: 'Casual, approachable' },
                          { id: 'custom', label: 'Custom', desc: 'Use your instructions' },
                        ].map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setCharacterStyle(c.id)}
                            className={cn(
                              'px-3 py-2.5 rounded-xl text-left transition-all',
                              characterStyle === c.id
                                ? 'bg-primary/10 border border-primary/30 text-primary'
                                : 'bg-background border border-border/40 text-muted-foreground hover:border-border/70'
                            )}
                          >
                            <p className="text-[13px] font-medium">{c.label}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{c.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/30 space-y-3">
                      <label className="text-xs font-medium text-muted-foreground">Nickname</label>
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="What should I call you?"
                        className="h-9 rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Custom Instruction</label>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => {
                          setCustomInstructions(e.target.value);
                          if (e.target.value && characterStyle !== 'custom') {
                            setCharacterStyle('custom');
                          }
                        }}
                        placeholder="Additional behaviour, style, tone preferences"
                        className="w-full min-h-[100px] rounded-xl bg-background border border-border/50 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <p className="text-[10px] text-muted-foreground/50">These instructions will be sent with every message.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Privacy & Data */}
              {activeSection === 'privacy' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Shield className="h-4 w-4" />
                    Privacy & Data
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Auto-save Conversations</label>
                        <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Local Processing Only</label>
                        <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Anonymous Usage Data</label>
                        <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/30 space-y-2">
                      <Button variant="outline" className="w-full rounded-xl justify-start text-sm h-9 gap-2" onClick={() => {
                        useChatStore.getState().clearAllConversations();
                        toast.success('All conversations cleared');
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span>Clear All Conversations</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Shortcuts */}
              {activeSection === 'shortcuts' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Keyboard className="h-4 w-4" />
                    Keyboard Shortcuts
                  </div>
                  <div className="space-y-2 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">New Chat</span>
                      <kbd className="px-2 py-1 rounded bg-background border border-border/50 text-xs">Ctrl + N</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Global Search</span>
                      <kbd className="px-2 py-1 rounded bg-background border border-border/50 text-xs">Ctrl + K</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Focus Input</span>
                      <kbd className="px-2 py-1 rounded bg-background border border-border/50 text-xs">Ctrl + /</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stop Generation</span>
                      <kbd className="px-2 py-1 rounded bg-background border border-border/50 text-xs">Esc</kbd>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Storage */}
              {activeSection === 'storage' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Database className="h-4 w-4" />
                    Storage
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    {loadingDocs ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Uploaded Files</span>
                            <span className="font-mono text-xs text-foreground">{documents.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Size</span>
                            <span className="font-mono text-xs text-foreground">
                              {documents.reduce((s, d) => s + d.size, 0) > 1048576
                                ? `${(documents.reduce((s, d) => s + d.size, 0) / 1048576).toFixed(1)} MB`
                                : `${(documents.reduce((s, d) => s + d.size, 0) / 1024).toFixed(0)} KB`}
                            </span>
                          </div>
                        </div>
                        {documents.length > 0 && (
                          <div className="pt-2 space-y-1.5 max-h-40 overflow-y-auto">
                            {documents.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <FileText className="h-3 w-3 shrink-0" />
                                <button
                                  onClick={async () => {
                                    setSummarizingFile(doc.name);
                                    setSummaryResult(null);
                                    try {
                                      const res = await api.summarizeDocument(doc.name);
                                      setSummaryResult(res.summary);
                                    } catch {
                                      toast.error('Failed to summarize');
                                    } finally {
                                      setSummarizingFile(null);
                                    }
                                  }}
                                  className="truncate flex-1 text-left hover:text-primary transition-colors"
                                >
                                  {doc.name}
                                </button>
                                <span className="shrink-0">{doc.size > 1024 ? `${(doc.size / 1024).toFixed(0)} KB` : `${doc.size} B`}</span>
                                {summarizingFile === doc.name ? (
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                ) : (
                                  <button
                                    onClick={async () => {
                                      setSummarizingFile(doc.name);
                                      setSummaryResult(null);
                                      try {
                                        const res = await api.summarizeDocument(doc.name);
                                        setSummaryResult(res.summary);
                                      } catch {
                                        toast.error('Failed to summarize');
                                      } finally {
                                        setSummarizingFile(null);
                                      }
                                    }}
                                    className="text-[10px] text-primary/70 hover:text-primary shrink-0 ml-1"
                                  >
                                    Summarize
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {summaryResult && (
                          <div className="pt-2 border-t border-border/30">
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Summary:</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{summaryResult}</p>
                            <button
                              onClick={() => setSummaryResult(null)}
                              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground mt-1"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        <div className="pt-3 border-t border-border/30 space-y-2">
                          <Button variant="outline" className="w-full rounded-xl justify-start text-sm h-9 gap-2" onClick={async () => {
                            try {
                              const result = await api.clearAllDocuments();
                              setDocuments([]);
                              toast.success(`Deleted ${result.deleted} file(s)`);
                            } catch {
                              toast.error('Failed to clear files');
                            }
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span>Delete All Files</span>
                          </Button>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground/50">Uploaded documents are stored on the server.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Developer Mode */}
              {activeSection === 'developer' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Code className="h-4 w-4" />
                    Developer Mode
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">Enable Developer Mode</label>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">Show backend, system, and debug tools</p>
                      </div>
                      <input
                        type="checkbox"
                        className="accent-primary h-4 w-4 rounded-sm"
                        checked={developerMode}
                        onChange={(e) => setDeveloperMode(e.target.checked)}
                      />
                    </div>
                    {developerMode && (
                      <div className="pt-3 border-t border-border/30 space-y-2">
                        <p className="text-xs text-muted-foreground/70">Additional sections are now visible in the sidebar navigation.</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                          <HardDrive className="h-3 w-3" />
                          <span>Backend — API config, health</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                          <Cpu className="h-3 w-3" />
                          <span>System — Model info, diagnostics</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Backend (developer only) */}
              {activeSection === 'backend' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <HardDrive className="h-4 w-4" />
                    Backend
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">API URL</label>
                      <Input className="h-9 rounded-lg" defaultValue="http://localhost:8000" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Health Check</label>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-muted-foreground/70">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Streaming</label>
                      <input type="checkbox" className="accent-primary h-4 w-4 rounded-sm" defaultChecked />
                    </div>
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground/50">Backend runs locally via FastAPI + Ollama.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* System (developer only) */}
              {activeSection === 'system' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Cpu className="h-4 w-4" />
                    System
                  </div>
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">AI Provider</label>
                      <div className="text-sm font-mono p-2 bg-background rounded-md border text-foreground">Groq (llama-3.1-8b-instant)</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Retrieval Top-K</label>
                      <span className="text-xs font-mono text-muted-foreground">5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Context Window</label>
                      <span className="text-xs font-mono text-muted-foreground">4096</span>
                    </div>
                    <div className="pt-2 border-t border-border/30 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">RAG Pipeline</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['TF-IDF', 'FAISS', 'Context Builder', 'Prompt Assembly'].map((step) => (
                          <span key={step} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">{step}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* About */}
              {activeSection === 'about' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Info className="h-4 w-4" />
                    About
                  </div>
                  <div className="p-4 bg-muted/20 rounded-xl border border-border/50 text-center space-y-1">
                    <h4 className="font-bold text-sm tracking-widest text-foreground">NOVA AI AGENT</h4>
                    <p className="text-xs text-muted-foreground">Version 2.0.0</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">Premium Enterprise RAG Platform</p>
                    <div className="pt-4 border-t border-border/30 mt-4">
                      <p className="text-xs text-muted-foreground">Built with React, TypeScript, and Framer Motion</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

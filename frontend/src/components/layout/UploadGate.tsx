import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Upload, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export const UploadGate = ({ onContinue }: { onContinue: () => void }) => {
  const [, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        onContinue();
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadDocument(file);
      await loadDocs();
    } catch {
      /* ignore */
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 28 }}
          className="relative z-10 flex flex-col items-center text-center max-w-lg w-full px-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 20 }}
            className="w-[84px] h-[84px] rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-violet-500/20 flex items-center justify-center border border-primary/25 shadow-xl shadow-primary/15 backdrop-blur-sm mb-8"
          >
            <Bot className="w-10 h-10 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/95 to-foreground/70">
              Welcome to{" "}
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-violet-400 to-primary/80">
              Nova
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-base text-muted-foreground/80 mb-8 max-w-sm"
          >
            Your knowledge base is empty. Upload at least one document to get started.
          </motion.p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.md,.markdown,.rst,.txt,.py,.docx"
          />

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group flex items-center gap-4 w-full max-w-sm p-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-250 text-left relative overflow-hidden"
          >
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/50 shadow-sm group-hover:scale-110 transition-transform duration-300 text-primary">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground/90">
                {uploading ? "Uploading..." : "Upload a document"}
              </p>
              <p className="text-[13px] text-muted-foreground/75 leading-snug">
                PDF, DOCX, Markdown, TXT, or Python files
              </p>
            </div>
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="text-xs text-muted-foreground/50 mt-4"
          >
            Or say "search for &lt;topic&gt;" once you start chatting
          </motion.p>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-muted-foreground/50 mt-6"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking documents...
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

import { Bot, Code, FileText, Search, Zap, Database } from 'lucide-react';
import { motion } from 'framer-motion';

const SUGGESTIONS = [
  {
    title: "Explore your documents",
    description: "What are the key findings in my research papers?",
    icon: <Search className="w-5 h-5" />,
    color: "from-blue-500/20 to-indigo-500/10",
    iconColor: "text-blue-400",
    border: "border-blue-500/20 hover:border-blue-500/50",
    glow: "hover:shadow-blue-500/10"
  },
  {
    title: "Summarize content",
    description: "Summarize the main points from this document.",
    icon: <FileText className="w-5 h-5" />,
    color: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-400",
    border: "border-violet-500/20 hover:border-violet-500/50",
    glow: "hover:shadow-violet-500/10"
  },
  {
    title: "Generate code",
    description: "Write a function to process text data.",
    icon: <Code className="w-5 h-5" />,
    color: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    glow: "hover:shadow-emerald-500/10"
  },
  {
    title: "Query knowledge base",
    description: "What topics are covered in my knowledge base?",
    icon: <Database className="w-5 h-5" />,
    color: "from-orange-500/20 to-amber-500/10",
    iconColor: "text-orange-400",
    border: "border-orange-500/20 hover:border-orange-500/50",
    glow: "hover:shadow-orange-500/10"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.4 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

export const WelcomeScreen = ({ onSelectSuggestion }: { onSelectSuggestion: (text: string) => void }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-5xl mx-auto h-full relative select-none">
      
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center space-y-7 mb-16 relative z-10"
      >
        {/* Logo/icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
          className="relative"
        >
          <div className="w-[76px] h-[76px] rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-violet-500/20 flex items-center justify-center border border-primary/25 shadow-xl shadow-primary/15 backdrop-blur-sm">
            <Bot className="w-9 h-9 text-primary drop-shadow-sm" />
          </div>
          {/* Status pulse */}
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-background flex items-center justify-center"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Outer glow ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl border border-primary/20"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-[0.15em] uppercase"
          >
            <Zap className="w-3 h-3 fill-current" />
            Nova AI Agent
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[3.5rem] md:text-[4rem] font-bold tracking-[-0.04em] leading-none"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/95 to-foreground/70">
              Your Private
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-violet-400 to-primary/80">
              AI Knowledge
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-base text-muted-foreground/90 max-w-md leading-relaxed mx-auto"
          >
            Ask questions across your documents, retrieve trusted answers, and chat intelligently with your knowledge base — entirely offline.
          </motion.p>
        </div>
      </motion.div>

      {/* Suggestion cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[780px] relative z-10"
      >
        {SUGGESTIONS.map((suggestion, idx) => (
          <motion.button
            key={idx}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSelectSuggestion(suggestion.description)}
            className={`group flex items-start gap-4 p-5 rounded-2xl border bg-card/40 hover:bg-card/70 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-250 text-left relative overflow-hidden ${suggestion.border} hover:shadow-lg`}
          >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${suggestion.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
            
            {/* Icon */}
            <div className={`relative z-10 p-2.5 rounded-xl bg-background/60 border border-border/50 shadow-sm group-hover:scale-110 transition-transform duration-300 ${suggestion.iconColor}`}>
              {suggestion.icon}
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-1.5 flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground/90 group-hover:text-foreground transition-colors">
                {suggestion.title}
              </p>
              <p className="text-[13px] text-muted-foreground/75 leading-snug">
                {suggestion.description}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Keyboard hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="mt-8 flex items-center gap-2 text-[12px] text-muted-foreground/45 relative z-10"
      >
        <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">↵ Enter</kbd>
        <span>to send</span>
        <span className="mx-1 opacity-40">·</span>
        <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">⇧ Shift+↵</kbd>
        <span>for new line</span>
        <span className="mx-1 opacity-40">·</span>
        <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">Ctrl+K</kbd>
        <span>to search</span>
      </motion.div>
    </div>
  );
};

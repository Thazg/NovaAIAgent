import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartupScreenProps {
  onReady: () => void;
}

const STEPS = [
  { label: 'Initializing Nova AI...', progress: 15 },
  { label: 'Connecting to backend...', progress: 35 },
  { label: 'Loading AI model...', progress: 65 },
  { label: 'Loading knowledge base...', progress: 85 },
  { label: 'Ready.', progress: 100 },
];

export const StartupScreen = ({ onReady }: StartupScreenProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        if (isMounted) {
          setStepIndex(1);
        }

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/health`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (!res.ok) throw new Error('Backend not ready');
        const data = await res.json();

        if (!isMounted) return;

        const llmReady = data.ollama === 'running' || data.llm_provider === 'groq';
        if (llmReady) {
          setStepIndex(2);
          await new Promise(r => setTimeout(r, 700));
          if (!isMounted) return;

          setStepIndex(3);
          await new Promise(r => setTimeout(r, 600));
          if (!isMounted) return;

          setStepIndex(4);

          setTimeout(() => {
            if (isMounted) onReady();
          }, 500);
        } else {
          setError('Ollama is not running. Please start Ollama and try again.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
          setError(null);
          setTimeout(checkHealth, 3000);
        } else {
          setError(null);
          setTimeout(checkHealth, 3000);
        }
      }
    };

    // Short delay then kick off
    const t = setTimeout(checkHealth, 300);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [onReady]);

  const currentStep = STEPS[stepIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden"
      >
        {/* Ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.12),transparent)] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center gap-8"
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.2)', '0 0 40px rgba(99,102,241,0.35)', '0 0 20px rgba(99,102,241,0.2)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-violet-500/20 border border-primary/25 flex items-center justify-center backdrop-blur-sm"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Nova AI Agent
              </h1>
              <p className="text-sm text-muted-foreground/60 mt-1 font-medium">
                Private RAG Workspace
              </p>
            </div>
          </div>

          {/* Progress section */}
          <div className="flex flex-col items-center gap-4 w-72">
            {/* Progress bar */}
            <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${currentStep.progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Status text */}
            <div className="h-5 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stepIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-[13px] text-muted-foreground/70 font-medium text-center"
                >
                  {error || currentStep.label}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Retry hint if error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[12px] text-muted-foreground/50 text-center"
              >
                Retrying automatically...
              </motion.p>
            )}
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full transition-all duration-300"
                animate={{
                  width: i === stepIndex ? 20 : 6,
                  backgroundColor: i < stepIndex
                    ? 'hsl(var(--primary))'
                    : i === stepIndex
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--border))',
                  height: 6,
                  opacity: i > stepIndex ? 0.35 : 1,
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

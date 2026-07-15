import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, EyeOff, LogIn, UserPlus, Loader2, ChevronRight } from 'lucide-react';

const keyframesStyle = `@keyframes bS{0%{background-position:50% 0%}50%{background-position:50% 100%}100%{background-position:50% 0%}}`;

function Particles({ theme }: { theme: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = theme === 'dark';
    let animId: number;
    const PARTICLE_COUNT = 160;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      r: number; baseR: number; alpha: number; baseAlpha: number;
      hue: number; pulseSpeed: number; pulseOffset: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent | TouchEvent) => {
      const pos = 'touches' in e ? e.touches[0] : e;
      mouseRef.current = { x: pos.clientX, y: pos.clientY };
    };
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onMouse);
    window.addEventListener('mouseleave', onMouseLeave);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isStar = i < 12;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: isStar ? Math.random() * 1.5 + 1.5 : Math.random() * 2 + 0.5,
        baseR: isStar ? Math.random() * 1.5 + 1.5 : Math.random() * 2 + 0.5,
        alpha: 0,
        baseAlpha: isStar ? Math.random() * 0.4 + 0.5 : Math.random() * 0.35 + 0.1,
        hue: isDark ? 220 + Math.random() * 60 : 230 + Math.random() * 40,
        pulseSpeed: 0.5 + Math.random() * 1.5,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const isActive = mx > -5000;
      const t = time * 0.001;

      // Repulsion field aura
      if (isActive) {
        for (let ring = 0; ring < 4; ring++) {
          const r = 80 + ring * 55 + Math.sin(t * 0.7 + ring * 1.5) * 12;
          const aura = ctx.createRadialGradient(mx, my, 0, mx, my, r);
          aura.addColorStop(0, isDark
            ? `rgba(139,92,246,${0.06 - ring * 0.013})`
            : `rgba(99,102,241,${0.05 - ring * 0.01})`);
          aura.addColorStop(0.5, isDark
            ? `rgba(139,92,246,${0.025 - ring * 0.006})`
            : `rgba(99,102,241,${0.02 - ring * 0.005})`);
          aura.addColorStop(1, 'transparent');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(mx, my, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update & draw particles
      for (const p of particles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pulse = Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7;

        // Mouse interaction — antigravity (pure repulsion)
        if (isActive && dist < 300) {
          const force = (300 - dist) / 300;
          const angle = Math.atan2(dy, dx);

          // Repel: push away from mouse, stronger when closer
          const repelStr = (300 - dist) / 300 * 1.2;
          p.vx += Math.cos(angle) * repelStr;
          p.vy += Math.sin(angle) * repelStr;

          // Friction bubble: slow particles inside the field
          p.vx *= 0.94;
          p.vy *= 0.94;

          // Glow effect fades with distance
          const glow = force * 0.7;
          p.alpha = Math.min(p.baseAlpha + glow * 0.4, 1);
          const drawR = p.baseR + glow * 1.2 + pulse * 0.3;

          ctx.beginPath();
          ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
          if (isDark) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, drawR);
            grad.addColorStop(0, `hsla(${p.hue}, 80%, 75%, ${p.alpha})`);
            grad.addColorStop(1, `hsla(${p.hue}, 50%, 45%, ${p.alpha * 0.3})`);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.alpha * 0.55})`;
          }
          ctx.fill();
        } else {
          p.alpha = p.baseAlpha * pulse;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.baseR * pulse, 0, Math.PI * 2);
          if (isDark) {
            ctx.fillStyle = `hsla(${p.hue}, 40%, 60%, ${p.alpha * 0.45})`;
          } else {
            ctx.fillStyle = `hsla(${p.hue}, 50%, 55%, ${p.alpha * 0.3})`;
          }
          ctx.fill();
        }

        // Wind-like ambient drift
        p.vx += Math.sin(t * 0.3 + p.pulseOffset) * 0.005;
        p.vy += Math.cos(t * 0.4 + p.pulseOffset * 1.3) * 0.005;

        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 4) { p.vx = (p.vx / speed) * 4; p.vy = (p.vy / speed) * 4; }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -30) p.x = canvas.width + 30;
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.y < -30) p.y = canvas.height + 30;
        if (p.y > canvas.height + 30) p.y = -30;
      }

      // Connections — natural web across all particles, strongest near mouse
      for (let i = 0; i < particles.length; i += 2) {
        for (let j = i + 1; j < particles.length; j += 2) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 100) continue;
          const midX = (particles[i].x + particles[j].x) / 2;
          const midY = (particles[i].y + particles[j].y) / 2;
          const dm = isActive ? Math.sqrt((midX - mx) ** 2 + (midY - my) ** 2) : 999;
          const mouseFactor = isActive ? Math.max(0, 1 - dm / 250) : 0;
          const baseAlpha = 0.06;
          const alpha = (baseAlpha + mouseFactor * 0.12) * (1 - dist / 100);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = isDark
            ? `rgba(139,92,246,${alpha})`
            : `rgba(99,102,241,${alpha})`;
          ctx.lineWidth = 0.4 + mouseFactor * 0.4;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onMouse);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
}

function GradientOrbs({ isDark }: { isDark: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full blur-3xl"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)' : 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)' }}
      />
      <motion.div
        animate={{ x: [0, -30, 40, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full blur-3xl"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)' : 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)' }}
      />
      <motion.div
        animate={{ x: [0, 20, -30, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full blur-3xl"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(236,72,153,0.08), transparent)' : 'radial-gradient(circle, rgba(236,72,153,0.04), transparent)' }}
      />
    </div>
  );
}



function AnimatedGradientText() {
  return (
    <motion.h1
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.6 }}
      className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
    >
      Nova AI
    </motion.h1>
  );
}

function InputField({ label, type, value, onChange, placeholder, showToggle, onToggleShow, isDark, autoFocus }: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  showToggle?: boolean;
  onToggleShow?: () => void;
  isDark: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
        {label}
      </label>
      <div className="relative group">
        <input
          type={showToggle && type === 'password' ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 placeholder:text-slate-400 ${
            isDark
              ? `bg-white/[0.04] text-white placeholder:text-slate-500 ${focused ? 'border-indigo-500/60 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]' : 'border-slate-700/50 hover:border-slate-600/50'}`
              : `bg-white/70 text-slate-900 placeholder:text-slate-400 ${focused ? 'border-indigo-400 shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]' : 'border-slate-200 hover:border-slate-300'}`
          }`}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {type === 'password' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] rounded-full transition-all duration-500 ${
          focused
            ? 'w-3/4 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-100'
            : 'w-0 opacity-0'
        }`} />
      </div>
    </div>
  );
}

export function LoginScreen() {
  const theme = useChatStore((s) => s.theme);
  const computedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const login = useChatStore((s) => s.login);
  const register = useChatStore((s) => s.register);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(computedTheme);
  }, [computedTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'register' && password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = computedTheme === 'dark';

  return (
    <>
      <style>{keyframesStyle}</style>
      <div className={`fixed inset-0 overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white'}`}>
      <GradientOrbs isDark={isDark} />
      <Particles theme={computedTheme} />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {/* Decorative corner lines */}
        <div className={`absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 rounded-tl-xl ${isDark ? 'border-indigo-500/20' : 'border-indigo-300/30'}`} />
        <div className={`absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 rounded-tr-xl ${isDark ? 'border-violet-500/20' : 'border-violet-300/30'}`} />
        <div className={`absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 rounded-bl-xl ${isDark ? 'border-fuchsia-500/20' : 'border-fuchsia-300/30'}`} />
        <div className={`absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 rounded-br-xl ${isDark ? 'border-cyan-500/20' : 'border-cyan-300/30'}`} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            padding: '3px',
            background: isDark
              ? 'linear-gradient(to bottom, #6366f1, #8b5cf6, #ec4899, #06b6d4, #6366f1)'
              : 'linear-gradient(to bottom, #818cf8, #a78bfa, #f472b6, #22d3ee, #818cf8)',
            backgroundSize: '100% 200%',
            animation: 'bS 6s ease-in-out infinite',
            willChange: 'background-position',
          }}
        >
          {/* Card content */}
          <div className={`rounded-2xl p-8 ${
            isDark
              ? 'bg-slate-900/95 backdrop-blur-2xl'
              : 'bg-white/90 backdrop-blur-2xl'
          }`}>
            {/* Inner glow top */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent`} />

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
                  isDark
                    ? 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                    : 'bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 shadow-lg shadow-indigo-200/30'
                }`}
              >
                <Sparkles className={`h-7 w-7 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </motion.div>
              <AnimatedGradientText />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </motion.p>
            </motion.div>

            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <InputField
                label="Username"
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="Enter username"
                isDark={isDark}
                autoFocus
              />

              <InputField
                label="Password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Enter password"
                isDark={isDark}
                showToggle
                onToggleShow={() => setShowPw(!showPw)}
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className={`rounded-xl px-4 py-2.5 text-sm ${
                      isDark
                        ? 'bg-red-500/10 text-red-300 border border-red-500/15'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className={`relative w-full rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 overflow-hidden group ${
                  isDark
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20'
                } disabled:opacity-50`}
              >
                <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent`} />
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                {!loading && <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
              </motion.button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-6 text-center"
            >
              {mode === 'login' ? (
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); }}
                    className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors relative group"
                  >
                    Register
                    <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-indigo-400/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </button>
                </p>
              ) : (
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors relative group"
                  >
                    Sign In
                    <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-indigo-400/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </button>
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'admin' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, signup, adminLogin } = useStore();

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = login(email, password);
    setLoading(false);
    if (result.ok) {
      toast.success('Welcome back! 🎉');
    } else {
      toast.error(result.error || 'Invalid credentials');
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !phone || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = signup(name, email, phone, password);
    setLoading(false);
    if (result.ok) {
      toast.success('Account created successfully! 🎉');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  const handleAdminLogin = async () => {
    if (!username || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = adminLogin(username, password);
    setLoading(false);
    if (result.ok) {
      toast.success('Admin access granted');
    } else {
      toast.error(result.error || 'Invalid admin credentials');
    }
  };

  const handleForgot = () => {
    if (!email) { toast.error('Enter your email first'); return; }
    toast.success('Password reset link sent to your email');
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10 max-w-md mx-auto w-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 rounded-3xl gradient-gold mx-auto mb-4 flex items-center justify-center glow-gold-strong">
            <span className="text-black font-black text-3xl font-display">TN</span>
          </div>
          <h1 className="text-3xl font-display font-bold gradient-gold-text">TicketNova</h1>
          <p className="text-white/40 text-sm mt-1">Premium Lottery Platform</p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] rounded-2xl p-1">
          {(['login', 'signup', 'admin'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                mode === tab
                  ? 'gradient-gold text-black'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'admin' ? 'Admin' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {mode === 'login' && (
              <>
                <Input
                  label="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  icon={<span>📧</span>}
                />
                <Input
                  label="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  icon={<span>🔒</span>}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={`w-5 h-5 rounded-md border ${remember ? 'gradient-gold border-transparent' : 'border-white/20'} flex items-center justify-center transition-all`}
                      onClick={() => setRemember(!remember)}
                    >
                      {remember && <span className="text-black text-xs">✓</span>}
                    </div>
                    <span className="text-xs text-white/50">Remember me</span>
                  </label>
                  <button onClick={() => setMode('forgot')} className="text-xs text-gold/70 hover:text-gold">
                    Forgot password?
                  </button>
                </div>
                <Button fullWidth size="lg" onClick={handleLogin} loading={loading}>
                  Sign In
                </Button>
                <p className="text-center text-white/30 text-xs mt-4">
                  Don't have an account? <button onClick={() => setMode('signup')} className="text-gold hover:underline">Sign up</button>
                </p>
              </>
            )}

            {mode === 'signup' && (
              <>
                <Input
                  label="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  icon={<span>👤</span>}
                />
                <Input
                  label="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  icon={<span>📧</span>}
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+880XXXXXXXXXX"
                  type="tel"
                  icon={<span>📱</span>}
                />
                <Input
                  label="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  type="password"
                  icon={<span>🔒</span>}
                />
                <Button fullWidth size="lg" onClick={handleSignup} loading={loading}>
                  Create Account
                </Button>
                <p className="text-center text-white/30 text-xs mt-4">
                  Already have an account? <button onClick={() => setMode('login')} className="text-gold hover:underline">Sign in</button>
                </p>
              </>
            )}

            {mode === 'admin' && (
              <>
                <Input
                  label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  icon={<span>🛡️</span>}
                />
                <Input
                  label="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  icon={<span>🔒</span>}
                />
                <Button fullWidth size="lg" onClick={handleAdminLogin} loading={loading}>
                  Admin Login
                </Button>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <p className="text-white/50 text-sm">Enter your email to receive a password reset link.</p>
                <Input
                  label="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  icon={<span>📧</span>}
                />
                <Button fullWidth size="lg" onClick={handleForgot}>
                  Send Reset Link
                </Button>
                <button onClick={() => setMode('login')} className="w-full text-center text-sm text-white/40 hover:text-white/60">
                  Back to login
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

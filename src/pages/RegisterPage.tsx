import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, User, ArrowRight, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuthStore } from '../store/useStore';
import { useUiStore } from '../store/useStore';

export const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { pushToast } = useUiStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      login({
        id: user.uid,
        name: user.displayName || user.email || 'User',
        email: user.email || '',
        emailVerified: user.emailVerified,
        photoURL: user.photoURL || undefined,
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Google sign-in error', error);
      pushToast({
        type: 'error',
        message: t('auth.google_login_failed'),
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name || email });

      let verificationSendError: string | null = null;
      try {
        await sendEmailVerification(result.user, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });
      } catch (verifyErr: any) {
        verificationSendError = verifyErr?.message || 'Failed to send verification email.';
        console.error('Email verification send error', verifyErr);
      }

      navigate('/verify-email', {
        state: {
          email,
          verificationSent: !verificationSendError,
          verificationError: verificationSendError,
        },
      });
    } catch (err: any) {
      console.error('Registration error', err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-earth-50 dark:bg-zinc-950"
      onClick={() => navigate('/')}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-agri-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h2 className="text-3xl font-display font-bold">{t('auth.register')}</h2>
          <p className="text-earth-600 dark:text-zinc-400 mt-2">{t('auth.register_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-zinc-300 mb-2">{t('auth.name')}</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-earth-400" />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-zinc-900 border border-earth-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-agri-green outline-none transition-all"
                placeholder="Rajesh Kumar"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-zinc-300 mb-2">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-earth-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-zinc-900 border border-earth-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-agri-green outline-none transition-all"
                placeholder="farmer@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-zinc-300 mb-2">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-earth-400" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-zinc-900 border border-earth-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-agri-green outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-agri-green text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-agri-green/90 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('auth.register')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-earth-200 dark:bg-zinc-800" />
            <span className="text-xs uppercase tracking-wide text-earth-500 dark:text-zinc-500">
              {t('auth.register')}
            </span>
            <div className="h-px flex-1 bg-earth-200 dark:bg-zinc-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full border border-earth-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-earth-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-earth-400 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                <span>{t('auth.google_login')}</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-8 text-center text-sm">
          <span className="text-earth-500">{t('auth.has_account')}</span>{' '}
          <Link to="/login" className="text-agri-green font-bold hover:underline">{t('auth.login')}</Link>
        </div>
      </motion.div>
    </div>
  );
};

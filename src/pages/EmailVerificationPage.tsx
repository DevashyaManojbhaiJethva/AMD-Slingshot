import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, AlertCircle, MailCheck } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { Trans, useTranslation } from 'react-i18next';
import { auth } from '../firebase';

interface LocationState {
  email?: string;
  verificationSent?: boolean;
  verificationError?: string;
}

export const EmailVerificationPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const email = state?.email || 'your email address';
  const [isSending, setIsSending] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [statusType, setStatusType] = React.useState<'success' | 'error' | null>(null);

  React.useEffect(() => {
    if (state?.verificationSent) {
      setStatus(t('auth.verify_sent_success'));
      setStatusType('success');
      return;
    }
    if (state?.verificationError) {
      setStatus(state.verificationError);
      setStatusType('error');
    }
  }, [state?.verificationError, state?.verificationSent, t]);

  const handleResendVerification = async () => {
    setStatus(null);
    setStatusType(null);

    if (!auth.currentUser) {
      setStatus(t('auth.verify_resend_login'));
      setStatusType('error');
      return;
    }

    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setStatus(t('auth.verify_resend_success'));
      setStatusType('success');
    } catch (err: any) {
      setStatus(err?.message || t('auth.verify_resend_failed'));
      setStatusType('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-earth-50 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 rounded-3xl shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-agri-green rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MailCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-4">{t('auth.verify_title')}</h2>
        <p className="text-earth-600 dark:text-zinc-400 mb-8">
          <Trans
            i18nKey="auth.verify_message"
            values={{ email }}
            components={[<span className="font-semibold" />]}
          />
        </p>

        {status && (
          <div
            className={`mb-5 rounded-xl border p-3 text-sm flex items-start gap-2 ${
              statusType === 'success'
                ? 'border-agri-green/30 bg-agri-green/10 text-agri-green'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {statusType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5" />
            )}
            <span>{status}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleResendVerification}
          disabled={isSending}
          className="w-full mb-3 border border-earth-200 dark:border-zinc-800 text-earth-700 dark:text-zinc-200 py-3 rounded-xl font-semibold hover:bg-black/5 transition-all disabled:opacity-60"
        >
          {isSending ? t('auth.verify_sending') : t('auth.verify_resend')}
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full bg-agri-green text-white py-3 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-agri-green/90 transition-all"
        >
          <span>{t('auth.verify_login')}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
};


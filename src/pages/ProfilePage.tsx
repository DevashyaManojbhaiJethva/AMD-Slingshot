import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  updateProfile,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reload,
} from 'firebase/auth';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, Mail, User } from 'lucide-react';
import { auth } from '../firebase';
import { useAuthStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';

export const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const currentUser = auth.currentUser;

  const [name, setName] = React.useState(user?.name || currentUser?.displayName || '');
  const [email, setEmail] = React.useState(user?.email || currentUser?.email || '');
  const [newEmail, setNewEmail] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isSendingVerify, setIsSendingVerify] = React.useState(false);
  const [isChangingEmail, setIsChangingEmail] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState(user?.photoURL || currentUser?.photoURL || '');
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setName(currentUser.displayName || user?.name || '');
    setEmail(currentUser.email || user?.email || '');
    setPhotoPreview(currentUser.photoURL || user?.photoURL || '');
  }, [currentUser, navigate, user?.email, user?.name, user?.photoURL]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSaveProfile = async () => {
    clearMessages();
    if (!auth.currentUser) {
      setError(t('profile.err_user_not_found'));
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoPreview || null,
      });
      updateUser({
        name,
        photoURL: photoPreview || undefined,
      });
      setSuccess(t('profile.success_profile_updated'));
    } catch (err: any) {
      setError(err?.message || t('profile.err_profile_update_failed'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendVerification = async () => {
    clearMessages();
    if (!auth.currentUser) {
      setError(t('profile.err_user_not_found'));
      return;
    }

    setIsSendingVerify(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setSuccess(t('profile.success_verification_sent'));
    } catch (err: any) {
      setError(err?.message || t('profile.err_verification_failed'));
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleChangeEmail = async () => {
    clearMessages();
    if (!auth.currentUser || !auth.currentUser.email) {
      setError(t('profile.err_user_email_not_found'));
      return;
    }
    if (!newEmail) {
      setError(t('profile.err_new_email_required'));
      return;
    }
    if (!currentPassword) {
      setError(t('profile.err_password_required'));
      return;
    }

    setIsChangingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
      setSuccess(t('profile.success_change_email_sent'));
      setNewEmail('');
      setCurrentPassword('');
    } catch (err: any) {
      setError(err?.message || t('profile.err_change_email_failed'));
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handlePasswordReset = async () => {
    clearMessages();
    const emailToUse = auth.currentUser?.email || email;
    if (!emailToUse) {
      setError(t('profile.err_email_not_found'));
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, emailToUse);
      setSuccess(t('profile.success_reset_sent'));
    } catch (err: any) {
      setError(err?.message || t('profile.err_reset_failed'));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) {
      return;
    }
    await reload(auth.currentUser);
    updateUser({
      email: auth.currentUser.email || email,
      emailVerified: auth.currentUser.emailVerified,
      name: auth.currentUser.displayName || name,
      photoURL: auth.currentUser.photoURL || photoPreview || undefined,
    });
    setEmail(auth.currentUser.email || email);
    setPhotoPreview(auth.currentUser.photoURL || photoPreview || '');
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('profile.err_invalid_image'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(t('profile.err_image_size'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPhotoPreview(result);
      setSuccess(t('profile.success_photo_selected'));
    };
    reader.onerror = () => {
      setError(t('profile.err_photo_read'));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const emailVerified = auth.currentUser?.emailVerified || user?.emailVerified;
  const profilePhoto = photoPreview || auth.currentUser?.photoURL || user?.photoURL;
  const displayName = name || email || t('profile.user_fallback');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-[5cm] w-full">
      <div className="max-w-3xl mx-auto mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-earth-500 hover:text-agri-green transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t('profile.back_dashboard')}</span>
        </button>
        <h1 className="text-3xl font-display font-bold">{t('profile.title')}</h1>
        <p className="text-earth-600 dark:text-zinc-400 mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="max-w-3xl mx-auto">
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-agri-green/30 bg-agri-green/10 p-4 text-sm text-agri-green flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="glass rounded-3xl p-8 sm:p-10 space-y-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-agri-green/30 bg-earth-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shadow-lg">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl sm:text-4xl font-bold text-agri-green">{initials || 'U'}</span>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-earth-200 dark:border-zinc-800 hover:bg-black/5 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.change_photo')}</span>
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold">{displayName}</h2>
            <p className="text-earth-600 dark:text-zinc-400">{email}</p>
          </div>
          <div className="text-sm">
            <span className="font-medium">{t('profile.email_verification_label')}</span>{' '}
            <span className={emailVerified ? 'text-agri-green' : 'text-amber-400'}>
              {emailVerified ? t('profile.verified') : t('profile.not_verified')}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-xl font-bold">{t('profile.section_info')}</h3>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">{t('profile.name')}</span>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-earth-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">{t('profile.email')}</span>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" />
              <input
                type="email"
                value={email}
                readOnly
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-earth-200 dark:border-zinc-800 bg-white/20 dark:bg-zinc-900/70 outline-none cursor-not-allowed"
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-agri-green text-white px-4 py-2 rounded-xl font-medium hover:bg-agri-green/90 disabled:opacity-60"
            >
              {isSavingProfile ? t('profile.saving') : t('profile.save_profile')}
            </button>

            <button
              type="button"
              onClick={handleRefreshVerification}
              className="px-4 py-2 rounded-xl border border-earth-200 dark:border-zinc-800 hover:bg-black/5"
            >
              {t('profile.refresh_status')}
            </button>
          </div>

          {!emailVerified && (
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={isSendingVerify}
              className="px-4 py-2 rounded-xl border border-earth-200 dark:border-zinc-800 hover:bg-black/5 disabled:opacity-60"
            >
              {isSendingVerify ? t('profile.sending') : t('profile.send_verification')}
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-earth-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-xl font-bold">{t('profile.change_email_title')}</h2>
            <p className="text-sm text-earth-600 dark:text-zinc-400">
              {t('profile.change_email_desc')}
            </p>

            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder={t('profile.new_email_placeholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-earth-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900 outline-none"
            />

            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder={t('profile.current_password_placeholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-earth-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900 outline-none"
            />

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={isChangingEmail}
              className="bg-agri-green text-white px-4 py-2 rounded-xl font-medium hover:bg-agri-green/90 disabled:opacity-60"
            >
              {isChangingEmail ? t('profile.sending_verification') : t('profile.change_email')}
            </button>
          </div>

          <div className="rounded-2xl border border-earth-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-xl font-bold">{t('profile.change_password_title')}</h2>
            <p className="text-sm text-earth-600 dark:text-zinc-400">
              {t('profile.change_password_desc')}
            </p>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isSendingReset}
              className="bg-agri-green text-white px-4 py-2 rounded-xl font-medium hover:bg-agri-green/90 disabled:opacity-60"
            >
              {isSendingReset ? t('profile.sending_reset') : t('profile.send_reset')}
            </button>
          </div>

          <div className="rounded-2xl border border-earth-200 dark:border-zinc-800 p-5 text-sm text-earth-600 dark:text-zinc-400">
            <p>
              {t('profile.security_note')}
            </p>
            <Link to="/dashboard" className="inline-block mt-4 text-agri-green font-semibold hover:underline">
              {t('profile.go_back_dashboard')}
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

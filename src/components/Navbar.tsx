import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore, useAuthStore } from '../store/useStore';
import { Sun, Moon, Languages, LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';

export const Navbar = () => {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const { isAuthenticated, logout, user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const accountMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isAccountOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isAccountOpen]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const toggleLanguage = () => setLanguage(language === 'en' ? 'hi' : 'en');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="w-full px-[2cm]">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center">
            <BrandLogo compact className="scale-[0.98] hover:scale-100 transition-transform" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 hover:bg-black/5 rounded-xl transition-colors flex items-center gap-2"
              aria-label={language === 'en' ? t('nav.switch_to_hi') : t('nav.switch_to_en')}
              title={language === 'en' ? t('nav.switch_to_hi') : t('nav.switch_to_en')}
            >
              <Languages className="w-5 h-5" />
              <span className="text-sm font-medium">
                {language === 'en' ? t('nav.switch_to_hi') : t('nav.switch_to_en')}
              </span>
            </button>
            <button onClick={toggleTheme} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setIsAccountOpen((v) => !v)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-agri-green/20"
                    aria-label="Account menu"
                  >
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-agri-green">
                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {isAccountOpen && (
                    <div className="absolute right-0 mt-2 glass rounded-xl shadow-xl p-2 min-w-40">
                      <div className="px-3 py-2 text-sm font-medium truncate max-w-[12rem]">
                        {user?.name || user?.email}
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setIsAccountOpen(false)}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname === '/profile' ? 'bg-agri-green text-white' : 'hover:bg-agri-green hover:text-white'}`}
                      >
                        {t('nav.profile')}
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsAccountOpen(false)}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname === '/dashboard' ? 'bg-agri-green text-white' : 'hover:bg-agri-green hover:text-white'}`}
                      >
                        {t('nav.dashboard')}
                      </Link>
                      <Link
                        to="/workplan"
                        onClick={() => setIsAccountOpen(false)}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname === '/workplan' ? 'bg-agri-green text-white' : 'hover:bg-agri-green hover:text-white'}`}
                      >
                        {t('nav.workplan')}
                      </Link>
                      <Link
                        to="/insights"
                        onClick={() => setIsAccountOpen(false)}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname === '/insights' ? 'bg-agri-green text-white' : 'hover:bg-agri-green hover:text-white'}`}
                      >
                        {t('nav.insights')}
                      </Link>
                      <button
                        onClick={() => {
                          setIsAccountOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-agri-green hover:text-white rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium">{t('nav.login')}</Link>
                <Link to="/login" className="bg-agri-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-agri-green/90 transition-all">
                  {t('nav.get_started')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden glass border-t border-white/10 px-4 pt-3 pb-6 space-y-4"
          >
            <div className="flex justify-around py-4 border-b border-white/10">
              <button onClick={toggleLanguage} className="flex items-center space-x-2 min-h-11 px-2">
                <Languages className="w-5 h-5" />
                <span>{language === 'en' ? t('nav.switch_to_hi') : t('nav.switch_to_en')}</span>
              </button>
              <button onClick={toggleTheme} className="flex items-center space-x-2 min-h-11 px-2">
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-3 text-base font-medium">{t('nav.dashboard')}</Link>
                <Link to="/workplan" onClick={() => setIsMenuOpen(false)} className="block py-3 text-base font-medium">{t('nav.workplan')}</Link>
                <Link to="/insights" onClick={() => setIsMenuOpen(false)} className="block py-3 text-base font-medium">{t('nav.insights')}</Link>
                <button onClick={handleLogout} className="w-full text-left py-3 text-base font-medium text-red-500">{t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block py-3 text-base font-medium">{t('nav.login')}</Link>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full bg-agri-green text-white text-center py-3 rounded-xl font-medium">{t('nav.get_started')}</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

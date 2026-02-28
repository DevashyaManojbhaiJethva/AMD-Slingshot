import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, ShieldCheck, BarChart3, Sprout, Droplets, Calendar, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { BrandLogo } from '../components/BrandLogo';

export const LandingPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const onImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/1200x800?text=Image+unavailable';
  };

  const features = [
    { icon: <ShieldCheck className="w-6 h-6" />, title: t('features.classification'), desc: t('landing.feature_desc_classification') },
    { icon: <BarChart3 className="w-6 h-6" />, title: t('features.health'), desc: t('landing.feature_desc_health') },
    { icon: <Sprout className="w-6 h-6" />, title: t('features.suitability'), desc: t('landing.feature_desc_suitability') },
    { icon: <Droplets className="w-6 h-6" />, title: t('features.advisory'), desc: t('landing.feature_desc_advisory') },
    { icon: <Calendar className="w-6 h-6" />, title: t('features.workplan'), desc: t('landing.feature_desc_workplan') },
    { icon: <Zap className="w-6 h-6" />, title: t('features.monitoring'), desc: t('landing.feature_desc_monitoring') },
  ];

  const realisticImageCards = [
    {
      src: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=75&w=1200',
      title: t('features.classification'),
    },
    {
      src: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=75&w=1200',
      title: t('features.workplan'),
    },
    {
      src: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&q=75&w=1200',
      title: t('landing.powered_by'),
    },
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=75&w=1800"
            className="w-full h-full object-cover opacity-80 dark:opacity-45"
            alt="Green farm landscape"
            loading="eager"
            referrerPolicy="no-referrer"
            onError={onImgError}
            initial={{ scale: 1.02 }}
            animate={{ scale: 1.06, x: [0, 10, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-agri-green/10 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-agri-leaf/10 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -15, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-white/50 dark:from-zinc-950/25 dark:to-zinc-950/55" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-display font-bold text-agri-green dark:text-agri-leaf leading-tight"
            >
              {t('hero.title')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-xl font-medium text-earth-800 dark:text-earth-300 drop-shadow-sm"
            >
              {t('hero.subtitle')}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 flex justify-center"
            >
              <Link to={isAuthenticated ? "/dashboard" : "/login"} className="bg-agri-green text-white px-8 py-4 rounded-xl text-lg font-semibold flex items-center justify-center space-x-2 hover:bg-agri-green/90 transition-all shadow-lg shadow-agri-green/20">
                <span>{t('hero.cta_start')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white/40 dark:bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {realisticImageCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="glass rounded-2xl p-4 shadow-md"
              >
                <img
                  src={card.src}
                  alt={card.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={onImgError}
                  className="w-full h-40 object-cover rounded-xl"
                />
                <p className="mt-3 text-sm font-semibold text-earth-700 dark:text-zinc-300">{card.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white/50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold">{t('landing.features_title')}</h2>
            <p className="mt-4 text-earth-600 dark:text-zinc-400">{t('landing.features_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                className="glass p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
              >
                <motion.div
                  className="w-12 h-12 bg-agri-green/10 rounded-xl flex items-center justify-center text-agri-green mb-6"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: idx * 0.2 }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-earth-600 dark:text-zinc-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      

      {/* AMD Section */}
      <section className="py-24 bg-agri-green text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                <span>{t('landing.powered_by')}</span>
              </div>
              <h2 className="text-4xl font-display font-bold mb-6">{t('landing.amd_title')}</h2>
              <p className="text-lg text-white/80 mb-8">
                {t('landing.amd_desc')}
              </p>
              <ul className="space-y-4">
                {[t('landing.amd_bullet_1'), t('landing.amd_bullet_2'), t('landing.amd_bullet_3')].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-agri-leaf" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <motion.img
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=75&w=1400"
                alt="High-performance compute hardware"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={onImgError}
                className="w-full h-full max-h-[28rem] object-cover rounded-3xl shadow-2xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <BrandLogo compact />
          </div>
          <p className="text-earth-500 dark:text-zinc-500">{t('landing.footer')}</p>
        </div>
      </footer>
    </div>
  );
};

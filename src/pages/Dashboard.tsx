import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  History, Calendar, ChevronRight, Sprout, 
  TrendingUp, Droplets, AlertCircle, Plus
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../store/useStore';
import { SoilUpload } from '../components/SoilUpload';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, getFirebaseAuthHeader } from '../api/client';

export const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { history, setHistory } = useAppStore();
  const [showUpload, setShowUpload] = React.useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) {
        return;
      }

      setIsHistoryLoading(true);
      setHistoryError(null);

      try {
        const authHeader = await getFirebaseAuthHeader(user.id);
        const response = await apiClient.get(`/history/${user.id}`, {
          headers: authHeader,
        });
        const historyItems = Array.isArray(response.data?.items) ? response.data.items : [];
        setHistory(historyItems);
      } catch (error) {
        console.error(error);
        setHistoryError(t('dashboard_ui.history_load_failed'));
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadHistory();
  }, [setHistory, t, user?.id]);

  const phase = t('dashboard_ui.phase_growth');
  const growthSentence = t('dashboard_ui.growth_phase', { phase });
  const [growthBefore, growthAfter = ''] = growthSentence.split(phase);
  const formatNumber = (value: number) => value.toFixed(2);
  const locale = i18n.language === 'hi' ? 'hi-IN' : 'en-US';

  const getLocalizedSoilType = (soilType: string) => {
    if (!soilType?.trim()) {
      return t('dashboard_ui.unknown_soil');
    }

    const normalized = soilType
      .trim()
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
    const mapping: Record<string, string> = {
      'laterite soil': t('dashboard_ui.soil_types.laterite'),
      laterite: t('dashboard_ui.soil_types.laterite'),
      'alluvial soil': t('dashboard_ui.soil_types.alluvial'),
      alluvial: t('dashboard_ui.soil_types.alluvial'),
      'peat soil': t('dashboard_ui.soil_types.peat'),
      peat: t('dashboard_ui.soil_types.peat'),
      'black soil': t('dashboard_ui.soil_types.black'),
      black: t('dashboard_ui.soil_types.black'),
      'red soil': t('dashboard_ui.soil_types.red'),
      red: t('dashboard_ui.soil_types.red'),
      'clay soil': t('dashboard_ui.soil_types.clay'),
      clay: t('dashboard_ui.soil_types.clay'),
      'sandy soil': t('dashboard_ui.soil_types.sandy'),
      sandy: t('dashboard_ui.soil_types.sandy'),
      'loamy soil': t('dashboard_ui.soil_types.loamy'),
      loamy: t('dashboard_ui.soil_types.loamy'),
      'peaty soil': t('dashboard_ui.soil_types.peaty'),
      peaty: t('dashboard_ui.soil_types.peaty'),
      'clayey sand': t('dashboard_ui.soil_types.clayey_sand'),
      'clayey sandy': t('dashboard_ui.soil_types.clayey_sand'),
    };

    if (mapping[normalized]) {
      return mapping[normalized];
    }

    if (normalized.endsWith(' soil')) {
      const baseType = normalized.replace(/\s+soil$/, '');
      return mapping[baseType] || soilType;
    }

    return soilType;
  };

  return (
    <div className="pt-22 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">
            {t('dashboard_ui.greeting', { name: user?.name || '' })}
          </h1>
          <p className="text-earth-600 dark:text-zinc-400 mt-2">
            {growthBefore}
            <span className="text-agri-green font-bold">{phase}</span>
            {growthAfter}
          </p>
        </div>
        {!showUpload && (
          <button 
            onClick={() => setShowUpload(true)}
            className="bg-agri-green text-white w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-agri-green/90 transition-all shadow-xl shadow-agri-green/20"
          >
            <Plus className="w-6 h-6" />
            <span>{t('dashboard_ui.new_soil_analysis')}</span>
          </button>
        )}
      </header>

      {showUpload ? (
        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold">{t('dashboard_ui.new_analysis')}</h2>
            <button 
              onClick={() => setShowUpload(false)}
              className="text-earth-500 hover:text-red-500 font-medium"
            >
              {t('dashboard_ui.cancel')}
            </button>
          </div>
          <SoilUpload />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-10">
          {/* Main Stats */}
          <div className="lg:col-span-2 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: t('dashboard_ui.total_analyses'), value: history.length, icon: <History className="text-agri-green" /> },
                { label: t('dashboard_ui.avg_health'), value: history.length > 0 ? `${formatNumber(history.reduce((a, b) => a + b.healthScore, 0) / history.length)}%` : 'N/A', icon: <TrendingUp className="text-blue-500" /> },
                {
                  label: t('dashboard_ui.granule_count'),
                  value: typeof history[0]?.granuleCount === 'number' ? history[0].granuleCount : 'N/A',
                  icon: <Droplets className="text-cyan-500" />,
                },
              ].map((stat, i) => (
                <div key={i} className="glass h-full p-5 sm:p-6 rounded-3xl shadow-md hover:shadow-lg transition-shadow flex flex-col">
                  <div className="w-10 h-10 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center mb-4">
                    {stat.icon}
                  </div>
                  <div className="text-[11px] font-bold text-earth-500 uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className="text-2xl sm:text-3xl font-bold leading-tight mt-auto">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Recent History */}
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-display font-bold">{t('dashboard_ui.recent_reports')}</h2>
                <Link to="/insights" className="text-agri-green font-bold text-sm hover:underline">{t('dashboard_ui.view_all_insights')}</Link>
              </div>
              
              {isHistoryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="glass p-5 rounded-2xl animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-earth-200 dark:bg-zinc-800" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 rounded bg-earth-200 dark:bg-zinc-800 w-40" />
                          <div className="h-3 rounded bg-earth-200 dark:bg-zinc-800 w-56" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="glass p-12 rounded-3xl text-center shadow-md">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-agri-green/10 text-agri-green flex items-center justify-center mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <p className="text-earth-500 font-medium">{t('dashboard_ui.no_reports')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((report, idx) => (
                    <motion.div
                      key={report.jobId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => navigate(`/result/${report.jobId}`)}
                      className="glass p-4 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/90 dark:hover:bg-zinc-900 transition-all group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-agri-green/10 rounded-xl flex items-center justify-center text-agri-green shrink-0">
                          <Sprout className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-base sm:text-lg truncate">{getLocalizedSoilType(report.type)}</div>
                          <div className="text-[11px] sm:text-xs text-earth-500 flex items-center space-x-2">
                            <Calendar className="w-3 h-3" />
                            <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString(locale) : '—'}</span>
                            <span>•</span>
                            <span className="text-agri-green font-bold">{t('dashboard_ui.health_prefix')}: {formatNumber(report.healthScore)}%</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-earth-300 group-hover:text-agri-green transition-colors shrink-0" />
                    </motion.div>
                  ))}
                </div>
              )}
              {historyError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-3">{historyError}</p>
              )}
            </div>
          </div>

          {/* Sidebar / Quick Tips */}
          <div className="space-y-8">
            <div className="glass p-8 rounded-3xl bg-agri-green text-white relative overflow-hidden shadow-lg">
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <h3 className="text-xl font-bold mb-4">{t('dashboard_ui.weekly_reminder')}</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                {t('dashboard_ui.weekly_reminder_body')}
              </p>
              <button 
                onClick={() => setShowUpload(true)}
                className="w-full bg-white text-agri-green py-3 rounded-xl font-bold hover:bg-earth-100 transition-all"
              >
                {t('dashboard_ui.start_reanalysis')}
              </button>
            </div>

            <div className="glass p-8 rounded-3xl shadow-md">
              <h3 className="text-xl font-bold mb-6">{t('dashboard_ui.soil_health_guide')}</h3>
              <div className="space-y-6">
                {[
                  { title: t('dashboard_ui.ph_balance'), desc: t('dashboard_ui.ph_balance_desc'), color: 'text-orange-500' },
                  { title: t('dashboard_ui.nitrogen'), desc: t('dashboard_ui.nitrogen_desc'), color: 'text-agri-green' },
                  { title: t('dashboard_ui.moisture_label'), desc: t('dashboard_ui.moisture_desc'), color: 'text-blue-500' },
                ].map((item, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${item.color.replace('text', 'bg')}`} />
                    <div>
                      <div className={`text-sm font-bold ${item.color}`}>{item.title}</div>
                      <p className="text-xs text-earth-600 dark:text-zinc-400 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

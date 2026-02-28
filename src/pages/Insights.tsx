import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Activity, Sprout, Droplets, ArrowLeft } from 'lucide-react';
import { useAppStore, useAuthStore } from '../store/useStore';
import { apiClient, getFirebaseAuthHeader } from '../api/client';
import { Link } from 'react-router-dom';

const COLORS = ['#2d5a27', '#4c9a2a', '#7b5e43', '#e0ccbc'];

export const Insights = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { history, setHistory, theme } = useAppStore();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) {
        return;
      }

      setIsLoading(true);
      try {
        const authHeader = await getFirebaseAuthHeader(user.id);
        const response = await apiClient.get(`/history/${user.id}`, {
          headers: authHeader,
        });
        const historyItems = Array.isArray(response.data?.items) ? response.data.items : [];
        setHistory(historyItems);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (history.length === 0) {
      loadHistory();
    }
  }, [history.length, setHistory, user?.id]);

  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }, [history]);

  const insightSeries = React.useMemo(() => {
    return sortedHistory.slice(-8).map((item, index) => {
      const label = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' })
        : `A${index + 1}`;
      return {
        week: label,
        health: Number(item.healthScore ?? 0),
        fertility: Number(item.fertility ?? 0),
        moisture: Number(item.moisture ?? 0),
      };
    });
  }, [i18n.language, sortedHistory]);

  const seriesData = insightSeries.length > 0
    ? insightSeries
    : [{ week: 'A1', health: 0, fertility: 0, moisture: 0 }];

  const averages = React.useMemo(() => {
    const count = insightSeries.length || 1;
    const sum = insightSeries.reduce(
      (acc, item) => ({
        health: acc.health + item.health,
        fertility: acc.fertility + item.fertility,
        moisture: acc.moisture + item.moisture,
      }),
      { health: 0, fertility: 0, moisture: 0 }
    );
    return {
      health: sum.health / count,
      fertility: sum.fertility / count,
      moisture: sum.moisture / count,
    };
  }, [insightSeries]);

  const healthTrend = React.useMemo(() => {
    if (insightSeries.length < 2) {
      return 0;
    }
    const first = insightSeries[0].health;
    const last = insightSeries[insightSeries.length - 1].health;
    return last - first;
  }, [insightSeries]);

  const allocationData = React.useMemo(() => {
    if (sortedHistory.length === 0) {
      return [
        { name: t('insights.alloc_urea'), value: 1 },
        { name: t('insights.alloc_dap'), value: 1 },
        { name: t('insights.alloc_potash'), value: 1 },
        { name: t('insights.alloc_organic'), value: 1 },
      ];
    }

    const totals = sortedHistory.reduce(
      (acc, item) => {
        acc.urea += Number(item.fertilizerPlan?.ureaKg ?? 0);
        acc.dap += Number(item.npk?.p ?? 0);
        acc.potash += Number(item.npk?.k ?? 0);
        acc.organic += Math.max(5, 100 - Number(item.fertility ?? 0));
        return acc;
      },
      { urea: 0, dap: 0, potash: 0, organic: 0 }
    );

    return [
      { name: t('insights.alloc_urea'), value: Math.max(1, totals.urea) },
      { name: t('insights.alloc_dap'), value: Math.max(1, totals.dap) },
      { name: t('insights.alloc_potash'), value: Math.max(1, totals.potash) },
      { name: t('insights.alloc_organic'), value: Math.max(1, totals.organic) },
    ];
  }, [sortedHistory, t]);

  const allocationTotal = allocationData.reduce((acc, item) => acc + item.value, 0);
  const chartGridStroke = theme === 'dark' ? '#3f3f46' : '#e5e7eb';
  const chartAxisStroke = theme === 'dark' ? '#a1a1aa' : '#6b7280';
  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.12)',
    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
    color: theme === 'dark' ? '#e4e4e7' : '#18181b',
  };

  const topCrop = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of sortedHistory) {
      const name = item.crops?.[0]?.name;
      if (!name) {
        continue;
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    let best = 'N/A';
    let bestCount = 0;
    for (const [name, count] of counts.entries()) {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    }
    return best;
  }, [sortedHistory]);

  const costReduction = React.useMemo(() => {
    if (sortedHistory.length < 2) {
      return 0;
    }
    const midpoint = Math.floor(sortedHistory.length / 2);
    const firstHalf = sortedHistory.slice(0, midpoint);
    const secondHalf = sortedHistory.slice(midpoint);

    const firstAvg = firstHalf.reduce((acc, item) => acc + Number(item.fertilizerPlan?.ureaKg ?? 0), 0) / Math.max(1, firstHalf.length);
    const secondAvg = secondHalf.reduce((acc, item) => acc + Number(item.fertilizerPlan?.ureaKg ?? 0), 0) / Math.max(1, secondHalf.length);

    if (firstAvg <= 0) {
      return 0;
    }
    return ((firstAvg - secondAvg) / firstAvg) * 100;
  }, [sortedHistory]);

  const aiSummaryText = React.useMemo(() => {
    return t('insights.ai_summary_body', {
      trend: healthTrend >= 0 ? t('insights.trend_improving') : t('insights.trend_declining'),
      healthPoints: Math.abs(healthTrend).toFixed(1),
      avgFertility: averages.fertility.toFixed(1),
      avgMoisture: averages.moisture.toFixed(1),
      topCrop,
      ureaDelta: `${Math.abs(costReduction).toFixed(1)}%`,
      ureaDirection: costReduction >= 0 ? t('insights.urea_lower') : t('insights.urea_higher'),
    });
  }, [averages.fertility, averages.moisture, costReduction, healthTrend, t, topCrop]);

  return (
    <div className="pt-20 sm:pt-22 pb-12 px-4 sm:px-6 lg:px-[5cm] w-full">
      <header className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-earth-500 hover:text-agri-green transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t('insights.back_dashboard')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">{t('insights.title')}</h1>
        <p className="text-earth-600 dark:text-zinc-400">{t('insights.subtitle')}</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {[1, 2].map((item) => (
            <div key={item} className="glass p-6 rounded-3xl animate-pulse">
              <div className="h-5 w-44 rounded bg-earth-200 dark:bg-zinc-800 mb-6" />
              <div className="h-[300px] rounded-2xl bg-earth-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-agri-green/10 text-agri-green flex items-center justify-center mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-1">{t('insights.title')}</h3>
          <p className="text-earth-500">{t('dashboard_ui.no_reports')}</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">{t('insights.soil_health_trend')}</h3>
            <Activity className="text-agri-green w-5 h-5" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData}>
                <defs>
                  <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d5a27" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2d5a27" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                <XAxis dataKey="week" stroke={chartAxisStroke} tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis stroke={chartAxisStroke} tick={{ fontSize: 12 }} width={42} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="health" stroke="#2d5a27" fillOpacity={1} fill="url(#colorHealth)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">{t('insights.nutrient_stability')}</h3>
            <TrendingUp className="text-blue-500 w-5 h-5" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                <XAxis dataKey="week" stroke={chartAxisStroke} tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis stroke={chartAxisStroke} tick={{ fontSize: 12 }} width={42} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="fertility" stroke="#4c9a2a" strokeWidth={3} dot={{ r: 6 }} />
                <Line type="monotone" dataKey="moisture" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-5 text-xs sm:text-sm text-earth-600 dark:text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4c9a2a]" />
              <span>{t('dashboard.fertility')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
              <span>{t('dashboard.moisture')}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 glass p-6 rounded-3xl">
          <h3 className="text-xl font-bold mb-6">{t('insights.resource_allocation')}</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {allocationData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-bold">{Math.round((item.value / allocationTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass p-8 rounded-3xl bg-agri-green text-white">
          <h3 className="text-2xl font-display font-bold mb-4">{t('insights.ai_summary')}</h3>
          <p className="text-white/80 leading-relaxed mb-6">
            {aiSummaryText}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl">
              <div className="text-3xl font-bold">{Math.round(averages.health)}/100</div>
              <div className="text-sm opacity-70 uppercase tracking-wider">{t('insights.yield_potential')}</div>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl">
              <div className="text-3xl font-bold">{costReduction >= 0 ? '-' : '+'}{Math.abs(costReduction).toFixed(1)}%</div>
              <div className="text-sm opacity-70 uppercase tracking-wider">{t('insights.cost_reduction')}</div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

import React from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Circle, Clock, Info, ChevronRight, CloudSun, Thermometer, Droplets, Sprout, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useStore';
import { Link } from 'react-router-dom';

type TaskItem = {
  id: number;
  day: string;
  task: string;
  completed: boolean;
  type: 'fertilizer' | 'monitoring' | 'irrigation' | 'field_care' | 'soil_health' | 'general' | 'analysis';
};

const fallbackTasks: TaskItem[] = [
  { id: 1, day: 'Day 1', task: 'Apply first dose of Urea (25kg/acre)', completed: true, type: 'fertilizer' },
  { id: 2, day: 'Day 2', task: 'Check soil moisture levels', completed: false, type: 'monitoring' },
  { id: 3, day: 'Day 3', task: 'Irrigation cycle (2 hours)', completed: false, type: 'irrigation' },
  { id: 4, day: 'Day 4', task: 'Inspect leaves for pest signs', completed: false, type: 'field_care' },
  { id: 5, day: 'Day 5', task: 'Apply organic mulch', completed: false, type: 'soil_health' },
  { id: 6, day: 'Day 6', task: 'Rest period', completed: false, type: 'general' },
  { id: 7, day: 'Day 7', task: 'Weekly soil re-analysis', completed: false, type: 'analysis' },
];

const inferTaskType = (task: string): TaskItem['type'] => {
  const lower = task.toLowerCase();
  if (lower.includes('irrigation') || lower.includes('water')) {
    return 'irrigation';
  }
  if (lower.includes('fertilizer') || lower.includes('urea') || lower.includes('npk') || lower.includes('nutrient')) {
    return 'fertilizer';
  }
  if (lower.includes('ph') || lower.includes('moisture') || lower.includes('monitor') || lower.includes('check')) {
    return 'monitoring';
  }
  if (lower.includes('weed') || lower.includes('pest')) {
    return 'field_care';
  }
  if (lower.includes('compost')) {
    return 'soil_health';
  }
  if (lower.includes('analysis') || lower.includes('re-analysis')) {
    return 'analysis';
  }
  return 'general';
};

export const WorkPlan = () => {
  const { t, i18n } = useTranslation();
  const { soilResult, history } = useAppStore();

  const latestResult = React.useMemo(() => {
    if (soilResult) {
      return soilResult;
    }
    if (history.length === 0) {
      return null;
    }
    return [...history].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })[0] ?? null;
  }, [history, soilResult]);

  const [tasks, setTasks] = React.useState<TaskItem[]>([]);

  React.useEffect(() => {
    if (!latestResult) {
      setTasks([]);
      return;
    }

    const livePlan = latestResult?.workPlan;
    if (!livePlan || livePlan.length === 0) {
      setTasks(fallbackTasks);
      return;
    }

    const mapped: TaskItem[] = livePlan.map((taskText, index) => ({
      id: index + 1,
      day: `Day ${index + 1}`,
      task: taskText,
      completed: false,
      type: inferTaskType(taskText),
    }));
    setTasks(mapped);
  }, [latestResult?.jobId, latestResult?.workPlan]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const isHindi = i18n.language?.startsWith('hi');

  const sanitizeTaskText = React.useCallback((taskText: string) => {
    return taskText.replace(/^\s*Day\s*\d+\s*[:.-]\s*/i, '').trim();
  }, []);

  const toHindiTaskText = React.useCallback((taskText: string) => {
    const clean = sanitizeTaskText(taskText);
    const exactMap: Record<string, string> = {
      'Apply basal fertilizer and clear weeds.': 'बेसल उर्वरक डालें और खरपतवार हटाएं।',
      'Light irrigation and soil moisture check.': 'हल्की सिंचाई करें और मिट्टी की नमी जांचें।',
      'Foliar nutrient spray in early morning.': 'सुबह जल्दी पत्तियों पर पोषक स्प्रे करें।',
      'Monitor crop leaves for nutrient stress.': 'पोषक तनाव के लिए फसल की पत्तियों की निगरानी करें।',
      'Add compost near root zone.': 'जड़ क्षेत्र के पास कंपोस्ट डालें।',
      'Re-check soil pH and moisture.': 'मिट्टी का पीएच और नमी फिर से जांचें।',
      'Plan next fertilizer cycle.': 'अगले उर्वरक चक्र की योजना बनाएं।',
      'Apply first dose of Urea (25kg/acre)': 'यूरिया की पहली खुराक डालें (25 किग्रा/एकड़)।',
      'Check soil moisture levels': 'मिट्टी की नमी स्तर जांचें।',
      'Irrigation cycle (2 hours)': 'सिंचाई चक्र (2 घंटे)।',
      'Inspect leaves for pest signs': 'कीट संकेतों के लिए पत्तियों का निरीक्षण करें।',
      'Apply organic mulch': 'जैविक मल्च लगाएं।',
      'Rest period': 'आराम अवधि।',
      'Weekly soil re-analysis': 'साप्ताहिक मिट्टी पुनः-विश्लेषण।',
    };

    if (exactMap[clean]) {
      return exactMap[clean];
    }

    return clean.replace(/kg\s*\/\s*acre/gi, 'किग्रा/एकड़');
  }, [sanitizeTaskText]);

  const displayTaskText = React.useCallback((taskText: string) => {
    const clean = sanitizeTaskText(taskText);
    if (!isHindi) {
      return clean;
    }
    return toHindiTaskText(clean);
  }, [isHindi, sanitizeTaskText, toHindiTaskText]);

  const displayIrrigationText = React.useCallback((irrigation?: string) => {
    const fallback = t('workplan.default_irrigation');
    const text = irrigation?.trim() || fallback;
    if (!isHindi) {
      return text;
    }
    const match = text.match(/^Every\s+(\d+)\s+days?$/i);
    if (match?.[1]) {
      return `हर ${match[1]} दिन`;
    }
    return text;
  }, [isHindi, t]);

  const formatNumber = (value?: number) => (typeof value === 'number' ? value.toFixed(2) : 'N/A');
  const summaryCards = latestResult ? [
    {
      label: t('workplan.health'),
      value: `${formatNumber(latestResult.healthScore)}%`,
      className: 'text-agri-green bg-agri-green/5',
    },
    {
      label: t('workplan.moisture'),
      value: `${formatNumber(latestResult.moisture)}%`,
      className: 'text-blue-500 bg-blue-500/10',
    },
    {
      label: t('workplan.ph_level'),
      value: formatNumber(latestResult.ph),
      className: 'text-orange-500 bg-orange-500/10',
    },
    {
      label: t('workplan.fertility'),
      value: `${formatNumber(latestResult.fertility)}%`,
      className: 'text-purple-500 bg-purple-500/10',
    },
    {
      label: t('workplan.gsm'),
      value: formatNumber(latestResult.gsm),
      className: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: t('workplan.granule_count'),
      value: typeof latestResult.granuleCount === 'number' ? `${latestResult.granuleCount}` : 'N/A',
      className: 'text-lime-500 bg-lime-500/10',
    },
    {
      label: t('workplan.granule_density'),
      value: formatNumber(latestResult.granuleDensity),
      className: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      label: t('workplan.sampling_depth'),
      value: typeof latestResult.depthCm === 'number' ? `${latestResult.depthCm.toFixed(2)} cm` : 'N/A',
      className: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: t('workplan.temperature'),
      value: typeof latestResult.weather?.temperatureC === 'number' ? `${latestResult.weather.temperatureC.toFixed(2)}°C` : 'N/A',
      className: 'text-sky-500 bg-sky-500/10',
      icon: <Thermometer className="w-4 h-4 inline-block mr-1" />,
    },
    {
      label: t('workplan.humidity'),
      value: typeof latestResult.weather?.humidity === 'number' ? `${latestResult.weather.humidity.toFixed(2)}%` : 'N/A',
      className: 'text-teal-500 bg-teal-500/10',
      icon: <CloudSun className="w-4 h-4 inline-block mr-1" />,
    },
  ] : [];

  return (
    <div className="pt-20 sm:pt-22 pb-12 px-4 sm:px-6 lg:px-[5cm] w-full">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-earth-500 hover:text-agri-green transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t('workplan.back_dashboard')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">{t('workplan.title')}</h1>
          <p className="text-earth-600 dark:text-zinc-400">{t('workplan.subtitle')}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-3xl font-bold text-agri-green">{progress}%</div>
          <div className="text-xs font-medium text-earth-500 uppercase">{t('workplan.progress')}</div>
        </div>
      </header>

      <div className="w-full bg-earth-200 dark:bg-zinc-800 h-3 rounded-full mb-12 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="bg-agri-green h-full"
        />
      </div>

      {latestResult && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2 glass p-8 rounded-3xl"
          >
            <div className="text-sm font-bold text-agri-green uppercase tracking-widest mb-2">{t('workplan.classification')}</div>
            <h2 className="text-4xl font-display font-bold mb-3">{latestResult.type}</h2>
            <p className="text-earth-600 dark:text-zinc-400 mb-6">
              {t('workplan.classification_desc', { type: latestResult.type })}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {summaryCards.map((card) => (
                <div key={card.label} className={`rounded-2xl p-4 text-center ${card.className}`}>
                  <div className="text-2xl font-bold leading-tight">{card.icon}{card.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{card.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass p-6 rounded-3xl border-l-4 border-agri-green"
          >
            <h3 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
              <Sprout className="w-6 h-6 text-agri-green" />
              {t('workplan.fertilizer_advisory')}
            </h3>

            <div className="rounded-2xl p-4 bg-agri-green/5 mb-4">
              <div className="text-xs font-bold text-agri-green uppercase tracking-widest mb-1">{t('workplan.urea_requirement')}</div>
              <div className="text-3xl font-bold">
                {typeof latestResult.fertilizerPlan?.ureaKg === 'number' ? `${latestResult.fertilizerPlan.ureaKg.toFixed(2)} ${t('workplan.kg_per_acre')}` : 'N/A'}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-blue-500/10 mb-4">
              <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">{t('workplan.irrigation_schedule')}</div>
              <div className="text-2xl font-bold">{displayIrrigationText(latestResult.fertilizerPlan?.irrigation)}</div>
              <p className="text-xs text-earth-600 dark:text-zinc-400 mt-2">{t('workplan.irrigation_hint')}</p>
            </div>

            <div>
              <div className="text-xs font-bold text-earth-500 uppercase tracking-widest mb-2">{t('workplan.next_steps')}</div>
              <ul className="space-y-2 text-sm text-earth-700 dark:text-zinc-300">
                {(latestResult.workPlan?.slice(0, 3) || [
                  t('workplan.next_step_1'),
                  t('workplan.next_step_2'),
                  t('workplan.next_step_3'),
                ]).map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <Droplets className="w-4 h-4 mt-0.5 text-agri-green shrink-0" />
                    <span>{displayTaskText(step)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      )}

      {latestResult ? (
        <>
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`glass p-4 sm:p-5 rounded-2xl border-l-4 flex items-start space-x-4 cursor-pointer transition-all ${task.completed ? 'opacity-60 grayscale border-earth-300 dark:border-zinc-700' : 'hover:border-agri-green/60 border-agri-green/30'}`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="mt-1">
                  {task.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-agri-green" />
                  ) : (
                    <Circle className="w-6 h-6 text-earth-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-agri-green/10 text-agri-green font-bold uppercase tracking-wider">{t('workplan.day_label', { day: task.id })}</span>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-earth-200/70 dark:bg-zinc-800 text-earth-700 dark:text-zinc-200 font-semibold uppercase tracking-wider">{t(`workplan.task_types.${task.type}`)}</span>
                    </div>
                    <Clock className="w-4 h-4 text-earth-400" />
                  </div>
                  <h3 className={`text-base sm:text-lg font-medium leading-relaxed ${task.completed ? 'line-through' : ''}`}>{displayTaskText(task.task)}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-earth-300" />
              </motion.div>
            ))}
          </div>

          <div className="mt-12 glass p-6 rounded-3xl bg-agri-green/5 border-agri-green/20">
            <div className="flex items-center space-x-2 mb-4 text-agri-green">
              <Info className="w-5 h-5" />
              <h3 className="font-bold">{t('workplan.ai_insight')}</h3>
            </div>
            <p className="text-earth-700 dark:text-zinc-300 text-sm leading-relaxed">
              {t('workplan.ai_insight_body')}
            </p>
          </div>
        </>
      ) : (
        <div className="glass p-8 rounded-3xl text-center">
          <h3 className="text-xl font-bold mb-2">{t('workplan.no_workplan_title')}</h3>
          <p className="text-earth-600 dark:text-zinc-400">{t('workplan.no_workplan_body')}</p>
        </div>
      )}
    </div>
  );
};

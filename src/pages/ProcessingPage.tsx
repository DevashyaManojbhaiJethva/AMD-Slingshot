import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';

export const ProcessingStatus = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentJob, soilResult, history, setCurrentJob } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const STAGES = useMemo(
    () => [
      { id: 'cleaning', label: t('processing_ui.stage_cleaning_label'), message: t('processing_ui.stage_cleaning_msg') },
      { id: 'extraction', label: t('processing_ui.stage_extraction_label'), message: t('processing_ui.stage_extraction_msg') },
      { id: 'classification', label: t('processing_ui.stage_classification_label'), message: t('processing_ui.stage_classification_msg') },
      { id: 'suitability', label: t('processing_ui.stage_suitability_label'), message: t('processing_ui.stage_suitability_msg') },
    ],
    [i18n.language]
  );

  useEffect(() => {
    if (!jobId) {
      return;
    }

    if (currentJob.status === 'failed') {
      setError(t('processing_ui.failed_fetch'));
      return;
    }

    if (currentJob.status !== 'completed') {
      return;
    }

    const matchedResult =
      (soilResult?.jobId === jobId && soilResult) || history.find((item) => item.jobId === jobId);

    if (matchedResult) {
      const timeoutId = setTimeout(() => {
        navigate(`/result/${jobId}`);
      }, 600);
      return () => clearTimeout(timeoutId);
    }
  }, [currentJob.status, history, jobId, navigate, soilResult, t]);

  const handleRetry = () => {
    setError(null);
    setCurrentJob({ status: 'queued', progress: 0, stage: 'cleaning' });
    navigate('/dashboard');
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-12 rounded-3xl"
      >
        <div className="relative w-32 h-32 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-earth-200 dark:text-zinc-800"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="377"
              animate={{ strokeDashoffset: 377 - (377 * currentJob.progress) / 100 }}
              className="text-agri-green"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{currentJob.progress}%</span>
          </div>
        </div>

        <h2 className="text-2xl font-display font-bold mb-2">
          {currentJob.status === 'completed' ? t('processing_ui.analysis_complete') : t('dashboard.processing')}
        </h2>
        <p className="text-earth-600 dark:text-zinc-400 mb-12 h-6">
          {STAGES.find(s => s.id === currentJob.stage)?.message || t('processing_ui.initializing')}
        </p>

        <div className="space-y-4 text-left max-w-sm mx-auto">
          {STAGES.map((stage, idx) => {
            const isCompleted = currentJob.progress > (idx + 1) * 25 || currentJob.status === 'completed';
            const isCurrent = currentJob.stage === stage.id;

            return (
              <div key={stage.id} className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCompleted ? 'bg-agri-green text-white' : 
                  isCurrent ? 'bg-agri-green/20 text-agri-green' : 'bg-earth-100 text-earth-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                   isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{idx + 1}</span>}
                </div>
                <span className={`font-medium ${isCurrent ? 'text-agri-green' : isCompleted ? 'text-earth-900 dark:text-zinc-100' : 'text-earth-400'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl"
            >
              <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">{t('processing_ui.error_occurred')}</span>
              </div>
              <p className="text-sm text-red-600/80 mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center justify-center space-x-2 w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>{t('processing_ui.retry')}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

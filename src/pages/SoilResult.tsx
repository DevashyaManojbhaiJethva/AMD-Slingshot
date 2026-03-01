import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  CheckCircle2, TrendingUp, Droplets, Sprout, AlertCircle, 
  FileText, ArrowLeft, Share2, Download, Zap, CloudSun, Thermometer, History
} from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { useUiStore } from '../store/useStore';

export const SoilResult = () => {
  const { t, i18n } = useTranslation();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { soilResult, history } = useAppStore();
  const { pushToast } = useUiStore();

  // If no result in state, try to find in history or redirect
  const result = soilResult?.jobId === jobId ? soilResult : history.find(h => h.jobId === jobId);

  if (!result) {
    return (
      <div className="pt-32 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">{t('soil_result.report_not_found')}</h2>
        <Link to="/dashboard" className="text-agri-green font-bold hover:underline">{t('soil_result.return_dashboard')}</Link>
      </div>
    );
  }

  const isHindi = i18n.language?.startsWith('hi');
  const soilTypeMap: Record<string, string> = {
    'Alluvial Soil': 'जलोढ़ मिट्टी',
    'Laterite Soil': 'लेटराइट मिट्टी',
    'Black Soil': 'काली मिट्टी',
    'Red Soil': 'लाल मिट्टी',
    'Sandy Soil': 'बलुई मिट्टी',
    'Clay Soil': 'चिकनी मिट्टी',
    'Loamy Soil': 'दोमट मिट्टी',
  };
  const cropNameMap: Record<string, string> = {
    Rice: 'धान',
    Wheat: 'गेहूं',
    Maize: 'मक्का',
    Sugarcane: 'गन्ना',
    Cotton: 'कपास',
    Millet: 'बाजरा',
    Soybean: 'सोयाबीन',
    Groundnut: 'मूंगफली',
  };
  const displaySoilType = (name?: string, language?: string) => {
    const lang = language ?? i18n.language;
    const useHindi = lang?.startsWith('hi');
    if (!name) {
      return 'N/A';
    }
    if (!useHindi) {
      return name;
    }
    return soilTypeMap[name] || name;
  };
  const displayCropName = (name?: string, language?: string) => {
    const lang = language ?? i18n.language;
    const useHindi = lang?.startsWith('hi');
    if (!name) {
      return 'N/A';
    }
    if (!useHindi) {
      return name;
    }
    return cropNameMap[name] || name;
  };

  const localizeIrrigationText = (text: string, language?: string) => {
    const lang = language ?? i18n.language;
    if (!lang?.startsWith('hi')) {
      return text;
    }
    const match = text.match(/^Every\s+(\d+)\s+days?$/i);
    if (match?.[1]) {
      return `हर ${match[1]} दिन`;
    }
    return text;
  };

  const npkData = [
    { subject: t('soil_result.nitrogen'), A: result.npk.n, fullMark: 100 },
    { subject: t('soil_result.phosphorus'), A: result.npk.p, fullMark: 100 },
    { subject: t('soil_result.potassium'), A: result.npk.k, fullMark: 100 },
    { subject: t('soil_result.moisture'), A: result.moisture, fullMark: 100 },
    { subject: t('soil_result.fertility'), A: result.fertility, fullMark: 100 },
  ];
  const previousHistory = history
    .filter((item) => item.jobId !== result.jobId)
    .slice(0, 5);
  const [showDownloadLanguageModal, setShowDownloadLanguageModal] = React.useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = React.useState(false);
  const downloadMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!showDownloadLanguageModal) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadLanguageModal(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [showDownloadLanguageModal]);

  const formatNumber = (value: number) => value.toFixed(2);

  const hindiPdfFontRef = React.useRef<string | null>(null);
  const ensureHindiPdfFont = React.useCallback(async (doc: jsPDF) => {
    try {
      if (!hindiPdfFontRef.current) {
        const response = await fetch('https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf');
        if (!response.ok) {
          return false;
        }
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = '';
        for (let index = 0; index < bytes.length; index += chunkSize) {
          const chunk = bytes.subarray(index, index + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        hindiPdfFontRef.current = btoa(binary);
      }

      if (!hindiPdfFontRef.current) {
        return false;
      }

      doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', hindiPdfFontRef.current);
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'bold');
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'italic');
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }, []);

  const handleDownload = async (pdfLang: 'en' | 'hi') => {
    setIsPdfDownloading(true);
    try {

    const reportId = jobId || result.jobId || 'N/A';
    const suffix = (jobId || result.jobId || 'report').slice(-6);
    const reportDocument = new jsPDF({ unit: 'pt', format: 'a4' });

    let resolvedLang = pdfLang;
    let useHindiFont = false;
    if (resolvedLang === 'hi') {
      useHindiFont = await ensureHindiPdfFont(reportDocument);
      if (!useHindiFont) {
        pushToast({ type: 'info', message: t('soil_result.pdf_hindi_font_warning') });
        resolvedLang = 'en';
      }
    }
    const pdfT = i18n.getFixedT(resolvedLang);
    const pdfFontFamily = useHindiFont ? 'NotoSansDevanagari' : 'helvetica';
    const setPdfFont = (style: 'normal' | 'bold' | 'italic' = 'normal') => {
      reportDocument.setFont(pdfFontFamily, pdfFontFamily === 'helvetica' ? style : 'normal');
    };

    const pageWidth = reportDocument.internal.pageSize.getWidth();
    const pageHeight = reportDocument.internal.pageSize.getHeight();
    const safeTopCrop = displayCropName(result.crops[0]?.name || 'N/A', resolvedLang);
    const pdfSoilType = displaySoilType(result.type, resolvedLang);
    const clampScore = (score: number) => Math.max(0, Math.min(100, score));
    const pdfNa = pdfT('soil_result.pdf_na');
    const generatedAt = new Date().toLocaleString(resolvedLang === 'hi' ? 'hi-IN' : 'en-US');
    const formatPdfValue = (value: number | undefined, unit = '') => {
      if (typeof value !== 'number') {
        return pdfNa;
      }
      return `${formatNumber(value)}${unit}`;
    };
    const formatPdfInt = (value: number | undefined) => {
      if (typeof value !== 'number') {
        return pdfNa;
      }
      return `${Math.round(value)}`;
    };
    const trimForWidth = (value: string, maxWidth: number) => {
      if (reportDocument.getTextWidth(value) <= maxWidth) {
        return value;
      }
      let trimmed = value;
      while (trimmed.length > 0 && reportDocument.getTextWidth(`${trimmed}…`) > maxWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      return `${trimmed}…`;
    };

    const drawPageBackground = () => {
      reportDocument.setFillColor(246, 247, 244);
      reportDocument.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const drawHeader = (pageNumber: number) => {
      reportDocument.setFillColor(255, 255, 255);
      reportDocument.roundedRect(32, 26, pageWidth - 64, 92, 14, 14, 'F');
      reportDocument.setTextColor(36, 82, 46);
      setPdfFont('bold');
      reportDocument.setFontSize(21);
      reportDocument.text(`AgriSoil AI - ${pdfT('dashboard.report')}`, 48, 58);
      setPdfFont('normal');
      reportDocument.setFontSize(10);
      reportDocument.setTextColor(94, 112, 95);
      const pageLabel = `${pdfT('soil_result.pdf_page')} ${pageNumber}`;
      const pageLabelWidth = reportDocument.getTextWidth(pageLabel);
      const rightMetaX = pageWidth - 48 - pageLabelWidth;
      const leftMetaMaxWidth = Math.max(120, rightMetaX - 66);

      const reportIdText = trimForWidth(`${pdfT('soil_result.pdf_report_id')}: ${reportId}`, leftMetaMaxWidth);
      const generatedText = trimForWidth(`${pdfT('soil_result.pdf_generated')}: ${generatedAt}`, leftMetaMaxWidth);

      reportDocument.text(reportIdText, 48, 82);
      reportDocument.text(generatedText, 48, 98);
      reportDocument.text(pageLabel, rightMetaX, 82);
    };

    const drawFooter = (pageNumber: number) => {
      reportDocument.setDrawColor(220, 228, 222);
      reportDocument.setLineWidth(1);
      reportDocument.line(40, pageHeight - 38, pageWidth - 40, pageHeight - 38);
      setPdfFont('normal');
      reportDocument.setFontSize(10);
      reportDocument.setTextColor(88, 98, 90);
      reportDocument.text(pdfT('soil_result.pdf_footer_label'), 46, pageHeight - 20);
      reportDocument.text(`${pdfT('soil_result.pdf_page')} ${pageNumber}`, pageWidth - 82, pageHeight - 20);
    };

    drawPageBackground();
    drawHeader(1);

    reportDocument.setFillColor(255, 255, 255);
    reportDocument.roundedRect(32, 124, pageWidth - 64, 338, 16, 16, 'F');
    reportDocument.setTextColor(35, 48, 38);
    setPdfFont('bold');
    reportDocument.setFontSize(12);
    reportDocument.text(pdfT('soil_result.classification').toUpperCase(), 52, 154);
    reportDocument.setFontSize(27);
    reportDocument.text(pdfSoilType, 52, 188);

    const healthPercent = clampScore(result.healthScore);
    reportDocument.setFontSize(11);
    reportDocument.setTextColor(58, 74, 62);
    reportDocument.text(`${pdfT('soil_result.health')}: ${formatPdfValue(result.healthScore, '%')}`, 52, 214);
    reportDocument.setDrawColor(223, 231, 223);
    reportDocument.setLineWidth(10);
    reportDocument.line(52, 228, pageWidth - 52, 228);
    reportDocument.setDrawColor(45, 90, 39);
    reportDocument.line(52, 228, 52 + ((pageWidth - 104) * healthPercent / 100), 228);

    reportDocument.setFillColor(247, 249, 246);
    reportDocument.roundedRect(52, 246, pageWidth - 104, 196, 12, 12, 'F');
    setPdfFont('bold');
    reportDocument.setFontSize(11);
    reportDocument.setTextColor(58, 74, 62);
    reportDocument.text(pdfT('soil_result.pdf_summary_title').toUpperCase(), 68, 270);

    const summaryCards = [
      { label: pdfT('soil_result.best_recommendation'), value: safeTopCrop || pdfNa },
      { label: pdfT('soil_result.urea_requirement'), value: `${formatPdfValue(result.fertilizerPlan?.ureaKg, '')} ${pdfT('soil_result.kg_per_acre')}` },
      { label: pdfT('soil_result.depth'), value: typeof result.depthCm === 'number' ? `${formatNumber(result.depthCm)} cm` : pdfNa },
      { label: pdfT('soil_result.moisture'), value: formatPdfValue(result.moisture, '%') },
      { label: pdfT('dashboard.ph'), value: formatPdfValue(result.ph) },
      { label: pdfT('soil_result.fertility'), value: formatPdfValue(result.fertility, '%') },
      { label: pdfT('soil_result.temperature'), value: formatPdfValue(result.weather?.temperatureC, '°C') },
      { label: pdfT('soil_result.humidity'), value: formatPdfValue(result.weather?.humidity, '%') },
      { label: pdfT('soil_result.rainfall'), value: formatPdfValue(result.weather?.rainfallMm, ' mm') },
      { label: pdfT('soil_result.gsm'), value: formatPdfValue(result.gsm) },
      { label: pdfT('soil_result.granule_count'), value: formatPdfInt(result.granuleCount) },
      { label: pdfT('soil_result.granule_density'), value: formatPdfValue(result.granuleDensity) },
    ];

    const summaryStartX = 68;
    const summaryStartY = 282;
    const summaryGap = 10;
    const summaryColumns = 4;
    const summaryBoxWidth = (pageWidth - 136 - summaryGap * (summaryColumns - 1)) / summaryColumns;
    const summaryBoxHeight = 46;
    summaryCards.forEach((item, idx) => {
      const col = idx % summaryColumns;
      const row = Math.floor(idx / summaryColumns);
      const cardX = summaryStartX + col * (summaryBoxWidth + summaryGap);
      const cardY = summaryStartY + row * (summaryBoxHeight + 8);
      reportDocument.setFillColor(255, 255, 255);
      reportDocument.roundedRect(cardX, cardY, summaryBoxWidth, summaryBoxHeight, 8, 8, 'F');
      setPdfFont('bold');
      reportDocument.setFontSize(8.5);
      reportDocument.setTextColor(93, 105, 96);
      reportDocument.text(item.label.toUpperCase(), cardX + 8, cardY + 15);
      setPdfFont('normal');
      reportDocument.setFontSize(10.5);
      reportDocument.setTextColor(28, 36, 30);
      const valueLines = reportDocument.splitTextToSize(item.value, summaryBoxWidth - 16).slice(0, 2);
      reportDocument.text(valueLines, cardX + 8, cardY + 30);
    });

    reportDocument.setFillColor(255, 255, 255);
    reportDocument.roundedRect(32, 476, pageWidth - 64, 248, 16, 16, 'F');
    reportDocument.setDrawColor(45, 90, 39);
    reportDocument.setLineWidth(3);
    reportDocument.line(52, 500, 52, 706);
    setPdfFont('bold');
    reportDocument.setFontSize(22);
    reportDocument.setTextColor(28, 42, 31);
    reportDocument.text(pdfT('soil_result.fertilizer_advisory'), 68, 508);

    reportDocument.setFillColor(245, 248, 244);
    reportDocument.roundedRect(68, 524, pageWidth - 120, 78, 10, 10, 'F');
    reportDocument.setFontSize(11);
    reportDocument.setTextColor(58, 98, 47);
    reportDocument.text(pdfT('soil_result.urea_requirement').toUpperCase(), 84, 546);
    reportDocument.setFontSize(24);
    reportDocument.setTextColor(23, 31, 22);
    reportDocument.text(`${formatPdfValue(result.fertilizerPlan?.ureaKg, '')} ${pdfT('soil_result.kg_per_acre')}`, 84, 579);

    reportDocument.setFillColor(242, 246, 255);
    reportDocument.roundedRect(68, 610, pageWidth - 120, 54, 10, 10, 'F');
    reportDocument.setFontSize(11);
    reportDocument.setTextColor(37, 99, 235);
    reportDocument.text(pdfT('soil_result.irrigation_schedule').toUpperCase(), 84, 631);
    reportDocument.setFontSize(18);
    reportDocument.setTextColor(23, 31, 22);
    reportDocument.text(localizeIrrigationText(result.fertilizerPlan?.irrigation || pdfT('soil_result.default_irrigation'), resolvedLang), 84, 653);

    setPdfFont('bold');
    reportDocument.setFontSize(11);
    reportDocument.setTextColor(108, 96, 77);
    reportDocument.text(pdfT('soil_result.next_steps').toUpperCase(), 68, 684);
    setPdfFont('normal');
    const nextSteps = [
      pdfT('soil_result.next_step_1'),
      pdfT('soil_result.next_step_2'),
      pdfT('soil_result.next_step_3'),
    ];
    nextSteps.forEach((stepText, stepIndex) => {
      const stepY = 700 + (stepIndex * 14);
      reportDocument.setDrawColor(187, 211, 190);
      reportDocument.circle(74, stepY - 4, 4, 'S');
      reportDocument.setFontSize(10);
      reportDocument.setTextColor(70, 78, 72);
      reportDocument.text(stepText, 86, stepY);
    });

    drawFooter(1);

    reportDocument.addPage();
    drawPageBackground();
    drawHeader(2);

    reportDocument.setFillColor(255, 255, 255);
    reportDocument.roundedRect(32, 124, pageWidth - 64, 300, 16, 16, 'F');
    setPdfFont('bold');
    reportDocument.setFontSize(24);
    reportDocument.setTextColor(30, 46, 31);
    reportDocument.text(pdfT('soil_result.nutrient_profile'), 52, 164);
    setPdfFont('normal');
    reportDocument.setFontSize(13);
    reportDocument.setTextColor(64, 75, 66);
    reportDocument.text(`${pdfT('soil_result.nitrogen')}: ${formatNumber(result.npk.n)}%`, 52, 208);
    reportDocument.text(`${pdfT('soil_result.phosphorus')}: ${formatNumber(result.npk.p)}%`, 52, 238);
    reportDocument.text(`${pdfT('soil_result.potassium')}: ${formatNumber(result.npk.k)}%`, 52, 268);
    reportDocument.text(`${pdfT('soil_result.moisture')}: ${formatNumber(result.moisture)}%`, 52, 298);
    reportDocument.text(`${pdfT('soil_result.fertility')}: ${formatNumber(result.fertility)}%`, 52, 328);

    const barStartX = 250;
    const barEndX = pageWidth - 80;
    const barWidth = barEndX - barStartX;
    const nutrientBars = [result.npk.n, result.npk.p, result.npk.k, result.moisture, result.fertility];
    nutrientBars.forEach((score, index) => {
      const barY = 203 + (index * 30);
      reportDocument.setDrawColor(225, 231, 224);
      reportDocument.setLineWidth(8);
      reportDocument.line(barStartX, barY, barEndX, barY);
      reportDocument.setDrawColor(45, 90, 39);
      reportDocument.line(barStartX, barY, barStartX + (barWidth * clampScore(score) / 100), barY);
    });

    reportDocument.setFillColor(255, 255, 255);
    reportDocument.roundedRect(32, 444, pageWidth - 64, 260, 16, 16, 'F');
    setPdfFont('bold');
    reportDocument.setFontSize(24);
    reportDocument.setTextColor(30, 46, 31);
    reportDocument.text(pdfT('soil_result.crop_suitability'), 52, 484);

    const cropsToRender = result.crops.slice(0, 5);
    cropsToRender.forEach((crop, cropIndex) => {
      const cropY = 526 + (cropIndex * 34);
      reportDocument.setFontSize(14);
      reportDocument.setTextColor(33, 39, 34);
      reportDocument.text(displayCropName(crop.name, resolvedLang), 52, cropY);
      reportDocument.setFontSize(13);
      reportDocument.setTextColor(45, 90, 39);
      reportDocument.text(`${formatNumber(crop.score)}%`, pageWidth - 78, cropY);
      reportDocument.setDrawColor(227, 232, 226);
      reportDocument.setLineWidth(7);
      reportDocument.line(190, cropY - 4, pageWidth - 96, cropY - 4);
      reportDocument.setDrawColor(70, 140, 64);
      reportDocument.line(190, cropY - 4, 190 + ((pageWidth - 286) * clampScore(crop.score) / 100), cropY - 4);
    });

    setPdfFont('italic');
    reportDocument.setFontSize(12);
    reportDocument.setTextColor(74, 84, 76);
    reportDocument.text(pdfT('soil_result.expert_tip_body', { type: pdfSoilType, crop: safeTopCrop }), 52, 752);
    reportDocument.text(`${pdfT('soil_result.pdf_view_online')}: ${window.location.href}`, 52, 774);

    drawFooter(2);

    reportDocument.save(`soil-report-${suffix}.pdf`);
    setShowDownloadLanguageModal(false);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: 'Soil Intelligence Report',
      text: `Soil Type: ${result.type} | Health: ${result.healthScore}% | Fertility: ${result.fertility}%`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      pushToast({ type: 'success', message: t('soil_result.share_copied') });
      return;
    }

    pushToast({ type: 'info', message: t('soil_result.share_copy_manual') });
  };

  return (
    <div className="pt-22 sm:pt-24 pb-24 md:pb-12 px-4 sm:px-6 lg:px-[5cm] w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-earth-500 hover:text-agri-green transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t('soil_result.back_dashboard')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex flex-wrap items-center gap-2 sm:gap-3">
            <span>{t('dashboard.report')}</span>
            <div className="bg-agri-green/10 text-agri-green text-xs px-2 py-1 rounded-full uppercase tracking-widest">
              ID: {jobId?.slice(-6)}
            </div>
          </h1>
        </div>
        <div className="hidden md:flex space-x-3">
          <button
            type="button"
            onClick={handleShare}
            className="glass p-3 rounded-xl hover:bg-white transition-all"
            aria-label="Share soil report"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              onClick={() => setShowDownloadLanguageModal((prev) => !prev)}
              className="glass p-3 rounded-xl hover:bg-white transition-all"
              aria-label="Download soil report"
            >
              <Download className="w-5 h-5" />
            </button>

            {showDownloadLanguageModal && (
              <div className="absolute right-0 mt-2 glass rounded-xl shadow-xl p-2 min-w-48 z-50">
                <div className="px-3 py-2 text-sm font-medium">
                  {t('soil_result.pdf_modal_title')}
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleDownload('en')}
                    disabled={isPdfDownloading}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-agri-green hover:text-white disabled:opacity-60"
                  >
                    {t('soil_result.pdf_download_en')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('hi')}
                    disabled={isPdfDownloading}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-agri-green hover:text-white disabled:opacity-60"
                  >
                    {t('soil_result.pdf_download_hi')}
                  </button>
                  {isPdfDownloading && (
                    <div className="px-3 py-2 text-xs text-earth-500">
                      {t('soil_result.pdf_downloading')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link 
            to="/workplan"
            className="bg-agri-green text-white px-6 py-3 rounded-xl font-bold hover:bg-agri-green/90 transition-all shadow-lg shadow-agri-green/20"
          >
            {t('soil_result.view_workplan')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECTION 1: Summary */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-3xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <Zap className="w-6 h-6 text-agri-leaf opacity-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-sm font-bold text-agri-green uppercase tracking-widest mb-2">{t('soil_result.classification')}</div>
                <div className="text-4xl font-display font-bold mb-4">{displaySoilType(result.type)}</div>
                <p className="text-earth-600 dark:text-zinc-400 leading-relaxed">
                  {t('soil_result.classification_desc', { type: displaySoilType(result.type) })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-agri-green/5 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-agri-green">{formatNumber(result.healthScore)}%</div>
                  <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.health')}</div>
                </div>
                <div className="p-6 bg-blue-500/5 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-blue-500">{formatNumber(result.moisture)}%</div>
                  <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('dashboard.moisture')}</div>
                </div>
                <div className="p-6 bg-orange-500/5 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-orange-500">{formatNumber(result.ph)}</div>
                  <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('dashboard.ph')}</div>
                </div>
                <div className="p-6 bg-purple-500/5 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-purple-500">{formatNumber(result.fertility)}%</div>
                  <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('dashboard.fertility')}</div>
                </div>
                {typeof result.gsm === 'number' && (
                  <div className="p-6 bg-amber-500/5 rounded-2xl text-center">
                    <div className="text-3xl font-bold text-amber-600">{formatNumber(result.gsm)}</div>
                    <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.gsm')}</div>
                  </div>
                )}
                {typeof result.granuleCount === 'number' && (
                  <div className="p-6 bg-lime-500/5 rounded-2xl text-center">
                    <div className="text-3xl font-bold text-lime-600">{result.granuleCount}</div>
                    <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.granule_count')}</div>
                  </div>
                )}
                {typeof result.granuleDensity === 'number' && (
                  <div className="p-6 bg-teal-500/5 rounded-2xl text-center">
                    <div className="text-3xl font-bold text-teal-600">{formatNumber(result.granuleDensity)}</div>
                    <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.granule_density')}</div>
                  </div>
                )}
                {typeof result.depthCm === 'number' && (
                  <div className="p-6 bg-emerald-500/5 rounded-2xl text-center">
                    <div className="text-3xl font-bold text-emerald-500">{formatNumber(result.depthCm)} cm</div>
                    <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.depth')}</div>
                  </div>
                )}
                {result.weather && (
                  <>
                    <div className="p-6 bg-sky-500/5 rounded-2xl text-center">
                      <div className="text-3xl font-bold text-sky-600 flex justify-center items-center gap-2">
                        <Thermometer className="w-5 h-5" />
                        {formatNumber(result.weather.temperatureC)}°C
                      </div>
                      <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.temperature')}</div>
                    </div>
                    <div className="p-6 bg-cyan-500/5 rounded-2xl text-center">
                      <div className="text-3xl font-bold text-cyan-600 flex justify-center items-center gap-2">
                        <CloudSun className="w-5 h-5" />
                        {formatNumber(result.weather.humidity)}%
                      </div>
                      <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.humidity')}</div>
                    </div>
                    {typeof result.weather.rainfallMm === 'number' && (
                      <div className="p-6 bg-indigo-500/5 rounded-2xl text-center">
                        <div className="text-3xl font-bold text-indigo-600 flex justify-center items-center gap-2">
                          <Droplets className="w-5 h-5" />
                          {formatNumber(result.weather.rainfallMm)} mm
                        </div>
                        <div className="text-xs font-bold text-earth-500 uppercase mt-1">{t('soil_result.rainfall')}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* SECTION 2: Nutrient Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass p-8 rounded-3xl"
            >
              <h3 className="text-xl font-bold mb-8">{t('soil_result.nutrient_profile')}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={npkData}>
                    <PolarGrid stroke="#ccc" />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Soil Analysis"
                      dataKey="A"
                      stroke="#2d5a27"
                      fill="#2d5a27"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* SECTION 3: Crop Ranking */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass p-8 rounded-3xl"
            >
              <h3 className="text-xl font-bold mb-8">{t('soil_result.crop_suitability')}</h3>
              <div className="max-h-[360px] overflow-y-auto pr-2 space-y-6">
                {result.crops.map((crop, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{displayCropName(crop.name)}</span>
                      <span className="text-sm font-bold text-agri-green">{formatNumber(crop.score)}%</span>
                    </div>
                    <div className="w-full bg-earth-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${crop.score}%` }}
                        className={`h-full ${idx === 0 ? 'bg-agri-green' : 'bg-agri-leaf'}`}
                      />
                    </div>
                    {idx === 0 && (
                      <div className="mt-2 text-xs text-agri-green font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('soil_result.best_recommendation')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* SECTION 4: Fertilizer Advisory */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-8 rounded-3xl border-l-8 border-agri-green"
          >
            <h3 className="text-2xl font-display font-bold mb-6 flex items-center space-x-3">
              <FileText className="w-6 h-6 text-agri-green" />
              <span>{t('soil_result.fertilizer_advisory')}</span>
            </h3>
            
            <div className="space-y-6">
              <div className="p-6 bg-agri-green/5 rounded-2xl">
                <div className="text-xs font-bold text-agri-green uppercase tracking-widest mb-1">{t('soil_result.urea_requirement')}</div>
                <div className="text-3xl font-bold">{formatNumber(result.fertilizerPlan?.ureaKg || 22)} {t('soil_result.kg_per_acre')}</div>
                <p className="text-sm text-earth-600 dark:text-zinc-400 mt-2">
                  {t('soil_result.urea_hint')}
                </p>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-2xl">
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">{t('soil_result.irrigation_schedule')}</div>
                <div className="text-3xl font-bold">{result.fertilizerPlan?.irrigation || t('soil_result.default_irrigation')}</div>
                <p className="text-sm text-earth-600 dark:text-zinc-400 mt-2">
                  {t('soil_result.irrigation_hint')}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-widest text-earth-500">{t('soil_result.next_steps')}</h4>
                {[
                  t('soil_result.next_step_1'),
                  t('soil_result.next_step_2'),
                  t('soil_result.next_step_3')
                ].map((step, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-agri-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-agri-green" />
                    </div>
                    <span className="text-sm text-earth-700 dark:text-zinc-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="glass p-8 rounded-3xl bg-zinc-900 text-white">
            <h3 className="text-xl font-bold mb-4">{t('soil_result.expert_tip')}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {t('soil_result.expert_tip_body', { type: displaySoilType(result.type), crop: displayCropName(result.crops[0]?.name || 'N/A') })}
            </p>
            <div className="mt-6 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-agri-leaf" />
              <div>
                <div className="text-sm font-bold">Dr. Aman Singh</div>

            <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="glass rounded-2xl p-3 flex items-center gap-3 shadow-lg border border-white/20">
                <button
                  type="button"
                  onClick={() => handleDownload(i18n.language?.startsWith('hi') ? 'hi' : 'en')}
                  disabled={isPdfDownloading}
                  className="flex-1 bg-agri-green text-white py-2.5 rounded-xl font-semibold disabled:opacity-60"
                >
                  {isPdfDownloading ? t('soil_result.pdf_downloading') : t('soil_result.mobile_download')}
                </button>
                <Link
                  to="/workplan"
                  className="flex-1 text-center border border-earth-200 dark:border-zinc-700 py-2.5 rounded-xl font-semibold"
                >
                  {t('soil_result.view_workplan')}
                </Link>
              </div>
            </div>
                <div className="text-xs text-zinc-500">{t('soil_result.soil_scientist')}</div>
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-agri-green" />
              <span>{t('soil_result.previous_history')}</span>
            </h3>
            {previousHistory.length === 0 ? (
              <p className="text-sm text-earth-500">{t('soil_result.no_history')}</p>
            ) : (
              <div className="space-y-3">
                {previousHistory.map((item) => (
                  <button
                    key={item.jobId}
                    type="button"
                    onClick={() => navigate(`/result/${item.jobId}`)}
                    className="w-full text-left p-4 rounded-xl border border-earth-200 dark:border-zinc-800 hover:bg-earth-50 dark:hover:bg-zinc-900 transition-all"
                  >
                    <div className="font-semibold">{displaySoilType(item.type)}</div>
                    <div className="text-xs text-earth-500 mt-1">
                      {t('soil_result.health')}: {formatNumber(item.healthScore)}% · {t('dashboard.fertility')}: {formatNumber(item.fertility)}%
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

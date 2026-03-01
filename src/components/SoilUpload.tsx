import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2, LocateFixed, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAppStore } from '../store/useStore';
import { useAuthStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { apiClient, getFirebaseAuthHeader } from '../api/client';

export const SoilUpload = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setIsProcessing, setCurrentJob, setSoilResult, addToHistory } = useAppStore();
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [depth, setDepth] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [weather, setWeather] = useState<{ temperatureC: number; moisturePct: number } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const buildLocalFallbackResult = (params: {
    depthNumber: number;
    fileCount: number;
    latitude: number;
    longitude: number;
    weatherSnapshot: { temperatureC: number; moisturePct: number } | null;
  }) => {
    const { depthNumber, fileCount, latitude, longitude, weatherSnapshot } = params;
    const moistureValue = weatherSnapshot?.moisturePct ? Math.round(weatherSnapshot.moisturePct * 0.7) : 42;
    const fertilityValue = Math.max(55, Math.min(88, Math.round(60 + depthNumber * 0.5)));
    const healthValue = Math.max(58, Math.min(92, Math.round((fertilityValue + moistureValue) / 2)));
    const phValue = 6.5;
    const gsmValue = Math.max(8, Math.min(82, Math.round((moistureValue + fertilityValue) / 2)));
    const granuleCountValue = Math.max(40, Math.min(280, Math.round(depthNumber * 6 + fileCount * 14)));
    const granuleDensityValue = Math.max(0.4, Math.min(4.8, Number((granuleCountValue / 100).toFixed(2))));
    const isClayLike = moistureValue > 45;
    const fallbackCropPool = isClayLike
      ? ['Rice', 'Wheat', 'Sugarcane', 'Broccoli', 'Cabbage', 'Spinach', 'Beans', 'Peas', 'Pear', 'Plum', 'Apple']
      : ['Rice', 'Wheat', 'Sugarcane', 'Maize', 'Barley', 'Mustard', 'Sesame', 'Gram', 'Lentils', 'Soybeans', 'Potatoes'];
    const baselineScore = Math.max(58, Math.min(95, fertilityValue + 6));
    const fallbackCrops = fallbackCropPool.map((name, index) => {
      const score = Math.max(45, baselineScore - (index * 2));
      return { name, score };
    });
    const now = new Date().toISOString();

    return {
      jobId: `job_${Math.random().toString(36).slice(2, 11)}`,
      type: moistureValue > 45 ? 'Clayey Sand (SC)' : 'Loamy Sand (LS)',
      healthScore: healthValue,
      fertility: fertilityValue,
      ph: phValue,
      moisture: moistureValue,
      gsm: gsmValue,
      granuleCount: granuleCountValue,
      granuleDensity: granuleDensityValue,
      npk: {
        n: Math.max(35, Math.min(90, fertilityValue - 8)),
        p: Math.max(25, Math.min(80, fertilityValue - 15)),
        k: Math.max(30, Math.min(88, fertilityValue - 6)),
      },
      crops: fallbackCrops,
      fertilizerPlan: {
        ureaKg: Math.max(14, Math.round(30 - fertilityValue / 6)),
        irrigation: moistureValue < 45 ? 'Every 3 days' : 'Every 4 days',
        recommendation: 'Apply balanced NPK in split doses and monitor soil moisture weekly.',
      },
      weather: {
        temperatureC: weatherSnapshot?.temperatureC ?? 0,
        humidity: weatherSnapshot?.moisturePct ?? 0,
        rainfallMm: 0,
      },
      workPlan: [
        'Day 1: Remove weeds and apply basal fertilizer.',
        'Day 2: Light irrigation and moisture check.',
        'Day 3: Inspect leaves for nutrient deficiency.',
        'Day 4: Apply compost near root zone.',
        'Day 5: Foliar spray in early morning.',
        'Day 6: Monitor pH and soil texture.',
        'Day 7: Prepare next weekly nutrient plan.',
      ],
      depthCm: depthNumber,
      imageCount: fileCount,
      latitude,
      longitude,
      createdAt: now,
    };
  };

  const isGeolocationError = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const maybeCode = (value as { code?: unknown }).code;
    return typeof maybeCode === 'number' && maybeCode >= 1 && maybeCode <= 3;
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  const getGeolocationErrorMessage = (errorValue: unknown): string => {
    if (errorValue instanceof Error && errorValue.message === 'GEOLOCATION_NOT_SUPPORTED') {
      return t('upload.geolocation_unsupported');
    }

    if (!(errorValue instanceof GeolocationPositionError)) {
      return t('upload.location_failed');
    }

    if (errorValue.code === errorValue.PERMISSION_DENIED) {
      return t('upload.geolocation_denied');
    }

    if (errorValue.code === errorValue.POSITION_UNAVAILABLE) {
      return t('upload.geolocation_unavailable');
    }

    if (errorValue.code === errorValue.TIMEOUT) {
      return t('upload.geolocation_timeout');
    }

    return t('upload.location_failed');
  };

  const getApiErrorMessage = (errorValue: unknown): string => {
    if (errorValue instanceof Error && errorValue.message === 'AUTH_REQUIRED') {
      return t('upload.auth_required');
    }

    if (axios.isAxiosError(errorValue)) {
      const backendMessage =
        (typeof errorValue.response?.data?.detail === 'string' && errorValue.response?.data?.detail) ||
        (typeof errorValue.response?.data?.message === 'string' && errorValue.response?.data?.message);
      return backendMessage || t('upload.failed_upload');
    }

    return t('upload.failed_upload');
  };

  const fetchWeatherByLocation = async (lat: number, lon: number) => {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m',
        timezone: 'auto',
      },
    });

    const current = response.data?.current;
    const temperatureValue = Number(current?.temperature_2m);
    const humidityValue = Number(current?.relative_humidity_2m);

    if (Number.isNaN(temperatureValue) || Number.isNaN(humidityValue)) {
      throw new Error('WEATHER_PARSE_FAILED');
    }

    return {
      temperatureC: temperatureValue,
      moisturePct: humidityValue,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(Array.from(selectedFiles));
    }
    e.target.value = '';
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    setError(null);
    setCameraError(null);

    if (files.length >= 4) {
      setError(t('upload.too_many'));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('upload.camera_not_supported'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            setCameraError(t('upload.camera_start_failed'));
          });
        }
      });
    } catch (cameraOpenError) {
      console.error(cameraOpenError);
      setCameraError(t('upload.camera_permission_denied'));
    }
  };

  const closeCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const captureFromCamera = () => {
    if (!videoRef.current) {
      setCameraError(t('upload.camera_capture_failed'));
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError(t('upload.camera_capture_failed'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError(t('upload.camera_capture_failed'));
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(t('upload.camera_capture_failed'));
          return;
        }

        const capturedFile = new File([blob], `soil-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        addFiles([capturedFile]);
        closeCamera();
      },
      'image/jpeg',
      0.95
    );
  };

  React.useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const validateFile = (file: File): boolean => {
    setError(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(t('upload.invalid_type'));
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('upload.too_large'));
      return false;
    }

    return true;
  };

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;

    const currentCount = files.length;
    if (currentCount >= 4) {
      setError(t('upload.too_many'));
      return;
    }

    const spaceLeft = 4 - currentCount;
    const toAdd = incoming.slice(0, spaceLeft).filter(validateFile);
    if (toAdd.length === 0) return;

    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setFiles((prev) => [...prev, ...toAdd]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      addFiles(Array.from(droppedFiles));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setError(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError(t('upload.no_files'));
      return;
    }

    const depthNumber = parseFloat(depth);
    if (!depth || Number.isNaN(depthNumber) || depthNumber <= 0) {
      setError(t('upload.depth_required'));
      return;
    }

    setIsUploading(true);
    setError(null);
    setIsProcessing(true);

    const provisionalJobId = `job_${Math.random().toString(36).slice(2, 11)}`;
    setCurrentJob({
      jobId: provisionalJobId,
      status: 'queued',
      progress: 0,
      stage: 'cleaning',
      depthCm: depthNumber,
      imageCount: files.length,
    });
    navigate(`/processing/${provisionalJobId}`);

    try {
      let latitude = location?.lat;
      let longitude = location?.lon;
      let weatherSnapshot = weather;

      setCurrentJob({ status: 'processing', progress: 10, stage: 'cleaning' });

      if (latitude == null || longitude == null) {
        setIsLocating(true);
        const position = await getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        setLocation({ lat: latitude, lon: longitude });
        setIsLocating(false);
      }

      if (!weatherSnapshot) {
        setCurrentJob({ status: 'processing', progress: 30, stage: 'extraction' });
        setIsFetchingWeather(true);
        try {
          weatherSnapshot = await fetchWeatherByLocation(latitude, longitude);
          setWeather(weatherSnapshot);
        } catch (weatherError) {
          console.error(weatherError);
          setError(t('upload.weather_failed'));
        } finally {
          setIsFetchingWeather(false);
        }
      }

      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file, `soil-${index + 1}.jpg`);
      });
      formData.append('soilDepthCm', String(depthNumber));
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      if (weatherSnapshot) {
        formData.append('temperatureC', String(weatherSnapshot.temperatureC));
        formData.append('moisturePct', String(weatherSnapshot.moisturePct));
      }

      setCurrentJob({ status: 'processing', progress: 55, stage: 'classification' });
      const authHeader = await getFirebaseAuthHeader(user?.id);
      const response = await apiClient.post('/analyze', formData, {
        headers: authHeader,
        timeout: 180000,
      });

      const backendResult = response?.data?.result;
      const returnedJobId = backendResult?.jobId || response?.data?.jobId || response?.data?.id;
      const nextJobId = typeof returnedJobId === 'string' && returnedJobId.length > 0
        ? returnedJobId
        : provisionalJobId;

      const normalizedGsm =
        typeof backendResult?.gsm === 'number'
          ? backendResult.gsm
          : typeof backendResult?.granuleMetrics?.gsm === 'number'
          ? backendResult.granuleMetrics.gsm
          : undefined;

      const normalizedGranuleCount =
        typeof backendResult?.granuleCount === 'number'
          ? backendResult.granuleCount
          : typeof backendResult?.granule_count === 'number'
          ? backendResult.granule_count
          : typeof backendResult?.granuleMetrics?.granuleCount === 'number'
          ? backendResult.granuleMetrics.granuleCount
          : typeof backendResult?.granuleMetrics?.granule_count === 'number'
          ? backendResult.granuleMetrics.granule_count
          : undefined;

      const normalizedGranuleDensity =
        typeof backendResult?.granuleDensity === 'number'
          ? backendResult.granuleDensity
          : typeof backendResult?.granule_density === 'number'
          ? backendResult.granule_density
          : typeof backendResult?.granuleMetrics?.granuleDensity === 'number'
          ? backendResult.granuleMetrics.granuleDensity
          : typeof backendResult?.granuleMetrics?.granule_density === 'number'
          ? backendResult.granuleMetrics.granule_density
          : undefined;

      const normalizedRainfall =
        typeof backendResult?.weather?.rainfallMm === 'number'
          ? backendResult.weather.rainfallMm
          : typeof backendResult?.weather?.rainfall_mm === 'number'
          ? backendResult.weather.rainfall_mm
          : undefined;

      const normalizedResult = {
        ...backendResult,
        jobId: nextJobId,
        gsm: normalizedGsm,
        granuleCount: normalizedGranuleCount,
        granuleDensity: normalizedGranuleDensity,
        weather: {
          ...backendResult?.weather,
          ...(typeof normalizedRainfall === 'number' ? { rainfallMm: normalizedRainfall } : {}),
        },
        depthCm: depthNumber,
        imageCount: files.length,
      };

      setCurrentJob({
        jobId: nextJobId,
        status: 'processing',
        progress: 85,
        stage: 'suitability',
      });
      
      setCurrentJob({
        jobId: nextJobId,
        status: 'completed',
        progress: 100,
        stage: 'completed',
        depthCm: depthNumber,
        imageCount: files.length,
      });

      setSoilResult(normalizedResult);
      addToHistory(normalizedResult);
      
      setIsProcessing(false);
      navigate(`/result/${nextJobId}`);
    } catch (err) {
      if (isGeolocationError(err)) {
        setError(getGeolocationErrorMessage(err));
        return;
      }

      if (import.meta.env.DEV && axios.isAxiosError(err) && !err.response) {
        const fallbackResult = buildLocalFallbackResult({
          depthNumber,
          fileCount: files.length,
          latitude: location?.lat ?? 0,
          longitude: location?.lon ?? 0,
          weatherSnapshot: weather,
        });

        setCurrentJob({
          jobId: fallbackResult.jobId,
          status: 'completed',
          progress: 100,
          stage: 'completed',
          depthCm: depthNumber,
          imageCount: files.length,
        });
        setSoilResult(fallbackResult);
        addToHistory(fallbackResult);
        setError(null);
        navigate(`/result/${fallbackResult.jobId}`);
        return;
      }

      setCurrentJob({ status: 'failed' });
      setError(getApiErrorMessage(err));
      console.error(err);
    } finally {
      setIsLocating(false);
      setIsFetchingWeather(false);
      setIsUploading(false);
    }
  };

  const handleUseLocation = async () => {
    setError(null);
    setIsLocating(true);
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setLocation({ lat, lon });

      setIsFetchingWeather(true);
      try {
        const weatherSnapshot = await fetchWeatherByLocation(lat, lon);
        setWeather(weatherSnapshot);
      } catch (weatherError) {
        console.error(weatherError);
        setWeather(null);
        setError(t('upload.weather_failed'));
      } finally {
        setIsFetchingWeather(false);
      }
    } catch (err) {
      setError(getGeolocationErrorMessage(err));
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {isCameraOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xl glass rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{t('upload.camera_title')}</h3>
              <button
                type="button"
                onClick={closeCamera}
                className="p-2 rounded-lg hover:bg-black/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-4">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            </div>

            {cameraError && (
              <p className="text-sm text-red-500 mb-3">{cameraError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={captureFromCamera}
                className="flex-1 bg-agri-green text-white px-5 py-2.5 rounded-xl font-medium hover:bg-agri-green/90 transition-all inline-flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{t('upload.capture_photo')}</span>
              </button>
              <button
                type="button"
                onClick={closeCamera}
                className="flex-1 px-5 py-2.5 rounded-xl border border-earth-200 dark:border-zinc-800 hover:bg-earth-100 dark:hover:bg-zinc-800 transition-all"
              >
                {t('upload.cancel_camera')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {previews.length === 0 ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => galleryInputRef.current?.click()}
            className="glass border-2 border-dashed border-agri-green/30 rounded-3xl p-12 text-center cursor-pointer hover:border-agri-green/60 transition-all group"
          >
            <div className="w-20 h-20 bg-agri-green/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-agri-green" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">
              {t('dashboard.upload_title')}
            </h3>
            <p className="text-earth-600 dark:text-zinc-400 mb-4">
              {t('dashboard.upload_desc')}
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-earth-500">
              <span className="flex items-center space-x-1">
                <ImageIcon className="w-4 h-4" />
                <span>{t('upload.file_types')}</span>
              </span>
              <span>•</span>
              <span>{t('upload.max_size')}</span>
            </div>
            <p className="text-xs text-earth-500 mt-3">{t('upload.max_photos_limit')}</p>
            <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  galleryInputRef.current?.click();
                }}
                className="px-5 py-2.5 rounded-xl border border-earth-200 dark:border-zinc-800 hover:bg-earth-100 dark:hover:bg-zinc-800 transition-all"
              >
                {t('upload.choose_photos')}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openCamera();
                }}
                className="px-5 py-2.5 rounded-xl bg-agri-green text-white font-medium hover:bg-agri-green/90 transition-all inline-flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{t('upload.use_camera')}</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl overflow-hidden relative"
          >
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                {previews.map((src, index) => (
                  <div key={index} className="relative rounded-2xl overflow-hidden border border-earth-200 dark:border-zinc-800">
                    <img
                      src={src}
                      alt={`Soil preview ${index + 1}`}
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-earth-100 dark:border-zinc-800 text-center space-y-4">
                <h3 className="text-xl font-bold">{t('upload.ready')}</h3>
                <p className="text-sm text-earth-500 dark:text-zinc-400">
                  {t('upload.count_label', { count: previews.length })}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-6 py-3 border border-earth-200 dark:border-zinc-800 rounded-xl font-medium hover:bg-earth-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    {t('upload.choose_photos')}
                  </button>
                  {files.length < 4 && (
                    <button
                      onClick={openCamera}
                      className="px-6 py-3 border border-earth-200 dark:border-zinc-800 rounded-xl font-medium hover:bg-earth-100 dark:hover:bg-zinc-800 transition-all inline-flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{t('upload.use_camera')}</span>
                    </button>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={isUploading || isLocating || isFetchingWeather}
                    className="bg-agri-green text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-agri-green/90 transition-all shadow-lg shadow-agri-green/20 disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('upload.getting_location')}</span>
                      </>
                    ) : isFetchingWeather ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('upload.getting_weather')}</span>
                      </>
                    ) : isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('upload.uploading')}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5" />
                        <span>{t('upload.analyze')}</span>
                      </>
                    )}
                  </button>
                </div>
                {files.length >= 4 && (
                  <p className="text-xs text-earth-500 dark:text-zinc-400">{t('upload.max_photos_limit')}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        <label className="block text-sm font-medium text-earth-700 dark:text-zinc-300 mb-2">
          {t('upload.depth_label')}
        </label>
        <input
          type="number"
          min={0}
          step={0.1}
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
          className="w-full px-4 py-3 bg-white/50 dark:bg-zinc-900 border border-earth-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-agri-green outline-none transition-all"
          placeholder={t('upload.depth_placeholder')}
        />
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating || isUploading || isFetchingWeather}
          className="mt-3 px-4 py-2 border border-earth-200 dark:border-zinc-800 rounded-xl font-medium hover:bg-earth-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center space-x-2"
        >
          {isLocating || isFetchingWeather ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isLocating ? t('upload.getting_location') : t('upload.getting_weather')}</span>
            </>
          ) : (
            <>
              <LocateFixed className="w-4 h-4" />
              <span>{t('upload.use_current_location')}</span>
            </>
          )}
        </button>
        {location && (
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-agri-green dark:text-agri-leaf">
              {t('upload.location_selected', {
                lat: location.lat.toFixed(6),
                lon: location.lon.toFixed(6),
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                setLocation(null);
                setWeather(null);
              }}
              className="text-xs font-medium text-earth-600 dark:text-zinc-300 underline hover:text-earth-900 dark:hover:text-zinc-100"
            >
              {t('upload.clear_location')}
            </button>
          </div>
        )}
        {weather && (
          <p className="mt-1 text-sm text-earth-600 dark:text-zinc-300">
            {t('upload.weather_selected', {
              temp: weather.temperatureC.toFixed(1),
              moisture: weather.moisturePct.toFixed(0),
            })}
          </p>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-600 dark:text-red-400"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}
    </div>
  );
};

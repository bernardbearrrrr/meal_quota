"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  authFetch,
  MEAL_TYPE_LABELS,
  parseJsonResponse,
} from "../../lib/api";
import type { MealType } from "../../lib/api";

const FEEDBACK_DURATION_MS = 6000;
const SCANNER_ELEMENT_ID = "qr-reader";
const RESIZE_REINIT_DELAY_MS = 300;

type ScanResult = null | "success" | "error" | "already_claimed";

type ScannerStatus = "idle" | "initializing" | "streaming" | "error";

type EmployeeData = {
  name: string;
  department: string;
};

type QuotaData = {
  claimed_today?: number;
  quota_today?: number;
  remaining?: number;
};

type VerifyResponse = {
  status?: string;
  message?: string;
  employee?: EmployeeData;
  meal_type?: MealType;
  quota?: QuotaData;
};

type CameraErrorType = "permission" | "not-found" | "generic";

function classifyCameraError(error: unknown): { type: CameraErrorType; message: string } {
  const err = error as { name?: string; message?: string };

  if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
    return {
      type: "not-found",
      message:
        "No camera was found on this device. Please connect a camera or use a device with a built-in camera.",
    };
  }

  if (
    err?.name === "NotAllowedError" ||
    err?.name === "PermissionDeniedError" ||
    err?.message?.toLowerCase().includes("permission denied")
  ) {
    return {
      type: "permission",
      message: "Camera access was denied. Click below to request permission from your browser.",
    };
  }

  return {
    type: "generic",
    message: "Unable to access the camera. Please check your device settings and try again.",
  };
}

function waitForVideoStream(container: HTMLElement, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      const video = container.querySelector("video");

      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Video stream failed to attach."));
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

function getCurrentMealType(): MealType {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return "breakfast";
  }

  if (hour >= 11 && hour < 16) {
    return "lunch";
  }

  if (hour >= 16 && hour < 22) {
    return "dinner";
  }

  return "other";
}

function playScanTone(type: "success" | "error") {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = type === "success" ? "sine" : "sawtooth";
    oscillator.frequency.setValueAtTime(type === "success" ? 880 : 140, now);
    oscillator.frequency.exponentialRampToValueAtTime(type === "success" ? 1320 : 90, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === "success" ? 0.16 : 0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Browser autoplay policies can block audio feedback; scanner flow should continue.
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9V5.25A1.5 1.5 0 0 1 5.25 3.75H9m11.25 5.25V5.25a1.5 1.5 0 0 0-1.5-1.5H15m5.25 11.25v3.75a1.5 1.5 0 0 1-1.5 1.5H15M3.75 15v3.75a1.5 1.5 0 0 0 1.5 1.5H9" />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75V7.5A1.5 1.5 0 0 1 7.5 9H3.75m11.25-5.25V7.5A1.5 1.5 0 0 0 16.5 9h3.75M9 20.25V16.5A1.5 1.5 0 0 0 7.5 15H3.75m11.25 5.25V16.5a1.5 1.5 0 0 1 1.5-1.5h3.75" />
    </svg>
  );
}

function ScannerFrame({ isActive }: { isActive: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/30" />
      <div className="relative h-[clamp(280px,76vw,520px)] w-[clamp(280px,76vw,520px)] rounded-4xl border border-white/35 shadow-[0_0_0_999px_rgba(2,6,23,0.28)] sm:h-[clamp(360px,52vw,520px)] sm:w-[clamp(360px,52vw,520px)]">
        <span className="absolute left-0 top-0 h-16 w-16 rounded-tl-4xl border-l-4 border-t-4 border-emerald-400" />
        <span className="absolute right-0 top-0 h-16 w-16 rounded-tr-4xl border-r-4 border-t-4 border-emerald-400" />
        <span className="absolute bottom-0 left-0 h-16 w-16 rounded-bl-4xl border-b-4 border-l-4 border-emerald-400" />
        <span className="absolute bottom-0 right-0 h-16 w-16 rounded-br-4xl border-b-4 border-r-4 border-emerald-400" />
        <div className={`absolute left-8 right-8 top-1/2 h-0.5 bg-emerald-300/90 shadow-[0_0_22px_rgba(52,211,153,0.95)] ${isActive ? "animate-pulse" : ""}`} />
      </div>
    </div>
  );
}

function FeedbackOverlay({
  employeeData,
  errorMessage,
  mealType,
  onReset,
  quotaData,
  scanResult,
}: {
  employeeData: EmployeeData | null;
  errorMessage: string;
  mealType: MealType;
  onReset: () => void;
  quotaData: QuotaData | null;
  scanResult: Exclude<ScanResult, null>;
}) {
  const isSuccess = scanResult === "success";
  const title = isSuccess ? "Scan Approved" : scanResult === "already_claimed" ? "Quota Alert" : "Scan Failed";
  const message = isSuccess
    ? "Quota has been deducted successfully."
    : errorMessage || "Invalid QR Code.";
  const remaining = quotaData?.remaining ?? 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl rounded-4xl p-6 text-center shadow-2xl ring-1 transition-all duration-300 ease-out animate-scale-in ${
          isSuccess
            ? "bg-linear-to-br from-emerald-400 via-emerald-500 to-emerald-700 text-white ring-emerald-200/50"
            : "border border-rose-200 bg-rose-50 text-rose-950 ring-rose-200 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-50 dark:ring-rose-800"
        }`}
      >
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full shadow-xl ${
            isSuccess ? "bg-white/20 text-white ring-8 ring-white/10" : "bg-rose-100 text-rose-600 ring-8 ring-rose-200/70 dark:bg-rose-900 dark:text-rose-200 dark:ring-rose-800/50"
          }`}
        >
          {isSuccess ? (
            <CheckIcon className="h-14 w-14 animate-bounce" />
          ) : (
            <WarningIcon className="h-14 w-14 animate-pulse" />
          )}
        </div>

        <p className={`mt-5 text-sm font-bold uppercase tracking-[0.24em] ${isSuccess ? "text-emerald-50" : "text-rose-500 dark:text-rose-300"}`}>
          {title}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
          {isSuccess ? employeeData?.name ?? "Employee" : message}
        </h2>
        {isSuccess && (
          <>
            <p className="mt-2 text-lg font-semibold text-emerald-50">
              {employeeData?.department ?? "Department"}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/15 p-4 text-left ring-1 ring-white/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">Meal Type</p>
                <p className="mt-1 text-2xl font-black">{MEAL_TYPE_LABELS[mealType]}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 text-left ring-1 ring-white/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">Remaining Quota Today</p>
                <p className="mt-1 text-3xl font-black">{remaining}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-emerald-50">{message}</p>
          </>
        )}
        {!isSuccess && (
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-relaxed text-rose-700 dark:text-rose-200">
            Please verify the employee status, meal window, or remaining daily quota before scanning again.
          </p>
        )}

        <button
          type="button"
          onClick={onReset}
          className={`mt-7 w-full rounded-2xl px-6 py-4 text-lg font-black shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-4 sm:w-auto sm:min-w-56 ${
            isSuccess
              ? "bg-white text-emerald-700 hover:bg-emerald-50 focus:ring-white/40"
              : "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-300 dark:bg-rose-500 dark:hover:bg-rose-400"
          }`}
        >
          {isSuccess ? "Scan Next" : "Try Again"}
        </button>
      </div>
    </div>
  );
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [mealType, setMealType] = useState<MealType>(getCurrentMealType());
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");

  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const containerSizeRef = useRef({ width: 0, height: 0 });
  const handleScanRef = useRef<(decodedText: string) => Promise<void>>(async () => {});

  const clearPendingReset = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const destroyScanner = useCallback(async () => {
    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;

    if (!instance) {
      setIsScanning(false);
      return;
    }

    try {
      if (instance.isScanning) {
        await instance.stop();
      }
    } catch {
      // Scanner may already be stopped.
    }

    try {
      instance.clear();
    } catch {
      // Container may already be cleared.
    }

    setIsScanning(false);
  }, []);

  const initializeScanner = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !mountedRef.current ||
      processingRef.current ||
      initializingRef.current
    ) {
      return;
    }

    const container = qrReaderRef.current;

    if (!container || !container.isConnected) {
      return;
    }

    initializingRef.current = true;
    setScannerStatus("initializing");
    setCameraError(null);
    setCameraErrorType(null);

    await destroyScanner();

    if (!mountedRef.current || !qrReaderRef.current) {
      initializingRef.current = false;
      setScannerStatus("idle");
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!container.id) {
        container.id = SCANNER_ELEMENT_ID;
      }

      const html5QrCode = new Html5Qrcode(container.id);
      html5QrCodeRef.current = html5QrCode;

      const cameras = await Html5Qrcode.getCameras();
      const rearCamera = cameras.find((camera) =>
        camera.label.toLowerCase().includes("back"),
      );
      const cameraConfig = rearCamera?.id ?? cameras[0]?.id ?? { facingMode: "user" as const };

      const minimumQrBoxSize = window.innerWidth < 640 ? 250 : 350;
      const viewportQrBoxSize = Math.min(window.innerWidth * 0.78, window.innerHeight * 0.62);
      const containerQrBoxSize = container.clientWidth > 0 ? container.clientWidth * 0.78 : viewportQrBoxSize;
      const qrBoxSize = Math.round(
        Math.max(minimumQrBoxSize, Math.min(520, containerQrBoxSize, viewportQrBoxSize)),
      );

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: qrBoxSize, height: qrBoxSize },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await handleScanRef.current(decodedText);
        },
        () => {},
      );

      await waitForVideoStream(container);

      if (!mountedRef.current) {
        await destroyScanner();
        return;
      }

      setScannerStatus("streaming");
      setIsScanning(true);
      containerSizeRef.current = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
    } catch (error) {
      await destroyScanner();

      if (!mountedRef.current) {
        return;
      }

      const classified = classifyCameraError(error);
      setCameraErrorType(classified.type);
      setCameraError(classified.message);
      setScannerStatus("error");
    } finally {
      initializingRef.current = false;
    }
  }, [destroyScanner]);

  const resetScannerState = useCallback(async () => {
    clearPendingReset();

    if (!mountedRef.current) {
      return;
    }

    setScanResult(null);
    setEmployeeData(null);
    setMealType(getCurrentMealType());
    setQuotaData(null);
    setErrorMessage("");
    setIsVerifying(false);
    isVerifyingRef.current = false;
    processingRef.current = false;

    const instance = html5QrCodeRef.current;

    if (instance?.isScanning) {
      try {
        instance.resume();
        setScannerStatus("streaming");
        setIsScanning(true);
        return;
      } catch {
        // Fall through to full re-initialization if resume fails.
      }
    }

    await initializeScanner();
  }, [clearPendingReset, initializeScanner]);

  const scheduleScannerReset = useCallback(() => {
    clearPendingReset();

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void resetScannerState();
    }, FEEDBACK_DURATION_MS);
  }, [clearPendingReset, resetScannerState]);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await scannerContainerRef.current?.requestFullscreen();
    } catch {
      setErrorMessage("Fullscreen mode is not available in this browser.");
    }
  }, []);

  const handleScan = useCallback(
    async (decodedText: string) => {
      clearPendingReset();

      if (isVerifyingRef.current) {
        return;
      }

      setScanResult(null);
      setEmployeeData(null);
      setMealType(getCurrentMealType());
      setQuotaData(null);
      setErrorMessage("");

      isVerifyingRef.current = true;
      processingRef.current = true;
      setIsVerifying(true);
      setScannerStatus("idle");

      const instance = html5QrCodeRef.current;

      if (instance?.isScanning) {
        try {
          instance.pause();
          setIsScanning(false);
        } catch {
          // If pause fails, continue processing and reset will reinitialize.
        }
      }

      let feedbackResult: ScanResult = null;

      try {
        const response = await authFetch(`${API_BASE_URL}/meals/verify`, {
          method: "POST",
          body: JSON.stringify({ uid: decodedText.trim() }),
        });

        if (response.status === 401 || response.status === 403) {
          feedbackResult = null;
        } else if (response.status >= 500) {
          setErrorMessage("Server error. Please contact IT.");
          feedbackResult = "error";
          setScanResult("error");
        } else {
          const data = await parseJsonResponse<VerifyResponse>(response);

          if (response.status === 409) {
            setErrorMessage(data?.message ?? "Employee has already claimed their meal today.");
            feedbackResult = "already_claimed";
            setScanResult("already_claimed");
          } else if (response.ok && data?.status === "GRANTED" && data.employee) {
            setEmployeeData(data.employee);
            setMealType(data.meal_type ?? getCurrentMealType());
            setQuotaData(data.quota ?? null);
            feedbackResult = "success";
            setScanResult("success");
          } else {
            setErrorMessage(data?.message ?? "Access denied.");
            feedbackResult = "error";
            setScanResult("error");
          }
        }
      } catch {
        setErrorMessage("Unable to connect to the server. Please check the API.");
        feedbackResult = "error";
        setScanResult("error");
      } finally {
        isVerifyingRef.current = false;
        setIsVerifying(false);
      }

      if (feedbackResult) {
        playScanTone(feedbackResult === "success" ? "success" : "error");
        scheduleScannerReset();
      } else {
        void resetScannerState();
      }
    },
    [clearPendingReset, resetScannerState, scheduleScannerReset],
  );

  handleScanRef.current = handleScan;

  const requestCameraPermission = useCallback(async () => {
    setIsRequestingPermission(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const cameras = await Html5Qrcode.getCameras();

      if (cameras.length === 0) {
        setCameraErrorType("not-found");
        setCameraError(
          "No camera was found on this device. Please connect a camera or use a device with a built-in camera.",
        );
        setScannerStatus("error");
        return;
      }

      processingRef.current = false;
      setCameraError(null);
      setCameraErrorType(null);
      await initializeScanner();
    } catch (error) {
      const classified = classifyCameraError(error);
      setCameraErrorType(classified.type);
      setCameraError(classified.message);
      setScannerStatus("error");
    } finally {
      setIsRequestingPermission(false);
    }
  }, [initializeScanner]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearPendingReset();
      void destroyScanner();
    };
  }, [clearPendingReset, destroyScanner]);

  useEffect(() => {
    if (!cameraError && !scanResult && !isVerifying && !isScanning && !processingRef.current) {
      void initializeScanner();
    }
  }, [cameraError, scanResult, isVerifying, isScanning, initializeScanner]);

  useEffect(() => {
    function handleFullscreenChange() {
      const fullscreenElement = document.fullscreenElement;
      const scannerIsFullscreen = fullscreenElement === scannerContainerRef.current;

      setIsFullscreen(scannerIsFullscreen);
      window.setTimeout(() => {
        if (mountedRef.current && scannerIsFullscreen && !cameraError && !processingRef.current && !scanResult) {
          void initializeScanner();
        }
      }, RESIZE_REINIT_DELAY_MS);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [cameraError, initializeScanner, scanResult]);

  useEffect(() => {
    const container = qrReaderRef.current;

    if (!container) {
      return;
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const observer = new ResizeObserver(() => {
      if (cameraError || processingRef.current || scanResult || !isScanning) {
        return;
      }

      const { width, height } = containerSizeRef.current;
      const widthChanged = Math.abs(container.clientWidth - width) > 24;
      const heightChanged = Math.abs(container.clientHeight - height) > 24;

      if (!widthChanged && !heightChanged) {
        return;
      }

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mountedRef.current && !cameraError && !processingRef.current && !scanResult) {
          void initializeScanner();
        }
      }, RESIZE_REINIT_DELAY_MS);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [cameraError, isScanning, scanResult, initializeScanner]);

  const scannerStatusLabel = isVerifying
    ? "Verifying..."
    : scanResult
      ? "Showing result..."
      : scannerStatus === "initializing"
        ? "Initializing..."
        : scannerStatus === "streaming"
          ? "Ready to scan"
          : scannerStatus === "error"
            ? "Error"
            : "Idle";

  return (
    <div className="flex min-h-full flex-col bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Kantin Scanner</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                QR Meal Verification
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Position the QR code inside the frame. The scanner will validate quota in real time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {scannerStatusLabel}
              </span>
              {scannerStatus === "streaming" && !scanResult && !isVerifying && (
                <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                  Ready
                </span>
              )}
            </div>
          </div>
        </div>

        {isVerifying && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <svg className="h-6 w-6 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-black">Verifying QR Code</p>
              <p className="text-xs font-medium opacity-80">Checking employee quota and current meal window...</p>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-center shadow-sm dark:border-rose-800 dark:bg-rose-950">
            <WarningIcon className="mx-auto h-10 w-10 text-rose-500 dark:text-rose-300" />
            <p className="mt-3 text-base font-black text-rose-800 dark:text-rose-100">{cameraError}</p>
            <div className="mt-4 flex flex-col items-center gap-3">
              {cameraErrorType === "permission" && (
                <button
                  type="button"
                  onClick={() => void requestCameraPermission()}
                  disabled={isRequestingPermission}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800"
                >
                  {isRequestingPermission ? "Requesting..." : "Request Permission"}
                </button>
              )}
              {cameraErrorType !== "permission" && (
                <button
                  type="button"
                  onClick={() => {
                    processingRef.current = false;
                    setCameraError(null);
                    setCameraErrorType(null);
                    setScannerStatus("idle");
                    void initializeScanner();
                  }}
                  className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-black text-white shadow-lg transition-colors hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400"
                >
                  Back to Scanner
                </button>
              )}
            </div>
          </div>
        )}

        <div
          ref={scannerContainerRef}
          className={`relative flex-1 overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 transition-all duration-300 ease-in-out ${
            isFullscreen
              ? "h-screen w-screen rounded-none border-0"
              : "rounded-4xl border border-slate-800"
          }`}
        >
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 bg-linear-to-b from-black/75 to-transparent px-5 py-4 text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Live Camera</p>
              <p className="text-sm font-semibold text-white/80">Keep QR code centered inside the frame</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                {MEAL_TYPE_LABELS[mealType]}
              </span>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? "Exit fullscreen scanner" : "Open fullscreen scanner"}
                className="rounded-full bg-black/40 p-2 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {isFullscreen ? (
                  <MinimizeIcon className="h-5 w-5 shrink-0" />
                ) : (
                  <MaximizeIcon className="h-5 w-5 shrink-0" />
                )}
              </button>
            </div>
          </div>

          <div
            ref={qrReaderRef}
            id={SCANNER_ELEMENT_ID}
            className={`block w-full [&>div]:border-0! [&>video]:block [&>video]:w-full [&>video]:object-cover ${
              isFullscreen
                ? "h-screen min-h-screen [&>video]:h-screen [&>video]:min-h-screen"
                : "min-h-[560px] [&>video]:min-h-[560px] sm:min-h-[680px] sm:[&>video]:min-h-[680px]"
            }`}
            style={{ display: "block" }}
          />
          {!scanResult && <ScannerFrame isActive={scannerStatus === "streaming" && !isVerifying} />}
          {scanResult && (
            <FeedbackOverlay
              employeeData={employeeData}
              errorMessage={errorMessage}
              mealType={mealType}
              onReset={() => void resetScannerState()}
              quotaData={quotaData}
              scanResult={scanResult}
            />
          )}
        </div>

        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Use the card action to scan again immediately, or wait for the scanner to resume automatically.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  authFetch,
  parseJsonResponse,
} from "../../lib/api";

const FEEDBACK_DURATION_MS = 2000;
const SCANNER_ELEMENT_ID = "qr-reader";
const RESIZE_REINIT_DELAY_MS = 300;

type ScanResult = null | "success" | "error" | "already_claimed";

type ScannerStatus = "idle" | "initializing" | "streaming" | "error";

type EmployeeData = {
  name: string;
  department: string;
};

type VerifyResponse = {
  status?: string;
  message?: string;
  employee?: EmployeeData;
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

function FeedbackOverlay({
  employeeData,
  errorMessage,
  scanResult,
}: {
  employeeData: EmployeeData | null;
  errorMessage: string;
  scanResult: Exclude<ScanResult, null>;
}) {
  const isSuccess = scanResult === "success";
  const title =
    scanResult === "success"
      ? "SUCCESS"
      : scanResult === "already_claimed"
        ? "ALREADY REDEEMED"
        : "ACCESS DENIED";
  const message =
    scanResult === "success" && employeeData
      ? `${employeeData.name} - ${employeeData.department}`
      : scanResult === "already_claimed"
        ? errorMessage || "Employee has already claimed their meal today."
        : errorMessage || "Access denied.";

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white ${
        isSuccess ? "bg-green-600" : "bg-red-700"
      }`}
    >
      <p className="text-5xl font-black uppercase tracking-wide sm:text-7xl">{title}</p>
      <p className="mt-8 max-w-3xl text-2xl font-semibold leading-snug sm:text-4xl">
        {message}
      </p>
    </div>
  );
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");

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

      const qrBoxSize = Math.min(
        420,
        container.clientWidth > 0 ? container.clientWidth - 32 : 420,
        window.innerWidth - 64,
        window.innerHeight * 0.45,
      );

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: Math.max(qrBoxSize, 200), height: Math.max(qrBoxSize, 200) },
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

  const handleScan = useCallback(
    async (decodedText: string) => {
      clearPendingReset();

      if (isVerifyingRef.current) {
        return;
      }

      setScanResult(null);
      setEmployeeData(null);
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
    <div className="flex flex-1 flex-col bg-slate-950 p-6 lg:p-8">
      <div className="mx-auto flex w-full flex-1 flex-col gap-4 md:w-3/4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-300">
            Scanner Status: <span className="text-emerald-400">{scannerStatusLabel}</span>
          </p>
          {scannerStatus === "streaming" && !scanResult && !isVerifying && (
            <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Ready to scan
            </span>
          )}
        </div>

        {isVerifying && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200">
            <svg className="h-5 w-5 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium">Verifying barcode...</p>
          </div>
        )}

        {cameraError && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/50 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-red-300">{cameraError}</p>
            <div className="mt-4 flex flex-col items-center gap-3">
              {cameraErrorType === "permission" && (
                <button
                  type="button"
                  onClick={() => void requestCameraPermission()}
                  disabled={isRequestingPermission}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800"
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
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  Retry Camera
                </button>
              )}
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-700 bg-black shadow-2xl">
          <div
            ref={qrReaderRef}
            id={SCANNER_ELEMENT_ID}
            className="block w-full min-h-[300px] [&>video]:block [&>video]:min-h-[300px] [&>video]:w-full [&>video]:object-cover"
            style={{ display: "block", minHeight: "300px" }}
          />
          {scanResult && (
            <FeedbackOverlay
              employeeData={employeeData}
              errorMessage={errorMessage}
              scanResult={scanResult}
            />
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          Present barcode to camera — next scan resumes automatically after feedback
        </p>
      </div>
    </div>
  );
}

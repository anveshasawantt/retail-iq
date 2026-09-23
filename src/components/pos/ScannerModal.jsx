import React, { useState, useEffect, useRef } from "react";
import { Camera, X, Scan, AlertCircle, RefreshCw } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export default function ScannerModal({ isOpen, onClose, onScanSuccess }) {
  const { products } = useStore();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize camera stream when modal opens if supported
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } else {
        setCameraError("Camera device access not available on this browser. Use simulated scan below.");
      }
    } catch (err) {
      console.warn("Camera stream error:", err);
      setCameraError("Camera permission was not granted. Quick-scan demo barcodes below.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSimulatedScan = (barcode) => {
    onScanSuccess(barcode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Optical Barcode Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewfinder Box */}
          <div className="relative w-full h-56 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 max-w-xs">{cameraError || "Initializing camera stream..."}</p>
              </div>
            )}

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-28 border-2 border-emerald-500/80 rounded-md relative shadow-lg">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400"></div>
                {/* Horizontal scanning laser line animation */}
                <div className="w-full h-0.5 bg-emerald-400/90 shadow-[0_0_8px_#34d399] absolute top-1/2 -translate-y-1/2"></div>
              </div>
            </div>
          </div>

          {/* Quick Barcode Demo Deck */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Instant Scan Test Barcodes
              </span>
              <span className="text-[11px] text-slate-500">Click any item to scan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {products.slice(0, 6).map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => handleSimulatedScan(prod.barcode)}
                  className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors group"
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-950 truncate">
                      {prod.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      UPC: {prod.barcode}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-800 font-mono flex-shrink-0">
                    {formatINR(prod.sellingPrice)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

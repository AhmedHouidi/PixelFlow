import { useEffect, useState } from 'react';
import imglyRemoveBackground from '@imgly/background-removal';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { AdSlot, canUseFreeBackgroundRemoval, openProCheckout, recordFreeBackgroundRemoval, UsageBadge } from '@/components/monetization/Monetization';
import { Download, Loader2, Sparkles, Crown } from 'lucide-react';

const MAX_FILE_SIZE = 22 * 1024 * 1024;

export default function BackgroundRemovalTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('Please choose an image smaller than 22 MB.');
      return;
    }

    if (currentUrl) URL.revokeObjectURL(currentUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);

    setFiles([file]);
    setCurrentUrl(URL.createObjectURL(file));
    setProcessedBlob(null);
    setProcessedUrl(null);
  };

  const handleClear = () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFiles([]);
    setCurrentUrl(null);
    setProcessedBlob(null);
    setProcessedUrl(null);
  };

  const handleRemoveBackground = async () => {
    const file = files[0];
    if (!file || isProcessing) return;

    if (!canUseFreeBackgroundRemoval()) {
      openProCheckout();
      return;
    }

    setIsProcessing(true);
    setProcessedBlob(null);
    setProcessedUrl(null);

    try {
      // Runs entirely in the user's browser. No remove.bg API, API key, or upload server is used.
      // IMG.LY downloads the model/WASM assets on the first run and caches them for later use.
      const blob = await imglyRemoveBackground(file, {
        output: {
          format: 'image/png',
          quality: 1,
        },
      });

      recordFreeBackgroundRemoval();
      setProcessedBlob(blob);
      setProcessedUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Background removal failed:', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      alert(`Background removal failed: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (processedBlob && files[0]) {
      const originalName = files[0].name.replace(/\.[^/.]+$/, '');
      downloadBlob(processedBlob, `${originalName}_bg_removed.png`);
    }
  };

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [currentUrl, processedUrl]);

  const sidebar = (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
        AI Background Removal
      </h3>

      <div className="flex-1 text-slate-600 dark:text-slate-400">
        <p className="leading-relaxed mb-4">
          Remove the background directly in your browser and download a transparent PNG. Your image is not uploaded to a background-removal API.
        </p>
        <UsageBadge />

        {isProcessing && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Removing background...</span>
            </div>
            <p className="text-xs mt-2 text-blue-600/80 dark:text-blue-300/70">
              The first run may take longer while the AI model is cached.
            </p>
          </div>
        )}
      </div>

      <div className="pt-5 mt-5 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <AdSlot />

        {!processedBlob ? (
          <button
            onClick={handleRemoveBackground}
            disabled={isProcessing || !files[0]}
            className="w-full min-h-14 px-5 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : !canUseFreeBackgroundRemoval() ? (
              <>
                <Crown className="w-5 h-5" />
                Upgrade to Continue
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Remove Background
              </>
            )}
          </button>
        ) : (
          <button
            onClick={downloadResult}
            className="w-full min-h-14 px-5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-5 h-5" />
            Download PNG
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Remove Background"
      description="Remove backgrounds from images instantly."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
      multiple={false}
    >
      <div className="w-full h-full flex flex-col md:flex-row items-center justify-center p-4 gap-10">
        {currentUrl && !processedUrl && (
          <div className="relative w-full max-w-lg">
            <h4 className="mb-3 font-medium text-slate-500">Original</h4>
            <div className="flex items-center justify-center min-h-40">
              <img
                src={currentUrl}
                alt="Original"
                className="max-w-full max-h-[70vh] object-contain shadow-xl rounded-lg border-2 border-gray-200 dark:border-gray-800"
              />
            </div>
          </div>
        )}

        {processedUrl && (
          <>
            <div className="relative w-full max-w-md hidden md:block">
              <h4 className="mb-3 font-medium text-slate-500">Original</h4>
              <img
                src={currentUrl!}
                alt="Original"
                className="max-w-full max-h-[60vh] object-contain rounded-lg border-2 border-gray-200 dark:border-gray-800 opacity-60"
              />
            </div>

            <div className="relative w-full max-w-lg">
              <h4 className="mb-3 font-bold text-green-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Result
              </h4>
              <div className="bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2N89uzZfwY8QFJSEp80A+OIAMh8MAwtMIwgGMaGA4FBEAwwDEj1MBgAAH3pEwu8s3xRAAAAAElFTkSuQmCC')] rounded-lg border-2 border-green-500 overflow-hidden flex items-center justify-center min-h-40">
                <img
                  src={processedUrl}
                  alt="Background removed result"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

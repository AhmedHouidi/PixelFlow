import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { Download, Ghost, Loader2, Sparkles } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

export default function BackgroundRemovalTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setCurrentUrl(URL.createObjectURL(file));
    setProcessedBlob(null);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessedUrl(null);
  };

  const handleClear = () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFiles([]);
    setCurrentUrl(null);
    setProcessedBlob(null);
    setProcessedUrl(null);
    setProgress(0);
  };

  const handleRemoveBackground = async () => {
    if (!files[0]) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      const publicPath = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/+$/, '')}/imgly/`;
      const blob = await removeBackground(files[0], {
        publicPath,
        progress: (key: string, current: number, total: number) => {
          const p = Math.round((current / total) * 100);
          setProgress(p > 100 ? 100 : p);
        }
      });
      setProcessedBlob(blob);
      setProcessedUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
      alert("Failed to remove background. Ensure the image is valid and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (processedBlob && files[0]) {
      const originalName = files[0].name.split('.')[0];
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
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">AI Background Removal</h3>
      
      <div className="space-y-6 flex-1 text-slate-600 dark:text-slate-400">
        <p className="leading-relaxed">
          Remove the background from your image instantly using on-device AI. 
          Your image never leaves your browser, ensuring 100% privacy and blazing-fast processing.
        </p>
        
        {isProcessing && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex justify-between text-sm mb-2 font-medium text-blue-700 dark:text-blue-300">
              <span>Loading AI Model...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-blue-500 mt-2 opacity-80">This might take a few seconds on the first run as models are downloaded locally.</p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!processedBlob ? (
          <button
            onClick={handleRemoveBackground}
            disabled={isProcessing}
            className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Remove Background</>
            )}
          </button>
        ) : (
          <button
            onClick={downloadResult}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Download className="w-5 h-5" />
            Download PNG (Transparent)
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
      <div className="w-full h-full flex flex-col md:flex-row items-center justify-center p-4 gap-8">
        {currentUrl && !processedUrl && (
          <div className="relative w-full max-w-lg">
            <h4 className="absolute -top-8 left-0 font-medium text-slate-500">Original</h4>
            <img 
              src={currentUrl} 
              alt="Original" 
              className="max-w-full max-h-[70vh] object-contain shadow-xl rounded-lg border-2 border-gray-200 dark:border-gray-800"
            />
          </div>
        )}

        {processedUrl && (
          <>
            <div className="relative w-full max-w-md hidden md:block">
              <h4 className="absolute -top-8 left-0 font-medium text-slate-500">Original</h4>
              <img 
                src={currentUrl!} 
                alt="Original" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg border-2 border-gray-200 dark:border-gray-800 opacity-50"
              />
            </div>
            
            <div className="relative w-full max-w-lg">
              <h4 className="absolute -top-8 left-0 font-medium text-green-500 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Result
              </h4>
              <div className="bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2N89uzZfwY8QFJSEp80A+OIAMh8MAwtMIwgGMaGA4FBEAwwDEj1MBgAAH3pEwu8s3xRAAAAAElFTkSuQmCC')] rounded-lg border-2 border-green-500 shadow-2xl shadow-green-500/20 overflow-hidden">
                <img 
                  src={processedUrl} 
                  alt="Result" 
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

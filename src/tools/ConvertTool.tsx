import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { formatBytes, downloadBlob } from '@/lib/utils';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';

type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

interface ConvertedImage {
  original: File;
  converted: Blob | null;
  status: 'pending' | 'converting' | 'done' | 'error';
  originalUrl: string;
}

export default function ConvertTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [targetFormat, setTargetFormat] = useState<OutputFormat>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setImages(selectedFiles.map(f => ({
      original: f,
      converted: null,
      status: 'pending',
      originalUrl: URL.createObjectURL(f),
    })));
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalUrl));
    setFiles([]);
    setImages([]);
  };

  const convertImage = (file: File, format: OutputFormat, url: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx not found'));
        
        // If converting to JPEG, fill background with white first (in case of transparent PNGs)
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Conversion failed'));
        }, format, 0.92); // 0.92 quality default
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const processImages = async () => {
    setIsProcessing(true);
    
    const newImages = [...images];
    for (let i = 0; i < newImages.length; i++) {
      if (newImages[i].status === 'done' && newImages[i].converted?.type === targetFormat) continue;
      
      newImages[i].status = 'converting';
      setImages([...newImages]);

      try {
        const convertedBlob = await convertImage(newImages[i].original, targetFormat, newImages[i].originalUrl);
        newImages[i].converted = convertedBlob;
        newImages[i].status = 'done';
      } catch (error) {
        console.error(error);
        newImages[i].status = 'error';
      }
      setImages([...newImages]);
    }
    setIsProcessing(false);
  };

  const downloadAll = async () => {
    const doneImages = images.filter(img => img.status === 'done' && img.converted);
    
    const getExt = (mime: string) => {
      const parts = mime.split('/');
      return parts[1] === 'jpeg' ? 'jpg' : parts[1];
    };

    if (doneImages.length === 1) {
      const originalName = doneImages[0].original.name.split('.')[0];
      downloadBlob(doneImages[0].converted!, `${originalName}.${getExt(targetFormat)}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        const originalName = img.original.name.split('.')[0];
        zip.file(`${originalName}.${getExt(targetFormat)}`, img.converted!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "converted_images.zip");
    }
  };

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.originalUrl));
    };
  }, []);

  const allDone = images.length > 0 && images.every(img => img.status === 'done' || img.status === 'error');

  const sidebar = (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Convert Options</h3>
      
      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Convert to:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'image/jpeg', label: 'JPG' },
              { id: 'image/png', label: 'PNG' },
              { id: 'image/webp', label: 'WebP' }
            ].map(format => (
              <button
                key={format.id}
                onClick={() => {
                  setTargetFormat(format.id as OutputFormat);
                  // Reset done status so they can reconvert
                  if (allDone) {
                    setImages(images.map(img => ({...img, status: 'pending', converted: null})));
                  }
                }}
                className={`py-3 px-4 rounded-xl font-medium border-2 transition-colors ${
                  targetFormat === format.id 
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'border-gray-200 text-slate-600 hover:border-blue-300 dark:border-gray-700 dark:text-slate-300'
                }`}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={processImages}
            disabled={isProcessing}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Converting...</>
            ) : (
              <><RefreshCw className="w-5 h-5" /> Convert Images</>
            )}
          </button>
        ) : (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Download className="w-5 h-5" />
            Download {images.length > 1 ? 'ZIP' : 'Converted Image'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Convert to JPG/PNG/WebP"
      description="Turn PNG, WebP, SVG or GIF into JPG, or vice versa easily."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
    >
      <div className="w-full h-full overflow-auto p-4 flex flex-col gap-4">
        {images.map((img, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-4xl mx-auto">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-none relative">
              <img src={img.originalUrl} className="w-full h-full object-cover" alt="" />
              {img.status === 'converting' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white truncate">{img.original.name}</p>
                <div className="flex items-center gap-2 text-sm mt-1 text-slate-500">
                  <span className="uppercase">{img.original.type.split('/')[1]}</span>
                  <span>•</span>
                  <span>{formatBytes(img.original.size)}</span>
                </div>
              </div>
              
              {img.status === 'done' && (
                <div className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Ready
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}

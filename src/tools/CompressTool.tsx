import { useState, useCallback, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import imageCompression from 'browser-image-compression';
import { formatBytes, downloadBlob } from '@/lib/utils';
import { Download, Loader2, ArrowRight } from 'lucide-react';
import JSZip from 'jszip';

interface CompressedImage {
  original: File;
  compressed: File | null;
  status: 'pending' | 'compressing' | 'done' | 'error';
  originalUrl: string;
  compressedUrl: string | null;
}

export default function CompressTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setImages(selectedFiles.map(f => ({
      original: f,
      compressed: null,
      status: 'pending',
      originalUrl: URL.createObjectURL(f),
      compressedUrl: null
    })));
  };

  const handleClear = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.originalUrl);
      if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
    });
    setFiles([]);
    setImages([]);
  };

  const compressImages = async () => {
    setIsProcessing(true);
    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      initialQuality: quality
    };

    const newImages = [...images];
    for (let i = 0; i < newImages.length; i++) {
      if (newImages[i].status === 'done') continue;
      
      newImages[i].status = 'compressing';
      setImages([...newImages]);

      try {
        const compressedFile = await imageCompression(newImages[i].original, options);
        newImages[i].compressed = compressedFile;
        newImages[i].compressedUrl = URL.createObjectURL(compressedFile);
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
    const doneImages = images.filter(img => img.status === 'done' && img.compressed);
    if (doneImages.length === 1) {
      downloadBlob(doneImages[0].compressed!, `compressed_${doneImages[0].original.name}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        zip.file(`compressed_${img.original.name}`, img.compressed!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "compressed_images.zip");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => {
        URL.revokeObjectURL(img.originalUrl);
        if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
      });
    };
  }, []);

  const totalOriginalSize = images.reduce((acc, img) => acc + img.original.size, 0);
  const totalCompressedSize = images.reduce((acc, img) => acc + (img.compressed?.size || 0), 0);
  const savedPercent = totalCompressedSize ? Math.round((1 - (totalCompressedSize / totalOriginalSize)) * 100) : 0;
  
  const allDone = images.length > 0 && images.every(img => img.status === 'done' || img.status === 'error');

  const sidebar = (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Compression Settings</h3>
      
      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Quality: {Math.round(quality * 100)}%
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500 mt-2">Lower quality means smaller file size.</p>
        </div>

        {allDone && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Compression Complete</h4>
            <div className="space-y-1 text-sm text-green-700 dark:text-green-400">
              <div className="flex justify-between"><span>Original:</span> <span className="font-medium">{formatBytes(totalOriginalSize)}</span></div>
              <div className="flex justify-between"><span>Compressed:</span> <span className="font-medium">{formatBytes(totalCompressedSize)}</span></div>
              <div className="flex justify-between mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                <span className="font-bold">You saved:</span> 
                <span className="font-bold">{savedPercent}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={compressImages}
            disabled={isProcessing}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Compressing...</>
            ) : (
              'Compress Images'
            )}
          </button>
        ) : (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Download className="w-5 h-5" />
            Download {images.length > 1 ? 'ZIP' : 'Image'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Compress Image"
      description="Compress JPG, PNG, SVG or GIF with the best quality and compression."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
    >
      <div className="w-full h-full overflow-auto p-4 flex flex-col gap-4">
        {images.map((img, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-4xl mx-auto">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-none relative">
              <img src={img.originalUrl} className="w-full h-full object-cover" alt="" />
              {img.status === 'compressing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{img.original.name}</p>
              
              <div className="flex items-center gap-4 text-sm mt-2 text-slate-500">
                <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {formatBytes(img.original.size)}
                </span>
                
                {img.compressed && (
                  <>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded font-medium">
                      {formatBytes(img.compressed.size)}
                    </span>
                    <span className="text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/10 px-2 py-1 rounded-full">
                      -{Math.round((1 - (img.compressed.size / img.original.size)) * 100)}%
                    </span>
                  </>
                )}
                
                {img.status === 'error' && (
                  <span className="text-red-500">Error compressing</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}

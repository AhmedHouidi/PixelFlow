import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { Download, Loader2, RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react';
import JSZip from 'jszip';

interface RotatedImage {
  original: File;
  processed: Blob | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  originalUrl: string;
}

export default function RotateTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<RotatedImage[]>([]);
  
  const [rotation, setRotation] = useState(0); // degrees
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setImages(selectedFiles.map(f => ({
      original: f,
      processed: null,
      status: 'pending',
      originalUrl: URL.createObjectURL(f),
    })));
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalUrl));
    setFiles([]);
    setImages([]);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Reset status if settings change
  useEffect(() => {
    if (images.some(img => img.status === 'done')) {
      setImages(images.map(img => ({...img, status: 'pending', processed: null})));
    }
  }, [rotation, flipH, flipV]);

  const processImage = (file: File, url: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx not found'));
        
        // Calculate new dimensions based on rotation
        const isRotated = (rotation % 180) !== 0;
        canvas.width = isRotated ? img.height : img.width;
        canvas.height = isRotated ? img.width : img.height;
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Process failed'));
        }, file.type, 0.95);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const applyChanges = async () => {
    setIsProcessing(true);
    
    const newImages = [...images];
    for (let i = 0; i < newImages.length; i++) {
      if (newImages[i].status === 'done') continue;
      
      newImages[i].status = 'processing';
      setImages([...newImages]);

      try {
        const processedBlob = await processImage(newImages[i].original, newImages[i].originalUrl);
        newImages[i].processed = processedBlob;
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
    const doneImages = images.filter(img => img.status === 'done' && img.processed);
    
    if (doneImages.length === 1) {
      downloadBlob(doneImages[0].processed!, `rotated_${doneImages[0].original.name}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        zip.file(`rotated_${img.original.name}`, img.processed!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "rotated_images.zip");
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
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Rotate & Flip</h3>
      
      <div className="space-y-8 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Rotate
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setRotation(r => r - 90)}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Left</span>
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <RotateCw className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Right</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Flip
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setFlipH(!flipH)}
              className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border-2 ${flipH ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-transparent bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
            >
              <FlipHorizontal className="w-5 h-5" />
              <span className="text-xs font-medium">Horizontally</span>
            </button>
            <button
              onClick={() => setFlipV(!flipV)}
              className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border-2 ${flipV ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-transparent bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
            >
              <FlipVertical className="w-5 h-5" />
              <span className="text-xs font-medium">Vertically</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={applyChanges}
            disabled={isProcessing || (rotation % 360 === 0 && !flipH && !flipV)}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              'Apply Changes'
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

  const previewStyle = {
    transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
    transition: 'transform 0.3s ease-in-out'
  };

  return (
    <ToolLayout
      title="Rotate & Flip Image"
      description="Rotate multiple images simultaneously."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
    >
      <div className="w-full h-full overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-content-start">
        {images.map((img, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex-1 min-h-[200px] flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-950 rounded-lg p-2 relative">
              <img 
                src={img.originalUrl} 
                style={previewStyle}
                className="max-w-full max-h-[200px] object-contain" 
                alt="" 
              />
              {img.status === 'processing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              {img.status === 'done' && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                  Ready
                </div>
              )}
            </div>
            <p className="font-medium text-slate-900 dark:text-white truncate mt-3 text-center text-sm">{img.original.name}</p>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}

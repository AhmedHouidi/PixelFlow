import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { formatBytes, downloadBlob } from '@/lib/utils';
import { Download, Loader2, Maximize } from 'lucide-react';
import JSZip from 'jszip';

interface ResizedImage {
  original: File;
  resized: Blob | null;
  status: 'pending' | 'resizing' | 'done' | 'error';
  originalUrl: string;
  width: number;
  height: number;
}

export default function ResizeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<ResizedImage[]>([]);
  
  const [resizeMode, setResizeMode] = useState<'pixels' | 'percentage'>('percentage');
  const [percentage, setPercentage] = useState(50);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [maintainRatio, setMaintainRatio] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    // We need to load original dimensions
    const newImages = selectedFiles.map(f => ({
      original: f,
      resized: null,
      status: 'pending' as const,
      originalUrl: URL.createObjectURL(f),
      width: 0,
      height: 0
    }));
    
    setImages(newImages);

    // Get dimensions async
    newImages.forEach((img, i) => {
      const imageElement = new Image();
      imageElement.onload = () => {
        setImages(prev => {
          const next = [...prev];
          if(next[i]) {
            next[i].width = imageElement.width;
            next[i].height = imageElement.height;
            // Set initial inputs based on first image
            if (i === 0) {
              setWidth(Math.round(imageElement.width * (percentage/100)));
              setHeight(Math.round(imageElement.height * (percentage/100)));
            }
          }
          return next;
        });
      };
      imageElement.src = img.originalUrl;
    });
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalUrl));
    setFiles([]);
    setImages([]);
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainRatio && images.length > 0 && images[0].width > 0) {
      const ratio = images[0].height / images[0].width;
      setHeight(Math.round(val * ratio));
    }
    resetDoneStatus();
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainRatio && images.length > 0 && images[0].height > 0) {
      const ratio = images[0].width / images[0].height;
      setWidth(Math.round(val * ratio));
    }
    resetDoneStatus();
  };

  const resetDoneStatus = () => {
    if (images.some(img => img.status === 'done')) {
      setImages(images.map(img => ({...img, status: 'pending', resized: null})));
    }
  }

  useEffect(() => {
    if (resizeMode === 'percentage' && images.length > 0 && images[0].width > 0) {
      setWidth(Math.round(images[0].width * (percentage/100)));
      setHeight(Math.round(images[0].height * (percentage/100)));
    }
    resetDoneStatus();
  }, [percentage, resizeMode]);

  const resizeImage = (file: File, imgMeta: ResizedImage): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        let targetW = width;
        let targetH = height;
        
        if (resizeMode === 'percentage') {
          targetW = Math.round(img.width * (percentage / 100));
          targetH = Math.round(img.height * (percentage / 100));
        } else if (maintainRatio && files.length > 1) {
          // If multiple files and maintaining ratio based on dimensions, we scale based on bounding box
          const ratio = Math.min(width / img.width, height / img.height);
          targetW = Math.round(img.width * ratio);
          targetH = Math.round(img.height * ratio);
        }

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx not found'));
        
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Resize failed'));
        }, file.type, 0.95);
      };
      img.onerror = reject;
      img.src = imgMeta.originalUrl;
    });
  };

  const processImages = async () => {
    setIsProcessing(true);
    
    const newImages = [...images];
    for (let i = 0; i < newImages.length; i++) {
      if (newImages[i].status === 'done') continue;
      
      newImages[i].status = 'resizing';
      setImages([...newImages]);

      try {
        const resizedBlob = await resizeImage(newImages[i].original, newImages[i]);
        newImages[i].resized = resizedBlob;
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
    const doneImages = images.filter(img => img.status === 'done' && img.resized);
    
    if (doneImages.length === 1) {
      downloadBlob(doneImages[0].resized!, `resized_${doneImages[0].original.name}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        zip.file(`resized_${img.original.name}`, img.resized!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "resized_images.zip");
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
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Resize Options</h3>
      
      <div className="space-y-6 flex-1">
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${resizeMode === 'percentage' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setResizeMode('percentage')}
          >
            By Percentage
          </button>
          <button 
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${resizeMode === 'pixels' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setResizeMode('pixels')}
          >
            By Pixels
          </button>
        </div>

        {resizeMode === 'percentage' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Scale: {percentage}%
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => setPercentage(pct)}
                  className={`py-2 rounded-lg border text-sm font-medium ${percentage === pct ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <input 
              type="range" min="10" max="200" step="5" 
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Width (px)</label>
                <input 
                  type="number" 
                  value={width} 
                  onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Height (px)</label>
                <input 
                  type="number" 
                  value={height} 
                  onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={maintainRatio} 
                onChange={(e) => setMaintainRatio(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Maintain aspect ratio</span>
            </label>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={processImages}
            disabled={isProcessing}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Resizing...</>
            ) : (
              <><Maximize className="w-5 h-5" /> Resize Images</>
            )}
          </button>
        ) : (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Download className="w-5 h-5" />
            Download {images.length > 1 ? 'ZIP' : 'Resized Image'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Resize Image"
      description="Resize images by defining new pixels or percentages."
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
              {img.status === 'resizing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white truncate">{img.original.name}</p>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm mt-1 text-slate-500">
                  <span>{img.width} × {img.height} px</span>
                  
                  {img.status === 'done' && img.resized && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 hidden md:inline">→</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                        New size: {resizeMode === 'percentage' 
                          ? `${Math.round(img.width * (percentage/100))} × ${Math.round(img.height * (percentage/100))} px`
                          : (maintainRatio && images.length > 1 
                              ? `${Math.round(img.width * Math.min(width/img.width, height/img.height))} × ${Math.round(img.height * Math.min(width/img.width, height/img.height))} px` 
                              : `${width} × ${height} px`)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}

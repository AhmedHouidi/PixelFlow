import { useState, useEffect, useRef } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { Download, Type, Image as ImageIcon } from 'lucide-react';
import JSZip from 'jszip';

interface WatermarkedImage {
  original: File;
  processed: Blob | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  originalUrl: string;
}

export default function WatermarkTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<WatermarkedImage[]>([]);
  
  const [text, setText] = useState('Confidential');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(50);
  const [color, setColor] = useState('#ffffff');
  const [position, setPosition] = useState<'center' | 'bottom-right' | 'top-left'>('center');
  
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
  };

  useEffect(() => {
    if (images.some(img => img.status === 'done')) {
      setImages(images.map(img => ({...img, status: 'pending', processed: null})));
    }
  }, [text, fontSize, opacity, color, position]);

  const processImage = (file: File, url: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx not found'));
        
        ctx.drawImage(img, 0, 0);
        
        // Draw Text Watermark
        ctx.globalAlpha = opacity / 100;
        ctx.fillStyle = color;
        // Scale font size relative to image width for consistency
        const scaledFontSize = Math.max(12, Math.floor(canvas.width * (fontSize / 1000)));
        ctx.font = `bold ${scaledFontSize}px sans-serif`;
        
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = scaledFontSize;

        let x = 0;
        let y = 0;
        const padding = canvas.width * 0.05;

        if (position === 'center') {
          x = (canvas.width - textWidth) / 2;
          y = (canvas.height + textHeight) / 2;
        } else if (position === 'bottom-right') {
          x = canvas.width - textWidth - padding;
          y = canvas.height - padding;
        } else if (position === 'top-left') {
          x = padding;
          y = padding + textHeight;
        }

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = scaledFontSize * 0.2;
        ctx.shadowOffsetX = scaledFontSize * 0.1;
        ctx.shadowOffsetY = scaledFontSize * 0.1;
        
        ctx.fillText(text, x, y);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Process failed'));
        }, file.type, 0.95);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const applyWatermark = async () => {
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
      downloadBlob(doneImages[0].processed!, `watermarked_${doneImages[0].original.name}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        zip.file(`watermarked_${img.original.name}`, img.processed!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "watermarked_images.zip");
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
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Text Watermark</h3>
      
      <div className="space-y-6 flex-1 pr-2 overflow-auto">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Text</label>
          <input 
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter watermark text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Position</label>
          <select 
            value={position} 
            onChange={(e) => setPosition(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="center">Center</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="top-left">Top Left</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Size</label>
            <span className="text-sm text-slate-500 font-mono">{fontSize}</span>
          </div>
          <input 
            type="range" min="10" max="200" 
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Opacity</label>
            <span className="text-sm text-slate-500 font-mono">{opacity}%</span>
          </div>
          <input 
            type="range" min="10" max="100" 
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
            />
            <span className="text-sm font-mono text-slate-500 uppercase">{color}</span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={applyWatermark}
            disabled={isProcessing || !text}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Apply Watermark'}
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
      title="Watermark Image"
      description="Stamp text over your images."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
    >
      <div className="w-full h-full overflow-auto p-4 flex flex-col gap-6 items-center">
        {images.map((img, i) => (
          <div key={i} className="relative bg-white dark:bg-slate-900 rounded-xl p-2 shadow-sm border border-gray-200 dark:border-gray-800 inline-block">
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={img.status === 'done' && img.processed ? URL.createObjectURL(img.processed) : img.originalUrl} 
                className="max-w-full max-h-[60vh] object-contain" 
                alt="" 
              />
              
              {/* Fake preview overlay if not processed */}
              {img.status !== 'done' && (
                <div 
                  className="absolute inset-0 pointer-events-none flex"
                  style={{
                    alignItems: position === 'top-left' ? 'flex-start' : position === 'bottom-right' ? 'flex-end' : 'center',
                    justifyContent: position === 'top-left' ? 'flex-start' : position === 'bottom-right' ? 'flex-end' : 'center',
                    padding: '5%'
                  }}
                >
                  <span 
                    style={{ 
                      color: color, 
                      opacity: opacity / 100,
                      fontSize: `${Math.max(12, fontSize)}px`,
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                      lineHeight: 1
                    }}
                  >
                    {text}
                  </span>
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

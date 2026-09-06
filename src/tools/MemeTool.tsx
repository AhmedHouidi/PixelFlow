import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { Download, Smile } from 'lucide-react';
import JSZip from 'jszip';

interface MemeImage {
  original: File;
  processed: Blob | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  originalUrl: string;
}

export default function MemeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<MemeImage[]>([]);
  
  const [topText, setTopText] = useState('TOP TEXT');
  const [bottomText, setBottomText] = useState('BOTTOM TEXT');
  const [fontSize, setFontSize] = useState(100); // Percentage relative to width
  
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
  }, [topText, bottomText, fontSize]);

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
        
        // Setup Meme Text Style
        const calculatedFontSize = Math.floor(canvas.width * (fontSize / 1000));
        ctx.font = `bold ${calculatedFontSize}px Impact, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = Math.max(2, calculatedFontSize / 15);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const drawText = (text: string, yPos: number, isBottom: boolean) => {
          if (!text) return;
          const words = text.toUpperCase().split(' ');
          let line = '';
          const lines = [];
          const maxWidth = canvas.width * 0.9;
          
          for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
              lines.push(line);
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line);
          
          let y = yPos;
          if (isBottom) {
             y = canvas.height - (lines.length * calculatedFontSize * 1.2) - (canvas.height * 0.02);
          }
          
          lines.forEach(line => {
            ctx.strokeText(line, canvas.width / 2, y);
            ctx.fillText(line, canvas.width / 2, y);
            y += calculatedFontSize * 1.2;
          });
        }

        drawText(topText, canvas.height * 0.02, false);
        drawText(bottomText, 0, true);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Process failed'));
        }, file.type, 0.95);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const applyMeme = async () => {
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
      downloadBlob(doneImages[0].processed!, `meme_${doneImages[0].original.name}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        zip.file(`meme_${img.original.name}`, img.processed!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "memes.zip");
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
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Meme Maker</h3>
      
      <div className="space-y-6 flex-1 pr-2 overflow-auto">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Top Text</label>
          <textarea 
            value={topText} 
            onChange={(e) => setTopText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none uppercase font-bold"
            placeholder="TOP TEXT"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bottom Text</label>
          <textarea 
            value={bottomText} 
            onChange={(e) => setBottomText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none uppercase font-bold"
            placeholder="BOTTOM TEXT"
            rows={2}
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Text Size</label>
          </div>
          <input 
            type="range" min="50" max="200" 
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full accent-yellow-600"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={applyMeme}
            disabled={isProcessing}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? 'Generating...' : 'Generate Meme'}
          </button>
        ) : (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Download className="w-5 h-5" />
            Download {images.length > 1 ? 'ZIP' : 'Meme'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Meme Maker"
      description="Create memes easily with custom text and images."
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
              
              {img.status !== 'done' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 text-center">
                  <span className="text-white font-black uppercase textShadow block" style={{ fontSize: `${Math.max(16, fontSize/2)}px`, textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
                    {topText}
                  </span>
                  <span className="text-white font-black uppercase textShadow block" style={{ fontSize: `${Math.max(16, fontSize/2)}px`, textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
                    {bottomText}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}

import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { formatBytes, downloadBlob } from '@/lib/utils';
import { Download, Loader2, ShieldCheck, FileType2 } from 'lucide-react';
import JSZip from 'jszip';

interface MetadataImage {
  original: File;
  stripped: Blob | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  originalUrl: string;
}

export default function MetadataTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<MetadataImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setImages(selectedFiles.map(f => ({
      original: f,
      stripped: null,
      status: 'pending',
      originalUrl: URL.createObjectURL(f),
    })));
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalUrl));
    setFiles([]);
    setImages([]);
  };

  // Drawing image to canvas natively strips all EXIF metadata
  const stripMetadata = (file: File, url: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx not found'));
        
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Processing failed'));
        }, file.type, 1);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const processImages = async () => {
    setIsProcessing(true);
    
    const newImages = [...images];
    for (let i = 0; i < newImages.length; i++) {
      if (newImages[i].status === 'done') continue;
      
      newImages[i].status = 'processing';
      setImages([...newImages]);

      try {
        const processedBlob = await stripMetadata(newImages[i].original, newImages[i].originalUrl);
        newImages[i].stripped = processedBlob;
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
    const doneImages = images.filter(img => img.status === 'done' && img.stripped);
    
    if (doneImages.length === 1) {
      downloadBlob(doneImages[0].stripped!, `stripped_${doneImages[0].original.name}`);
    } else if (doneImages.length > 1) {
      const zip = new JSZip();
      doneImages.forEach(img => {
        zip.file(`stripped_${img.original.name}`, img.stripped!);
      });
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "stripped_images.zip");
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
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Metadata Remover</h3>
      
      <div className="space-y-6 flex-1 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
        <p>
          Photos taken with cameras and smartphones contain hidden information called EXIF metadata.
        </p>
        <p>
          This can include:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>GPS Location coordinates</li>
          <li>Date and time the photo was taken</li>
          <li>Camera model and settings</li>
          <li>Device owner information</li>
        </ul>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
          <ShieldCheck className="w-6 h-6 mb-2" />
          <p>
            Clicking the button below will create a clean copy of your images, permanently deleting all hidden EXIF data to protect your privacy before you share them online.
          </p>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!allDone ? (
          <button
            onClick={processImages}
            disabled={isProcessing}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><ShieldCheck className="w-5 h-5" /> Remove Metadata</>
            )}
          </button>
        ) : (
          <button
            onClick={downloadAll}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <Download className="w-5 h-5" />
            Download Cleaned {images.length > 1 ? 'ZIP' : 'Image'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Remove EXIF Metadata"
      description="Protect your privacy by stripping hidden EXIF data from your photos."
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
              {img.status === 'processing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white truncate">{img.original.name}</p>
                <div className="flex items-center gap-2 text-sm mt-1 text-slate-500">
                  <span>{formatBytes(img.original.size)}</span>
                </div>
              </div>
              
              {img.status === 'done' && (
                <div className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Cleaned
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}

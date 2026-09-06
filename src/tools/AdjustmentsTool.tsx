import { useState, useEffect, useRef } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { Download, Sliders, Image as ImageIcon } from 'lucide-react';

export default function AdjustmentsTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  
  const handleFiles = (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setCurrentUrl(URL.createObjectURL(file));
    resetSettings();
  };

  const handleClear = () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    setFiles([]);
    setCurrentUrl(null);
  };

  const resetSettings = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setGrayscale(0);
  };

  const downloadAdjusted = () => {
    if (!imgRef.current || !files[0]) return;
    
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) grayscale(${grayscale}%)`;
    ctx.drawImage(image, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `adjusted_${files[0].name}`);
      }
    }, files[0].type, 1);
  };

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [currentUrl]);

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) grayscale(${grayscale}%)`
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Adjustments</h3>
        <button onClick={resetSettings} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Reset All</button>
      </div>
      
      <div className="space-y-6 flex-1 overflow-auto pr-2">
        <ControlSlider label="Brightness" value={brightness} min={0} max={200} onChange={setBrightness} unit="%" />
        <ControlSlider label="Contrast" value={contrast} min={0} max={200} onChange={setContrast} unit="%" />
        <ControlSlider label="Saturation" value={saturation} min={0} max={200} onChange={setSaturation} unit="%" />
        <ControlSlider label="Grayscale" value={grayscale} min={0} max={100} onChange={setGrayscale} unit="%" />
        <ControlSlider label="Blur" value={blur} min={0} max={20} onChange={setBlur} unit="px" />
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={downloadAdjusted}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
        >
          <Download className="w-5 h-5" />
          Download Image
        </button>
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Image Adjustments"
      description="Adjust brightness, contrast, saturation and more."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
      multiple={false}
    >
      <div className="w-full h-full flex items-center justify-center p-4">
        {currentUrl && (
          <div className="relative">
            {/* Checkerboard background for transparent images */}
            <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2N89uzZfwY8QFJSEp80A+OIAMh8MAwtMIwgGMaGA4FBEAwwDEj1MBgAAH3pEwu8s3xRAAAAAElFTkSuQmCC')] opacity-20 -z-10 rounded-lg" />
            <img 
              ref={imgRef}
              src={currentUrl} 
              style={filterStyle}
              alt="Adjust preview" 
              className="max-w-full max-h-[70vh] object-contain shadow-xl rounded-lg transition-all duration-100"
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

function ControlSlider({ label, value, min, max, onChange, unit }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, unit: string }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <span className="text-sm text-slate-500 font-mono">{value}{unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-teal-600"
      />
    </div>
  )
}

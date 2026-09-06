import { useState, useRef, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { downloadBlob } from '@/lib/utils';
import { Download, Scissors, Check } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function CropTool() {
  const [files, setFiles] = useState<File[]>([]);
  // Crop tool usually works best on one image at a time
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const handleFiles = (selectedFiles: File[]) => {
    // Only take the first file for crop
    const file = selectedFiles[0];
    setFiles([file]);
    setCurrentUrl(URL.createObjectURL(file));
    setCroppedBlob(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleClear = () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    setFiles([]);
    setCurrentUrl(null);
    setCroppedBlob(null);
  };

  const applyCrop = () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (blob) setCroppedBlob(blob);
    }, files[0].type, 1);
  };

  const downloadCropped = () => {
    if (croppedBlob && files[0]) {
      const name = files[0].name;
      downloadBlob(croppedBlob, `cropped_${name}`);
    }
  };

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [currentUrl]);

  const RATIOS = [
    { label: 'Free', value: undefined },
    { label: '1:1 (Square)', value: 1 },
    { label: '16:9', value: 16 / 9 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
    { label: '2:3', value: 2 / 3 },
    { label: '9:16', value: 9 / 16 },
  ];

  const sidebar = (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Crop Options</h3>
      
      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Aspect Ratio:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RATIOS.map((r, i) => (
              <button
                key={i}
                onClick={() => setAspect(r.value)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  aspect === r.value 
                    ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' 
                    : 'border-gray-200 text-slate-600 hover:border-purple-300 dark:border-gray-700 dark:text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {!croppedBlob ? (
          <button
            onClick={applyCrop}
            disabled={!completedCrop?.width || !completedCrop?.height}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Scissors className="w-5 h-5" />
            Crop Image
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-3 text-green-700 dark:text-green-400 font-medium">
              <Check className="w-5 h-5" /> Image Cropped successfully!
            </div>
            <button
              onClick={downloadCropped}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
            >
              <Download className="w-5 h-5" />
              Download Cropped Image
            </button>
            <button
              onClick={() => setCroppedBlob(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
            >
              Edit Crop
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Crop Image"
      description="Crop image to specific ratios or custom dimensions."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
      multiple={false}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        {currentUrl && !croppedBlob && (
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            className="max-w-full max-h-[70vh]"
          >
            <img 
              ref={imgRef}
              src={currentUrl} 
              alt="Crop target" 
              className="max-w-full max-h-[70vh] object-contain shadow-xl"
            />
          </ReactCrop>
        )}

        {croppedBlob && (
          <div className="flex flex-col items-center">
            <h4 className="text-sm font-medium text-slate-500 mb-4">Cropped Preview</h4>
            <img 
              src={URL.createObjectURL(croppedBlob)} 
              alt="Cropped Result" 
              className="max-w-full max-h-[70vh] object-contain shadow-xl border-4 border-white dark:border-slate-800 rounded-lg"
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

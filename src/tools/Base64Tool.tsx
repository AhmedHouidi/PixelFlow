import { useState, useEffect } from 'react';
import ToolLayout from '@/components/layout/ToolLayout';
import { fileToDataUrl } from '@/lib/utils';
import { Copy, Check, Code } from 'lucide-react';

export default function Base64Tool() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const [base64, setBase64] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleFiles = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setCurrentUrl(URL.createObjectURL(file));
    setCopied(false);
    
    try {
      const dataUrl = await fileToDataUrl(file);
      setBase64(dataUrl);
    } catch (e) {
      console.error(e);
      setBase64('Error reading file.');
    }
  };

  const handleClear = () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    setFiles([]);
    setCurrentUrl(null);
    setBase64('');
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(base64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [currentUrl]);

  const sidebar = (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Base64 Options</h3>
      
      <div className="space-y-6 flex-1 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
        <p>
          Convert your image to a Base64 data URI string. This allows you to embed the image directly into HTML, CSS, or JSON without needing external file requests.
        </p>
        <p className="font-semibold text-slate-900 dark:text-white">
          Best for:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Small icons and logos</li>
          <li>Email templates</li>
          <li>Single-file HTML documents</li>
        </ul>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 text-orange-800 dark:text-orange-300">
          <p className="font-medium text-xs">
            Note: Base64 strings are ~33% larger than the original binary file. Not recommended for large photographs.
          </p>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <button
          onClick={copyToClipboard}
          disabled={!base64}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {copied ? (
            <><Check className="w-5 h-5" /> Copied!</>
          ) : (
            <><Copy className="w-5 h-5" /> Copy Base64</>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Image to Base64"
      description="Convert images to Base64 data URI strings."
      onFilesSelected={handleFiles}
      files={files}
      onClear={handleClear}
      sidebar={sidebar}
      multiple={false}
    >
      <div className="w-full h-full flex flex-col md:flex-row gap-6 p-4">
        {currentUrl && (
          <div className="w-full md:w-1/2 flex items-start justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <img 
              src={currentUrl} 
              alt="Preview" 
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        )}
        
        {base64 && (
          <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-950 flex justify-between items-center">
              <span className="font-mono text-xs text-slate-500 font-medium">Data URI String</span>
              <button 
                onClick={copyToClipboard}
                className="text-xs font-bold px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea 
              value={base64}
              readOnly
              className="flex-1 w-full p-4 text-xs font-mono text-slate-600 dark:text-slate-400 bg-transparent resize-none focus:outline-none custom-scrollbar"
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

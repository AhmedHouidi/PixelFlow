import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Download } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { motion } from 'motion/react';

interface ToolLayoutProps {
  title: string;
  description: string;
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onClear: () => void;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  multiple?: boolean;
  accept?: Record<string, string[]>;
}

export default function ToolLayout({ 
  title, 
  description, 
  onFilesSelected, 
  files, 
  onClear, 
  children,
  sidebar,
  multiple = true,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg', '.gif', '.avif']
  }
}: ToolLayoutProps) {
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple,
    accept: accept as any
  } as any);

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-100 dark:bg-slate-950 overflow-hidden w-full">
      
      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center mb-10">
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">{title}</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">{description}</p>
            </div>
            
            <motion.div 
              {...getRootProps()} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "max-w-3xl w-full aspect-video md:aspect-auto md:h-96 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 cursor-pointer transition-colors shadow-sm",
                isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-900/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-10 h-10" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Select Images</p>
              <p className="text-slate-500 dark:text-slate-400">or drop images here</p>
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Topbar for active tool */}
            <div className="h-16 flex-none flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
              <div className="flex flex-col">
                <h2 className="font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
                <span className="text-xs text-slate-500">{files.length} image{files.length !== 1 ? 's' : ''}</span>
              </div>
              
              <button 
                onClick={onClear}
                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Clear all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content / Preview Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* Settings Sidebar */}
      {files.length > 0 && sidebar && (
        <div className="w-full md:w-80 flex-none bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col h-auto md:h-full overflow-hidden shadow-lg z-20">
          <div className="flex-1 overflow-auto p-6">
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

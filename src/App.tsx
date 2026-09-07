import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { Moon, Sun, Home, Image as ImageIcon, FileArchive, Scissors, RefreshCw, Sliders, Droplet, Ghost, FileType2, Smile, Code } from "lucide-react";
import React, { useState, useEffect } from "react";

import HomeRoute from "@/pages/Home";
import ResizeTool from "@/tools/ResizeTool";
import CompressTool from "@/tools/CompressTool";
import CropTool from "@/tools/CropTool";
import ConvertTool from "@/tools/ConvertTool";
import RotateTool from "@/tools/RotateTool";
import AdjustmentsTool from "@/tools/AdjustmentsTool";
import WatermarkTool from "@/tools/WatermarkTool";
import BackgroundRemovalTool from "@/tools/BackgroundRemovalTool";
import MetadataTool from "@/tools/MetadataTool";
import MemeTool from "@/tools/MemeTool";
import Base64Tool from "@/tools/Base64Tool";
import { ProButton, AdSlot } from "@/components/monetization/Monetization";
import { AuthButton } from "@/components/auth/Auth";

const NAV_LINKS = [
  { name: "Resize Image", description: "Resize images by defining new pixels or percentages.", path: "/resize-image", icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { name: "Compress Image", description: "Compress JPG, PNG, SVG or GIF with the best quality and compression.", path: "/compress-image", icon: FileArchive, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
  { name: "Crop Image", description: "Crop images to specific ratios or custom dimensions.", path: "/crop-image", icon: Scissors, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { name: "Convert to JPG", description: "Turn PNG, WebP, AVIF, SVG or GIF into JPG.", path: "/convert-image", icon: RefreshCw, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
  { name: "Rotate Image", description: "Rotate multiple images simultaneously.", path: "/rotate-image", icon: RefreshCw, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  { name: "Adjustments", description: "Adjust brightness, contrast, saturation and more.", path: "/adjust-image", icon: Sliders, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20" },
  { name: "Watermark", description: "Stamp an image or text over your images.", path: "/watermark-image", icon: Droplet, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
  { name: "Remove BG", description: "Remove backgrounds from images instantly.", path: "/remove-background", icon: Ghost, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20" },
  { name: "Metadata", description: "View or remove EXIF data from images.", path: "/metadata", icon: FileType2, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  { name: "Meme Maker", description: "Create memes easily with custom text and images.", path: "/meme-maker", icon: Smile, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  { name: "Base64", description: "Convert images to Base64 strings or vice versa.", path: "/base64", icon: Code, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900/20" },
];

function Layout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <nav className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center"><ImageIcon className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">PixelFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link to="/compress-image" className="hover:text-slate-900 dark:hover:text-white">Compress</Link>
            <Link to="/resize-image" className="hover:text-slate-900 dark:hover:text-white">Resize</Link>
            <Link to="/crop-image" className="hover:text-slate-900 dark:hover:text-white">Crop</Link>
            <Link to="/convert-image" className="hover:text-slate-900 dark:hover:text-white">Convert</Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <AuthButton />
          <ProButton />
          <button onClick={() => setDarkMode((value) => !value)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" aria-label="Toggle dark mode">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>
      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="hidden md:flex w-16 bg-slate-900 flex-col items-center py-6 gap-8 text-slate-400 shrink-0 z-10">
          <Link to="/" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg" title="Home"><Home className="w-6 h-6" /></Link>
          <Link to="/compress-image" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg" title="Compress"><FileArchive className="w-6 h-6" /></Link>
          <Link to="/resize-image" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg" title="Resize"><ImageIcon className="w-6 h-6" /></Link>
          <Link to="/crop-image" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg" title="Crop"><Scissors className="w-6 h-6" /></Link>
        </aside>
        <main className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-950 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-4"><AdSlot /></div>
          {children}
          <div className="max-w-7xl mx-auto px-4 py-6"><AdSlot /></div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomeRoute tools={NAV_LINKS} />} />
          <Route path="/resize-image" element={<ResizeTool />} />
          <Route path="/compress-image" element={<CompressTool />} />
          <Route path="/crop-image" element={<CropTool />} />
          <Route path="/convert-image" element={<ConvertTool />} />
          <Route path="/rotate-image" element={<RotateTool />} />
          <Route path="/adjust-image" element={<AdjustmentsTool />} />
          <Route path="/watermark-image" element={<WatermarkTool />} />
          <Route path="/remove-background" element={<BackgroundRemovalTool />} />
          <Route path="/metadata" element={<MetadataTool />} />
          <Route path="/meme-maker" element={<MemeTool />} />
          <Route path="/base64" element={<Base64Tool />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

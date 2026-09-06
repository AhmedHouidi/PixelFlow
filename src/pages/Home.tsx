import { Link } from "react-router-dom";
import { motion } from "motion/react";

interface Tool {
  name: string;
  description: string;
  path: string;
  icon: any;
  color: string;
  bg: string;
}

export default function Home({ tools }: { tools: Tool[] }) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
          Everything you need to edit images.
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400">
          Fast, secure, and fully running in your browser. No server uploads.
          Resize, compress, crop, and convert images instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.path} to={tool.path}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all h-full"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{tool.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {tool.description}
                </p>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

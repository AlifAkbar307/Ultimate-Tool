import React from "react";
import { motion } from "framer-motion";
import { ToolItem } from "../content/data";

interface ToolPageProps {
  tool: ToolItem;
}

export function ToolPage({ tool }: ToolPageProps) {
  return (
    <motion.div
      key={tool.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto h-full flex flex-col justify-center pb-32"
    >
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#1e1e1e]/5 text-[#1e1e1e]/60 text-xs font-semibold tracking-wider uppercase mb-4">
          Phase 0
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1e1e1e]">
          {tool.label}
        </h1>
        <p className="text-lg md:text-xl text-[#1e1e1e]/70 leading-relaxed font-light">
          {tool.description}
        </p>
        
        <div className="pt-8">
          <button className="h-11 px-6 rounded-md text-[#1e1e1e] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2" style={{ backgroundColor: "var(--hub-accent)" }}>
            Explore {tool.label}
          </button>
        </div>
      </div>
      
      <div className="mt-16 w-full h-48 border border-dashed border-[#1e1e1e]/20 rounded-xl flex items-center justify-center bg-[#1e1e1e]/[0.02]">
        <span className="text-sm font-medium text-[#1e1e1e]/40">Tool interface rendering placeholder</span>
      </div>
    </motion.div>
  );
}

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { navItems, appConfig } from "../content/data";

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen shrink-0 border-r border-[#e5e5e5] bg-white flex flex-col pt-8 pb-4">
      <div className="px-6 mb-10">
        <h1 className="text-xl font-bold tracking-tight text-[#1e1e1e]">
          {appConfig.appName}
        </h1>
        <p className="text-xs text-[#1e1e1e]/60 font-medium tracking-wide mt-1 uppercase">
          {appConfig.tagline}
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.06,
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <Link
                to={item.path}
                className="relative flex items-center h-10 px-3 py-2 text-sm font-medium rounded-md group transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)]"
                style={{
                  color: isActive ? "#1e1e1e" : "#1e1e1e",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 rounded-md shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]"
                    style={{ backgroundColor: "var(--hub-accent)" }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}
                <span className="relative z-10 w-full truncate font-medium">
                  {item.label}
                </span>
                {!isActive && (
                  <span className="absolute inset-0 rounded-md bg-[#1e1e1e]/5 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="px-6 mt-auto">
        <div className="h-8 flex items-center">
          <div className="w-6 h-6 rounded-full bg-[#1e1e1e] flex items-center justify-center text-white text-[10px] font-bold">
            W
          </div>
          <span className="ml-3 text-xs font-medium text-[#1e1e1e]/60">
            Internal Team
          </span>
        </div>
      </div>
    </aside>
  );
}

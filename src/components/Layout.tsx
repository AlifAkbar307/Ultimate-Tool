/**
 * Layout.tsx — App Shell
 * ============================================================
 * Defines the overall page structure:
 *
 *   ┌─────────────────────────────────────┐
 *   │  App title + subtitle               │
 *   │  ┌─────────────────────────────┐    │
 *   │  │  TopNav (horizontal bar)    │    │
 *   │  └─────────────────────────────┘    │
 *   │  ─────────────────────────────────  │
 *   │  Tool page content (Outlet)         │
 *   └─────────────────────────────────────┘
 *
 * To change the max content width, update the `max-w-*` class on the inner wrapper.
 * ============================================================
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { appConfig } from "../content/data";

export function Layout() {
  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* ── App header: title + subtitle ───────────────────────────── */}
      <header className="px-8 pt-10 pb-4 md:px-12 md:pt-12 md:pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#1e1e1e]">
          {appConfig.appName}
        </h1>
        <p className="text-xs font-medium tracking-wide text-[#1e1e1e]/50 uppercase mt-0.5">
          {appConfig.tagline}
        </p>
      </header>

      {/* ── Horizontal navigation bar ──────────────────────────────── */}
      <div className="px-8 pb-6 md:px-12">
        <TopNav />
      </div>

      {/* ── Main content area ──────────────────────────────────────── */}
      <main className="px-8 pb-16 md:px-12">
        <Outlet />
      </main>
    </div>
  );
}

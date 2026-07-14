/**
 * TopNav.tsx — Horizontal Navigation Bar
 * ============================================================
 * Renders a single pill-shaped container holding all nav items in a row.
 * The active item is highlighted by a sliding #c1ff00 pill (Framer Motion).
 * On narrow screens it collapses to a hamburger toggle.
 *
 * To change the breakpoint at which it collapses, search for "md:" below.
 * To change the accent color, update the --hub-accent CSS variable in index.css.
 * ============================================================
 */

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { navItems } from "../content/data";

// ─── Hamburger icon ────────────────────────────────────────────────────────────
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-5 h-5 flex flex-col justify-center gap-[5px]" aria-hidden>
      <motion.span
        animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="block h-[2px] w-5 bg-[#1e1e1e] rounded-full origin-center"
      />
      <motion.span
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.15 }}
        className="block h-[2px] w-5 bg-[#1e1e1e] rounded-full"
      />
      <motion.span
        animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="block h-[2px] w-5 bg-[#1e1e1e] rounded-full origin-center"
      />
    </div>
  );
}

// ─── Individual nav item ────────────────────────────────────────────────────────
function NavItem({
  item,
  index,
  isActive,
  onClick,
}: {
  item: (typeof navItems)[0];
  index: number;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      // Staggered rise-up + fade-in on first load
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.38,
        ease: [0.23, 1, 0.32, 1],
      }}
      className="relative"
    >
      <Link
        to={item.path}
        onClick={onClick}
        data-testid={`nav-item-${item.id}`}
        className="relative z-10 flex items-center px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)] select-none"
        style={{ color: "#1e1e1e" }}
      >
        {/* Sliding active pill — sits behind the label text */}
        {isActive && (
          <motion.span
            layoutId="active-pill"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "var(--hub-accent)" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        {/* Subtle hover layer for inactive items */}
        {!isActive && (
          <span className="absolute inset-0 rounded-full bg-[#1e1e1e]/5 opacity-0 hover:opacity-100 transition-opacity" />
        )}
        <span className="relative z-10">{item.label}</span>
      </Link>
    </motion.div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export function TopNav() {
  const location = useLocation();
  // Controls the mobile hamburger drawer
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      aria-label="Main navigation"
      data-testid="top-nav"
      className="w-full"
    >
      {/* ── Wide screen: horizontal pill bar ─────────────────────────────── */}
      {/*
        Hidden on screens narrower than "md" breakpoint (768px).
        The inset box-shadow gives the "recessed/sunken" tray appearance.
      */}
      <div className="hidden md:flex">
        <div
          className="inline-flex items-center gap-1 px-2 py-2 rounded-full"
          style={{
            background: "#f0f0f0",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          {navItems.map((item, i) => (
            <NavItem
              key={item.id}
              item={item}
              index={i}
              isActive={location.pathname === item.path}
            />
          ))}
        </div>
      </div>

      {/* ── Narrow screen: hamburger + dropdown ──────────────────────────── */}
      {/*
        Visible only on screens narrower than "md" breakpoint (768px).
        Tapping the hamburger toggles the vertical nav list.
      */}
      <div className="flex md:hidden flex-col">
        {/* Hamburger button */}
        <button
          data-testid="hamburger-button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1e1e1e]/10 bg-[#f0f0f0] self-start"
          style={{
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <HamburgerIcon open={menuOpen} />
          <span className="text-sm font-semibold text-[#1e1e1e]">Menu</span>
        </button>

        {/* Collapsible nav list — animated open/close */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden mt-2"
            >
              <div
                className="flex flex-col gap-1 p-2 rounded-2xl"
                style={{
                  background: "#f0f0f0",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                {navItems.map((item, i) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    index={i}
                    isActive={location.pathname === item.path}
                    // Close the menu when a nav item is tapped
                    onClick={() => setMenuOpen(false)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

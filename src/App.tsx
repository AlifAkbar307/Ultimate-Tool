/**
 * App.tsx — Router Setup
 * ============================================================
 * Configures React Router with the Layout shell and one route per tool.
 * The index route (default page) is always the FIRST item in navItems.
 *
 * To change which tool loads by default:
 *   - Move the desired item to the top of navItems in src/content/data.ts
 *   - Keep its path as "/"
 * ============================================================
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToolPage } from './pages/ToolPage';
import { EligibilityChecker } from './pages/EligibilityChecker';
import { QuoteParser } from './pages/QuoteParser';
import { JiraHelper } from './pages/JiraHelper';
import { navItems } from './content/data';
import React from 'react';

// ── Tool component registry ───────────────────────────────────────────────────
// Map tool IDs to their built-out page components.
// Tools not listed here fall back to the generic ToolPage placeholder.
// Add an entry here each time a new tool is implemented.
const TOOL_COMPONENTS: Record<string, React.ReactElement> = {
  'jira-helper': <JiraHelper />,
  'eligibility-checker': <EligibilityChecker />,
  'quote-parser': <QuoteParser />,
};

const queryClient = new QueryClient();

// 404 fallback — shown for any unknown URL
function NotFound() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-[#1e1e1e] mb-2">404</h1>
      <p className="text-[#1e1e1e]/60 text-lg">Page not found</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Index route — navItems[0] is the default landing page (Jira Helper).
                  Uses the same registry lookup as every other route so a built-out
                  tool at "/" renders its real component instead of the placeholder. */}
              <Route
                index
                element={TOOL_COMPONENTS[navItems[0].id] ?? <ToolPage tool={navItems[0]} />}
              />

              {/* One named route for each remaining tool.
                  Built-out tools use their specific component;
                  unbuilt tools fall back to the generic placeholder. */}
              {navItems.slice(1).map((item) => (
                <Route
                  key={item.id}
                  path={item.path.replace(/^\//, '')}
                  element={TOOL_COMPONENTS[item.id] ?? <ToolPage tool={item} />}
                />
              ))}

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

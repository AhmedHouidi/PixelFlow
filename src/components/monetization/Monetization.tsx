import React, { useEffect, useMemo, useState } from 'react';
import { Check, Crown, X, ExternalLink } from 'lucide-react';

const CHECKOUT_URL = import.meta.env.VITE_PRO_CHECKOUT_URL as string | undefined;
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;
const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT as string | undefined;

const FREE_DAILY_REMOVALS = 3;
const USAGE_KEY = 'pixelflow_bg_remove_usage_v1';

interface UsageState {
  date: string;
  count: number;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(): UsageState {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { date: getToday(), count: 0 };
    const parsed = JSON.parse(raw) as Partial<UsageState>;
    if (parsed.date !== getToday()) return { date: getToday(), count: 0 };
    return { date: getToday(), count: Math.max(0, Number(parsed.count) || 0) };
  } catch {
    return { date: getToday(), count: 0 };
  }
}

export function canUseFreeBackgroundRemoval() {
  return readUsage().count < FREE_DAILY_REMOVALS;
}

export function recordFreeBackgroundRemoval() {
  const usage = readUsage();
  const next = { ...usage, count: Math.min(FREE_DAILY_REMOVALS, usage.count + 1) };
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  } catch {
    // Usage tracking is best-effort for anonymous users.
  }
  window.dispatchEvent(new CustomEvent('pixelflow-usage-updated'));
}

export function getFreeBackgroundRemovalUsage() {
  return readUsage();
}

export function openProCheckout() {
  if (!CHECKOUT_URL) {
    window.dispatchEvent(new CustomEvent('pixelflow-open-pro-modal'));
    return;
  }
  window.open(CHECKOUT_URL, '_blank', 'noopener,noreferrer');
}

export function ProModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="relative p-7 md:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">PixelFlow Pro</p>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create without limits.</h2>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Upgrade for a cleaner PixelFlow experience with higher limits and no ads.
          </p>

          <div className="space-y-3 mb-7">
            {[
              'No ads',
              'Higher tool limits',
              'Priority access to premium tools',
              'Support ongoing PixelFlow development',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={openProCheckout}
            className="w-full min-h-14 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {CHECKOUT_URL ? 'Upgrade to Pro' : 'Set up Pro checkout'}
            {CHECKOUT_URL && <ExternalLink className="w-4 h-4" />}
          </button>

          <p className="mt-4 text-xs text-center text-slate-400">
            Secure checkout is handled by your payment provider.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openModal = () => setOpen(true);
    window.addEventListener('pixelflow-open-pro-modal', openModal);
    return () => window.removeEventListener('pixelflow-open-pro-modal', openModal);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
      >
        <Crown className="w-4 h-4" />
        Pro
      </button>
      <ProModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AdSlot({ className = '' }: { className?: string }) {
  const enabled = Boolean(ADSENSE_CLIENT_ID && ADSENSE_SLOT);

  useEffect(() => {
    if (!enabled) return;
    const existing = document.querySelector('script[data-pixelflow-adsense="true"]');
    if (existing) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.crossOrigin = 'anonymous';
    script.dataset.pixelflowAdsense = 'true';
    document.head.appendChild(script);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch {
      // Ad blockers and delayed script loading are expected.
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={`w-full flex justify-center overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', width: '100%', minHeight: 90 }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export function UsageBadge() {
  const [usage, setUsage] = useState(getFreeBackgroundRemovalUsage);

  useEffect(() => {
    const refresh = () => setUsage(getFreeBackgroundRemovalUsage());
    window.addEventListener('pixelflow-usage-updated', refresh);
    return () => window.removeEventListener('pixelflow-usage-updated', refresh);
  }, []);

  return useMemo(() => (
    <span className="text-xs text-slate-400">
      Free today: {Math.max(0, FREE_DAILY_REMOVALS - usage.count)} background removals left
    </span>
  ), [usage.count]);
}

'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Square Web Payments SDK types ───────────────────────────────────────────

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePaymentsInstance>;
    };
  }
}

export interface SquarePaymentsInstance {
  card: (options?: Record<string, unknown>) => Promise<SquareCardInstance>;
}

export interface SquareCardInstance {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
  destroy: () => Promise<void>;
}

export interface UseSquarePaymentsOptions {
  /** Only load/initialize when true (i.e. Square is the active gateway). */
  enabled: boolean;
  applicationId: string;
  locationId: string;
  /** 'sandbox' | 'production' — controls which Square SDK URL is loaded. */
  environment: string;
  /** CSS selector Square attaches its card iframe to, e.g. '#square-card-container'. */
  containerSelector: string;
}

export interface UseSquarePaymentsResult {
  /** True once the card form is attached and ready to tokenize. */
  ready: boolean;
  /** Human-readable configuration / load error, empty when OK. */
  error: string;
  /** Tokenizes the card. Resolves with the sourceId (cnon_*) or throws with a user-facing message. */
  tokenize: () => Promise<string>;
}

/**
 * Loads the Square Web Payments SDK (sandbox vs production URL based on
 * `environment`), initializes `Square.payments(appId, locationId)` and
 * attaches a card form to `containerSelector`.
 */
export function useSquarePayments(opts: UseSquarePaymentsOptions): UseSquarePaymentsResult {
  const { enabled, applicationId, locationId, environment, containerSelector } = opts;
  const cardRef = useRef<SquareCardInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;

    const appId = (applicationId ?? '').trim();
    const locId = (locationId ?? '').trim();
    const squareEnv = (environment ?? 'sandbox').trim() || 'sandbox';

    setError('');

    if (!appId || !locId) {
      setError(
        'Square is not fully configured. Missing ' +
        [!appId && 'Application ID', !locId && 'Location ID'].filter(Boolean).join(' and ') +
        '. Configure Square in the admin panel or set the NEXT_PUBLIC_SQUARE_* environment variables.'
      );
      return;
    }

    // Catch the common sandbox/production mismatch before the SDK silently fails.
    const isSandboxAppId = appId.startsWith('sandbox-');
    if (squareEnv === 'production' && isSandboxAppId) {
      setError('Square environment is set to "production" but a sandbox Application ID is configured. Use your production Application ID, or set the Square environment to sandbox.');
      return;
    }
    if (squareEnv !== 'production' && !isSandboxAppId) {
      setError('Square environment is set to "sandbox" but a production Application ID is configured. Set the Square environment to production, or use your sandbox Application ID.');
      return;
    }

    const scriptUrl = squareEnv === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';

    let cancelled = false;

    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.addEventListener('error', () => {
        if (!cancelled) setError('Failed to load the Square payment library. Check your network connection or any content blockers and try again.');
      });
      document.head.appendChild(script);
    }

    let card: SquareCardInstance | null = null;
    let attempts = 0;

    const initCard = async () => {
      if (cancelled) return;
      if (!window.Square) {
        attempts += 1;
        if (attempts > 50) { // ~10s
          setError('The Square payment library did not load in time. Please refresh the page and try again.');
          return;
        }
        setTimeout(initCard, 200);
        return;
      }
      try {
        const payments = await window.Square.payments(appId, locId);
        card = await payments.card();
        await card.attach(containerSelector);
        if (!cancelled) {
          cardRef.current = card;
          setReady(true);
        }
      } catch (err) {
        console.error('Square card init failed', err);
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Square could not initialize the card form: ${msg}. Verify your Application ID and Location ID are correct and from the same Square account.`);
        }
      }
    };

    const el = script as HTMLScriptElement & { readyState?: string };
    if (el.readyState === 'complete' || window.Square) {
      void initCard();
    } else {
      el.addEventListener('load', initCard);
    }

    return () => {
      cancelled = true;
      card?.destroy().catch(() => {});
      cardRef.current = null;
      setReady(false);
    };
  }, [enabled, applicationId, locationId, environment, containerSelector]);

  const tokenize = async (): Promise<string> => {
    const card = cardRef.current;
    if (!card) throw new Error('Square card form not ready. Please refresh and try again.');
    const result = await card.tokenize();
    if (result.status !== 'OK' || !result.token) {
      throw new Error(result.errors?.[0]?.message ?? 'Card tokenization failed — please check your card details.');
    }
    return result.token;
  };

  return { ready, error, tokenize };
}

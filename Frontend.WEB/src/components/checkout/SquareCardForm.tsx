'use client';

import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useSquarePayments } from '@/lib/useSquarePayments';

export interface SquareCardFormHandle {
  /** Tokenizes the card. Resolves with the sourceId (cnon_*) or throws with a user-facing message. */
  tokenize: () => Promise<string>;
}

interface SquareCardFormProps {
  applicationId: string;
  locationId: string;
  /** 'sandbox' | 'production' */
  environment: string;
  /** Notified whenever the card form becomes ready / not ready. */
  onReadyChange?: (ready: boolean) => void;
}

const CONTAINER_ID = 'square-card-container';

/**
 * Renders the Square Web Payments SDK card widget and exposes `tokenize()`
 * via ref, which resolves to a Square sourceId for POST /orders.
 */
const SquareCardForm = forwardRef<SquareCardFormHandle, SquareCardFormProps>(
  function SquareCardForm({ applicationId, locationId, environment, onReadyChange }, ref) {
    const { ready, error, tokenize } = useSquarePayments({
      enabled: true,
      applicationId,
      locationId,
      environment,
      containerSelector: `#${CONTAINER_ID}`,
    });

    useImperativeHandle(ref, () => ({ tokenize }), [tokenize]);

    useEffect(() => {
      onReadyChange?.(ready && !error);
    }, [ready, error, onReadyChange]);

    return (
      <>
        <div
          id={CONTAINER_ID}
          style={{ border: '1px solid #ddd', borderRadius: 6, padding: '14px 16px', background: '#fafafa', minHeight: 54, display: error ? 'none' : 'block' }}
        >
          {!ready && !error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8094ae', fontSize: 14 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: '#ff8c00' }} />
              Initializing secure payment...
            </div>
          )}
        </div>
        {error && (
          <div style={{ border: '1px solid #f3c2c2', borderRadius: 6, padding: '14px 16px', background: '#fdecec', color: '#a8071a', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}
        <p style={{ fontSize: 12, color: '#aab7c4', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#629D23' }} />
          Secured by Square. Your card details are never stored on our servers.
        </p>
      </>
    );
  }
);

export default SquareCardForm;

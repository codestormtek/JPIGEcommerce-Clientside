'use client';

import { useState, FormEvent } from 'react';

const API_BASE = '/api/v1';

const NewsletterForm = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`${API_BASE}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          optInEmail: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing!');
        setEmail('');
      } else {
        setStatus('error');
        const errMsg = data?.error?.message || data?.message || 'Something went wrong. Please try again.';
        if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('unique') || errMsg.toLowerCase().includes('duplicate')) {
          setMessage('You are already subscribed!');
        } else {
          setMessage(errMsg);
        }
      }
    } catch {
      setStatus('error');
      setMessage('Unable to connect. Please try again later.');
    }
  };

  return (
    <>
      <form className="footersubscribe-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Your email address"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle' && status !== 'loading') {
              setStatus('idle');
              setMessage('');
            }
          }}
        />
        <button className="rts-btn btn-primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending...' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p style={{ color: status === 'success' ? '#27AE60' : '#E74C3C', marginTop: '8px', fontSize: '14px' }}>
          {message}
        </p>
      )}
    </>
  );
};

export default NewsletterForm;

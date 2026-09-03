"use client";

interface Props {
  onStart: () => void;
}

export default function AttractScreen({ onStart }: Props) {
  return (
    <div className="k-screen k-attract" onClick={onStart}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="k-attract-logo-img" src="/kiosk-logo.png" alt="The Jiggling Pig" />
      <h1>
        Hungry?
        <br />
        <span>Order Here.</span>
      </h1>
      <button
        className="k-btn k-btn-primary k-attract-cta"
        onClick={(e) => {
          e.stopPropagation();
          onStart();
        }}
      >
        Tap to Start
      </button>
      <div className="k-attract-hint">Pay with card right here — food&apos;s up in minutes</div>
    </div>
  );
}

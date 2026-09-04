"use client";

interface Props {
  onStart: () => void;
}

export default function AttractScreen({ onStart }: Props) {
  return (
    <div className="k-screen k-attract" onClick={onStart}>
      <div className="k-attract-bg" />
      <div className="k-attract-content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="k-attract-logo-img" src="/kiosk-logo.png" alt="The Jiggling Pig" />
        <h1>
          The Jiggling <span>Pig</span>
        </h1>
        <p className="k-attract-subtitle">
          Low & slow mobile BBQ. Order here, pay at the terminal,<br/>
          we&apos;ll call your name.
        </p>
        <button
          className="k-btn k-btn-primary k-attract-cta"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
        >
          Tap to Order
        </button>
      </div>
    </div>
  );
}

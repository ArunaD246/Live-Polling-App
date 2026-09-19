import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, ExternalLink, MessageCircle, Send } from 'lucide-react';

export default function ShareModal({ poll, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !poll) return null;

  const voteUrl = `${window.location.origin}/poll/${poll.id}`;
  const resultsUrl = `${window.location.origin}/poll/${poll.id}/results`;

  const handleCopy = () => {
    navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Vote on this live poll: "${poll.question}"\n${voteUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Vote on this live poll: "${poll.question}"`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(voteUrl)}`, '_blank');
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(`Vote on this live poll: "${poll.question}"`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(voteUrl)}&text=${text}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2rem',
        position: 'relative',
        background: '#0d1322',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: 'var(--text-muted)',
            borderRadius: '50%',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            color: 'var(--accent-primary)',
          }}>
            <Share2 size={24} />
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>Share Live Poll</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '340px', margin: '0 auto' }}>
            Audience can scan the QR code or click the link to vote immediately.
          </p>
        </div>

        {/* QR Code Container */}
        <div style={{
          background: '#ffffff',
          padding: '1.25rem',
          borderRadius: '16px',
          width: 'fit-content',
          margin: '0 auto 1.5rem auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <QRCodeSVG
            value={voteUrl}
            size={180}
            bgColor={"#ffffff"}
            fgColor={"#0a0d16"}
            level={"M"}
            includeMargin={false}
          />
        </div>

        {/* Copy Link Input */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '0.35rem',
        }}>
          <input
            type="text"
            readOnly
            value={voteUrl}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={handleCopy}
            className="btn-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Share buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button onClick={shareWhatsApp} className="btn-secondary" style={{ padding: '0.55rem', fontSize: '0.8rem' }}>
            <MessageCircle size={15} color="#25D366" />
            <span>WhatsApp</span>
          </button>
          <button onClick={shareTwitter} className="btn-secondary" style={{ padding: '0.55rem', fontSize: '0.8rem' }}>
            <Send size={15} color="#38bdf8" />
            <span>Twitter/X</span>
          </button>
          <button onClick={shareTelegram} className="btn-secondary" style={{ padding: '0.55rem', fontSize: '0.8rem' }}>
            <Send size={15} color="#60a5fa" />
            <span>Telegram</span>
          </button>
        </div>

        {/* View Live Results Shortcut */}
        <a
          href={resultsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: 'var(--accent-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '0.5rem',
            textAlign: 'center',
          }}
        >
          <span>Open Live Presenter Results Screen</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { ContentComment, PaginatedResponse } from '@/types/api';

interface BlogCommentsProps {
  postId: string;
}

function getInitials(user: { firstName: string | null; lastName: string | null }): string {
  const f = user.firstName?.[0] || '';
  const l = user.lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

function getDisplayName(user: { firstName: string | null; lastName: string | null }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Anonymous';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jpig_access_token') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loadError, setLoadError] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiGet<PaginatedResponse<ContentComment>>(`/content/comments/${postId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setComments(data);
      const total = (res as any).meta?.total ?? data.reduce((sum: number, c: ContentComment) => sum + 1 + (c.replies?.length || 0), 0);
      setTotalComments(total);
    } catch {
      setComments([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to leave a comment.');
      return;
    }
    const text = body.trim();
    if (!text) return;

    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await apiFetch(`/content/comments/${postId}`, {
        method: 'POST',
        body: { body: text },
        headers: authHeaders(),
      });
      setBody('');
      setSuccessMsg('Your comment has been posted!');
      await fetchComments();
    } catch (err: any) {
      setError(err?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!user) {
      setError('Please log in to reply.');
      return;
    }
    const text = replyBody.trim();
    if (!text) return;

    setSubmitting(true);
    setError('');
    try {
      await apiFetch(`/content/comments/${postId}`, {
        method: 'POST',
        body: { body: text, parentId },
        headers: authHeaders(),
      });
      setReplyBody('');
      setReplyTo(null);
      await fetchComments();
    } catch (err: any) {
      setError(err?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (comment: ContentComment, isReply = false) => (
    <div
      key={comment.id}
      className={`single-comment-area ${isReply ? 'bottom' : ''}`}
      style={isReply ? { paddingLeft: 60, paddingTop: 20, marginTop: 10 } : { paddingTop: 20, marginBottom: 10 }}
    >
      <div className="thumbanil">
        {comment.user.avatarUrl ? (
          <img
            src={comment.user.avatarUrl}
            alt={getDisplayName(comment.user)}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#ff8c00',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {getInitials(comment.user)}
          </div>
        )}
      </div>
      <div className="comment-information" style={{ flex: 1 }}>
        <div className="top-area">
          <div className="left">
            <span>{formatDate(comment.createdAt)}</span>
            <h5 className="title">{getDisplayName(comment.user)}</h5>
          </div>
          {!isReply && user && (
            <button
              className="replay"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyBody(''); }}
            >
              Reply
            </button>
          )}
        </div>
        <p className="disc">{comment.body}</p>

        {replyTo === comment.id && (
          <div style={{ marginTop: 12 }}>
            <textarea
              rows={3}
              className="form-control"
              placeholder="Write your reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="rts-btn btn-primary"
                style={{ padding: '6px 16px', fontSize: 14 }}
                onClick={() => handleReplySubmit(comment.id)}
                disabled={submitting}
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                className="rts-btn"
                style={{ padding: '6px 16px', fontSize: 14, background: '#eee' }}
                onClick={() => { setReplyTo(null); setReplyBody(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {comment.replies?.map((reply) => renderComment(reply, true))}
      </div>
    </div>
  );

  return (
    <div className="comment-replay-area-start">
      <h3 className="title">
        {loading ? 'Comments' : `${String(totalComments).padStart(2, '0')} Comment${totalComments !== 1 ? 's' : ''}`}
      </h3>

      {loading ? (
        <p style={{ color: '#74787C' }}>Loading comments...</p>
      ) : loadError ? (
        <p style={{ color: '#dc3545', marginBottom: 20 }}>Unable to load comments. Please try refreshing the page.</p>
      ) : comments.length > 0 ? (
        comments.map((c) => renderComment(c))
      ) : (
        <p style={{ color: '#74787C', marginBottom: 20 }}>No comments yet. Be the first to leave a comment!</p>
      )}

      <div style={{ marginTop: 40 }}>
        <h3 className="title">Add a Comment</h3>
        {error && <p style={{ color: '#dc3545', marginBottom: 10 }}>{error}</p>}
        {successMsg && <p style={{ color: '#28a745', marginBottom: 10 }}>{successMsg}</p>}

        {user ? (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#74787C', marginBottom: 16 }}>
              Commenting as <strong>{user.firstName || user.email}</strong>
            </p>
            <textarea
              rows={5}
              className="form-control"
              placeholder="Write your comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              style={{ marginBottom: 16 }}
            />
            <button
              type="submit"
              className="rts-btn btn-primary"
              disabled={submitting || !body.trim()}
            >
              {submitting ? 'Posting...' : 'Submit Now'}
            </button>
          </form>
        ) : (
          <p style={{ color: '#74787C' }}>
            Please{' '}
            <a href="/account" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              log in
            </a>{' '}
            to leave a comment.
          </p>
        )}
      </div>
    </div>
  );
}

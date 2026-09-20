'use client';

import type { CSSProperties } from 'react';
import { ME, ROLE_LABEL, ROLE_STYLE, type Comment, type Post } from '@/lib/data';
import { avatarStyle } from '@/lib/ui';
import PostCard, { type PostCardProps } from './PostCard';
import type { AppState, SetState } from './WhongNaiMor';

interface Props {
  st: AppState;
  set: SetState;
  active: Post;
  card: PostCardProps;
  isGuest: boolean;
  isMod: boolean;
  meName: string;
  meInitials: string;
  meAvatar: CSSProperties;
  gate: () => void;
  flash: (t: string) => void;
  nextCommentId: () => string;
  onClose: () => void;
}

export default function PostModal({ st, set, active, card, isGuest, isMod, meName, meInitials, meAvatar, gate, flash, nextCommentId, onClose }: Props) {
  const all = st.comments[active.id] || [];
  const shownCount = Math.min(st.shown, all.length);
  const thread = all.slice(0, shownCount);

  const submitComment = () => {
    const text = st.draft.trim();
    if (!text) return flash('ยังไม่ได้พิมพ์ความเห็น');
    const nc: Comment = { id: nextCommentId(), a: ME.name, r: isMod ? 'mod' : 'student', i: ME.initials, t: ME.tint, time: 'เมื่อสักครู่', text, likes: 0, replies: [] };
    set((prev) => {
      const list = prev.comments[active.id] || [];
      const next = prev.replyTo
        ? list.map((c) => (c.a === prev.replyTo ? { ...c, replies: [...(c.replies || []), nc] } : c))
        : [...list, nc];
      return { comments: { ...prev.comments, [active.id]: next }, draft: '', replyTo: null, shown: Math.max(prev.shown, next.length) };
    });
    flash('ส่งความเห็นแล้ว');
  };

  return (
    <div className="dialog-backdrop" style={{ zIndex: 39, animation: 'wnm-pop .16s ease both' }} onClick={(e) => { if (e.target === e.currentTarget) set({ activeId: null, replyTo: null }); }}>
      <div style={{ width: 'min(660px,100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', borderRadius: 20, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
          <h4 style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 700 }}>โพสต์ของ {active.name}</h4>
          <button className="btn btn-secondary btn-icon" onClick={onClose} title="ปิด">✕</button>
        </header>

        <div style={{ overflow: 'auto', padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ flex: 'none' }}>
            <PostCard {...card} />
          </div>

          <section style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>ความเห็น</h4>
              <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
                {all.length > shownCount ? `แสดง ${shownCount} จาก ${all.length} ความเห็น` : `${all.length} ความเห็น`}
              </span>
            </div>

            {!isGuest ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 16, padding: 13 }}>
                <span style={meAvatar}>{meInitials}</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
                  {st.replyTo && <span style={{ fontSize: 11.5, color: 'var(--color-accent-700)' }}>กำลังตอบ {st.replyTo}</span>}
                  <textarea
                    className="input"
                    value={st.draft}
                    onChange={(e) => set({ draft: e.target.value })}
                    placeholder="เขียนความเห็นอย่างสุภาพ · เห็นได้เฉพาะผู้ใช้ที่ยืนยัน @cmu.ac.th"
                    style={{ borderRadius: 14, minHeight: 62, background: 'var(--color-neutral-100)', fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>โพสต์ในชื่อ {meName}</span>
                    <button className="btn btn-primary" onClick={submitComment} style={{ marginLeft: 'auto', padding: '7px 16px', fontSize: 12.5 }}>ส่งความเห็น</button>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-neutral-700)', background: 'var(--color-neutral-100)', borderRadius: 14, padding: '13px 15px' }}>
                บัญชีภายนอกมหาวิทยาลัยอ่านโพสต์สาธารณะได้ แต่ไม่สามารถแสดงความเห็นหรือแสดงความรู้สึกได้
              </p>
            )}

            {thread.map((c) => {
              const liked = !!st.cLikes[c.id];
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={avatarStyle(c.t, 34)}>{c.i}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 14, padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.a}</span>
                        {c.r !== 'student' && <span className="tag" style={{ ...ROLE_STYLE[c.r], fontSize: 10 }}>{ROLE_LABEL[c.r]}</span>}
                        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{c.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>{c.text}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, padding: '3px 2px' }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => (isGuest ? gate() : set((prev) => ({ cLikes: { ...prev.cLikes, [c.id]: !prev.cLikes[c.id] } })))}
                        style={{ fontSize: 12, color: liked ? 'var(--color-accent)' : 'var(--color-neutral-600)' }}
                      >
                        ถูกใจ {(c.likes || 0) + (liked ? 1 : 0)}
                      </button>
                      <button className="btn btn-ghost" onClick={() => (isGuest ? gate() : set({ replyTo: c.a }))} style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>ตอบกลับ</button>
                    </div>
                    {(c.replies || []).map((r) => (
                      <div key={r.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', margin: '2px 0 8px 10px', paddingLeft: 12, borderLeft: '2px solid var(--color-accent-200)' }}>
                        <span style={avatarStyle(r.t, 26)}>{r.i}</span>
                        <div style={{ flex: 1, minWidth: 0, background: 'var(--color-neutral-100)', borderRadius: 12, padding: '9px 13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.a}</span>
                            <span style={{ fontSize: 10.5, color: 'var(--color-neutral-600)' }}>{r.time}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-neutral-800)' }}>{r.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {all.length > shownCount && (
              <button className="btn btn-secondary" onClick={() => set((prev) => ({ shown: prev.shown + 15 }))} style={{ alignSelf: 'flex-start', fontSize: 12.5, padding: '8px 16px' }}>
                ดูความเห็นเพิ่มเติม (เหลืออีก {all.length - shownCount})
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

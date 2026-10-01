'use client';

import type { CSSProperties } from 'react';
import { ANNOUNCE_CAT, CATS, QA, STATUSES, type Post, type ReportStatus } from '@/lib/data';
import { avatarStyle, likeCount, statusLook } from '@/lib/ui';

export interface PostCardProps {
  CATS: typeof CATS;
  post: Post;
  liked: boolean;
  commentCount: number;
  reportStatus?: ReportStatus;
  isGuest: boolean;
  isMod: boolean;
  onLike: () => void;
  onGate: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onReport: () => void;
  onSetStatus: (s: ReportStatus) => void;
}

const REPORT_CHIP: Record<ReportStatus, string> = {
  Open: 'ถูกรายงาน · Open',
  Reviewed: 'ตรวจสอบแล้ว · Reviewed',
  Dismissed: 'ยกคำร้อง · Dismissed',
};

export default function PostCard(props: PostCardProps) {
  const { post: p, liked, commentCount, reportStatus: status, isGuest, isMod, CATS } = props;

  const rail = p.priority === 'urgent' ? 'var(--pri)' : p.priority === 'notice' ? 'var(--color-accent)' : null;
  const cats = p.cats || [];

  const chips: { label: string; style: CSSProperties }[] = cats.map((c) => {
    const row = CATS.find((x) => x.name === c) || { pri: 5 };
    return {
      label: c.split(' / ')[0],
      style: row.pri <= 2
        ? { background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' }
        : { background: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)' },
    };
  });
  if (p.important && (p.priority === 'urgent' || !cats.includes(ANNOUNCE_CAT))) {
    chips.push({
      label: p.priority === 'urgent' ? 'ประกาศด่วน' : 'ประกาศทางการ',
      style: p.priority === 'urgent'
        ? { background: '#f2c6b6', color: '#6f2f14', fontWeight: 700 }
        : { background: 'var(--peach)', color: 'var(--color-accent-800)', fontWeight: 700 },
    });
  } else if (cats.includes(QA) && commentCount === 0) {
    chips.push({ label: 'ยังไม่มีความเห็น', style: { background: 'var(--color-accent-2-200)', color: 'var(--color-accent-2-800)', fontWeight: 700 } });
  }
  if (p.edited) {
    chips.push({ label: p.edited, style: { background: 'var(--color-neutral-200)', color: 'var(--color-neutral-700)' } });
  }
  if (status) {
    const [bg, fg] = statusLook(status);
    chips.push({ label: REPORT_CHIP[status], style: { background: bg, color: fg, fontWeight: 700 } });
  }

  const media = p.media || [];
  const likes = likeCount(p, liked);

  return (
    <article style={{ position: 'relative', overflow: 'hidden', background: 'var(--color-surface)', borderRadius: 16, boxShadow: '0 1px 3px rgba(62,34,89,.09)', border: '1px solid var(--color-divider)', padding: '16px 18px 10px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rail && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: rail }} />}

      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap' }}>
        <div style={avatarStyle(p.tint ?? 0)}>{p.initials}</div>
        <div style={{ minWidth: 190, flex: '1 1 210px' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, display: 'block' }}>
            {p.name}
            {p.role !== 'student' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: -2, marginLeft: 5 }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12.4l2.4 2.3 4.6-5" />
              </svg>
            )}
          </span>
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>{p.meta} · {p.time}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {chips.map((c, i) => (
            <span key={i} className="tag" style={{ fontSize: 10.5, ...c.style }}>{c.label}</span>
          ))}
        </div>
      </header>

      <div onClick={props.onOpen} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {p.title && <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, lineHeight: 1.35, letterSpacing: 0, textWrap: 'pretty' }}>{p.title}</h4>}
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>{p.body}</p>
        {media.length > 0 && (
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: media.length > 1 ? '1fr 1fr' : '1fr' }}>
            {media.map((m, i) => (
              <div key={i} style={{ height: media.length > 2 ? 110 : media.length > 1 ? 130 : 150, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#e5ccf3', border: '1px solid rgba(42,34,51,.07)', gridColumn: media.length === 3 && i === 0 ? 'span 2' : undefined }}>
                <span style={{ fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6c4194' }}>{m.type === 'video' ? 'video' : 'image'}</span>
                <span style={{ fontSize: 12, color: '#3e2259', textAlign: 'center', padding: '0 8px' }}>{m.label}</span>
              </div>
            ))}
          </div>
        )}
        {!!p.notified && (
          <span style={{ fontSize: 11.5, color: 'var(--color-accent-700)' }}>ส่งแจ้งเตือนผู้ที่สนใจหมวดนี้ {p.notified.toLocaleString()} คน</span>
        )}
      </div>

      <footer style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 8, borderTop: '1px solid var(--color-divider)' }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 'none', fontSize: 12.5, padding: '5px 9px', color: liked ? 'var(--color-accent)' : 'var(--color-neutral-700)' }}
          onClick={() => (isGuest ? props.onGate() : props.onLike())}
          aria-pressed={liked}
          title={liked ? 'เลิกถูกใจ' : 'ถูกใจ'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.4l-1.5-1.36C5.4 14.4 2.5 11.8 2.5 8.6A4.6 4.6 0 0 1 7.1 4c1.7 0 3.2.9 4.9 3 1.7-2.1 3.2-3 4.9-3a4.6 4.6 0 0 1 4.6 4.6c0 3.2-2.9 5.8-8 10.44z" />
          </svg>
          ถูกใจ
        </button>
        <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {likes > 0 ? `${likes.toLocaleString()} คนถูกใจ` : 'ยังไม่มีใครถูกใจ'}
        </span>

        <button className="btn btn-ghost" style={{ flex: 'none', fontSize: 12.5, color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }} onClick={props.onOpen}>
          ความเห็น {commentCount}
        </button>
        {isMod && (
          <button className="btn btn-ghost" style={{ flex: 'none', fontSize: 12, color: 'var(--color-accent-700)' }} onClick={props.onEdit} title="แก้ไขโพสต์ (เฉพาะผู้ดูแล)">แก้ไข</button>
        )}
        {isMod && status && (
          <button
            className="tag"
            title="เปลี่ยนสถานะรายงาน (เฉพาะผู้ดูแล)"
            onClick={() => props.onSetStatus(STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length])}
            style={{ flex: 'none', cursor: 'pointer', fontSize: 10.5, background: statusLook(status)[0], color: statusLook(status)[1] }}
          >
            {p.reports || 1} รายงาน · เปลี่ยนสถานะ
          </button>
        )}
        <button className="btn btn-ghost" style={{ flex: 'none', fontSize: 12, color: 'var(--color-neutral-600)' }} onClick={props.onReport}>รายงาน</button>
      </footer>
    </article>
  );
}

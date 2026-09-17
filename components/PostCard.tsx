'use client';

import type { CSSProperties } from 'react';
import { useRef } from 'react';
import { ANNOUNCE_CAT, CATS, QA, REACTS, STATUSES, type Post, type ReactKey, type ReportStatus } from '@/lib/data';
import { avatarStyle, reactSum, statusLook } from '@/lib/ui';

export interface PostCardProps {
  post: Post;
  mine: ReactKey | null;
  commentCount: number;
  reportStatus?: ReportStatus;
  isGuest: boolean;
  isMod: boolean;
  pickerOpen: boolean;
  onPicker: (open: boolean) => void;
  onReact: (key: ReactKey | null) => void;
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
  const { post: p, mine, commentCount, reportStatus: status, isGuest, isMod, pickerOpen } = props;
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
  const reactSummary = (() => {
    const shown = REACTS.filter((r) => (p.reacts[r.key] || 0) + (mine === r.key ? 1 : 0) > 0)
      .sort((a, b) => (p.reacts[b.key] || 0) - (p.reacts[a.key] || 0))
      .slice(0, 2)
      .map((r) => r.label);
    return shown.length ? shown.join(' · ') : 'ยังไม่มีใครแสดงความรู้สึก';
  })();

  const onHoldStart = () => {
    if (isGuest) return;
    clearTimeout(hold.current);
    hold.current = setTimeout(() => props.onPicker(true), 380);
  };
  const onHoldEnd = () => clearTimeout(hold.current);

  return (
    <article style={{ position: 'relative', overflow: 'hidden', background: 'var(--color-surface)', borderRadius: 16, boxShadow: '0 1px 3px rgba(62,34,89,.09)', border: '1px solid var(--color-divider)', padding: '16px 18px 10px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rail && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: rail }} />}

      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap' }}>
        <div style={avatarStyle(p.tint)}>{p.initials}</div>
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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 0 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 'none', fontSize: 12.5, padding: '5px 9px', touchAction: 'none', userSelect: 'none', color: mine ? 'var(--color-accent)' : 'var(--color-neutral-700)' }}
            onClick={() => {
              clearTimeout(hold.current);
              if (isGuest) return props.onGate();
              props.onReact(mine ? null : 'like');
            }}
            onPointerDown={onHoldStart}
            onPointerUp={onHoldEnd}
            onPointerLeave={onHoldEnd}
            onContextMenu={(e) => { e.preventDefault(); if (!isGuest) props.onPicker(true); }}
            title="กดค้างเพื่อเลือกความรู้สึก"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={mine ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20.4l-1.5-1.36C5.4 14.4 2.5 11.8 2.5 8.6A4.6 4.6 0 0 1 7.1 4c1.7 0 3.2.9 4.9 3 1.7-2.1 3.2-3 4.9-3a4.6 4.6 0 0 1 4.6 4.6c0 3.2-2.9 5.8-8 10.44z" />
            </svg>
            {reactSum(p, mine)}
          </button>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reactSummary}</span>

          {pickerOpen && (
            <div
              style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 8px)', zIndex: 12, display: 'flex', gap: 4, padding: 6, borderRadius: 999, background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', animation: 'wnm-pop .14s ease both' }}
              onPointerLeave={() => props.onPicker(false)}
            >
              {REACTS.map((r) => {
                const active = mine === r.key;
                return (
                  <button
                    key={r.key}
                    className="btn hov-lift"
                    title={r.label}
                    onClick={() => props.onReact(active ? null : r.key)}
                    style={{ fontSize: 12.5, padding: '6px 13px', whiteSpace: 'nowrap', transition: 'transform .12s ease', background: active ? 'var(--color-accent)' : 'var(--color-neutral-100)', color: active ? '#fff' : 'var(--color-neutral-800)' }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 999, display: 'inline-block', marginRight: 6, background: r.dot }} />
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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

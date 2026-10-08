'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATS, ME, NOTIFS, QA, STATUSES,
  type Comment, type Post, type ReactionType, type ReportStatus,
} from '@/lib/data';
import { ACCENT_MAP, avatarStyle, statusLook } from '@/lib/ui';
import { useAuthContext } from './AuthContext';
import { API_URL } from '@/lib/config';
import PostCard from './PostCard';
import PostModal from './PostModal';
import { ComposeDialog, EditDialog, ReportDialog } from './Dialogs';

export type ViewerRole = 'student' | 'moderator' | 'guest';
type View = 'home' | 'announce' | 'interests' | 'questions';

export interface NewMedia { id: string; type: 'image' | 'video'; label: string }

export interface AppState {
  view: View;
  activeId: string | null;
  cat: string | null;
  q: string;
  comments: Record<string, Comment[]>;
  posts: Post[];
  interests: string[];
  reportStatus: Record<string, ReportStatus>;   // keyed by post id
  reportReason: Record<string, string>;         // keyed by post id
  reportId: Record<string, string>;             // post id -> reports.id, for status updates
  draft: string;
  composerOpen: boolean;
  replyTo: string | null;
  replyDraft: string;
  openReplies: Record<string, boolean>;
  shown: number;
  composeOpen: boolean;
  newTitle: string;
  newText: string;
  newCats: string[];
  newMedia: NewMedia[];
  newImportant: boolean;
  reportFor: string | null;
  reason: string | null;
  editFor: string | null;
  editTitle: string;
  editBody: string;
  editCats: string[];
  editImportant: boolean;
  notifOpen: boolean;
  readNotif: boolean;
  toast: string | null;
  CATS: { id: any; name: string; pri: number; dot: string }[];
  w: number;
}

export type SetState = (patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;

// Everything that comes from the API starts empty. Seeding this with the mock
// POSTS used to fire a comment fetch per fake id ("p1", …) before the real posts
// landed; the API rejects those as invalid uuids and the error body crashed the
// thread builder, taking the dev server with it.
const INITIAL: AppState = {
  view: 'home', activeId: null, cat: null, q: '',
  comments: {}, posts: [], interests: ['เรียน / Academics'],
  reportStatus: {},
  reportReason: {},
  reportId: {},
  draft: '', composerOpen: false, replyTo: null, replyDraft: '', openReplies: {}, shown: 12,
  composeOpen: false, newTitle: '', newText: '', newCats: [], newMedia: [], newImportant: false,
  reportFor: null, reason: null,
  editFor: null, editTitle: '', editBody: '', editCats: [], editImportant: false,
  notifOpen: false, readNotif: false, toast: null,
  CATS: CATS,
  w: 1280,
};

interface Props {
  accentColor?: string;
  viewerRole?: ViewerRole;
  laneMode?: 'single' | 'two';
}


export default function WhongNaiMor({ accentColor = '#7d50a8', viewerRole, laneMode = 'single' }: Props) {
  const [st, setRaw] = useState<AppState>(INITIAL);
  const set: SetState = useCallback((patch) => {
    setRaw((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ids = useRef({ comment: 0, post: 0, media: 0 });

  const { user, session } = useAuthContext();
  const token = session?.access_token as string | undefined;

  /** Authorization header, omitted entirely when signed out. */
  const authHeaders = useCallback(
    (extra: Record<string, string> = {}) => (token ? { ...extra, Authorization: `Bearer ${token}` } : extra),
    [token],
  );

  // Who is viewing. The server decides via users.is_mod; the viewerRole prop is
  // only an override so the role views can be demoed without a second account.
  const [fetchedRole, setFetchedRole] = useState<ViewerRole | null>(null);
  const [me, setMe] = useState<{ display_name: string; is_mod: boolean } | null>(null);

  useEffect(() => {
    if (!token) { setFetchedRole('guest'); setMe(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/user/current/fetch`, { headers: authHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        const u = await res.json();
        if (cancelled) return;
        setMe({ display_name: u.display_name, is_mod: !!u.is_mod });
        setFetchedRole(u.is_mod ? 'moderator' : 'student');
      } catch {
        if (!cancelled) { setFetchedRole('guest'); setMe(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [token, authHeaders]);

  const role: ViewerRole = viewerRole ?? fetchedRole ?? 'guest';
  const isGuest = role === 'guest';
  const isMod = role === 'moderator';

  const flash = useCallback((t: string) => {
    set({ toast: t });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => set({ toast: null }), 2400);
  }, [set]);
  const gate = () => flash('ผู้ใช้ภายนอกอ่านได้เท่านั้น · ต้องเข้าสู่ระบบด้วยบัญชี @cmu.ac.th');

  function getTimeAgo(stamp: Date | string) {
    const now = new Date().getTime();
    const publishedDate = new Date(stamp).getTime();
    const diffInSeconds = Math.floor((now - publishedDate) / 1000);
    if (diffInSeconds < 60) {
        return diffInSeconds + ` วินาทีที่แล้ว`;
    } else if (diffInSeconds < (60 * 60)) {
        const minutes = Math.floor(diffInSeconds / (60));
        return minutes + ` นาทีที่แล้ว`;
    } else if (diffInSeconds < (60 * 60 * 24)) {
        const hours = Math.floor(diffInSeconds / (60 * 60));
        return hours + ` ชั่วโมงที่แล้ว`;
    } else if (diffInSeconds < (60 * 60 * 24 * 30)) {
        const days = Math.floor(diffInSeconds / (60 * 60 * 24));
        return days + ` วันที่แล้ว`;
    } else if (diffInSeconds < (60 * 60 * 24 * 30 * 12)) {
        const months = Math.floor(diffInSeconds / (60 * 60 * 24 * 30));
        return months + ` เดือนที่แล้ว`;
    } else {
        const years = Math.floor(diffInSeconds / (60 * 60 * 24 * 30 * 12));
        return years + ` ปีที่แล้ว`;
    }
  }

  // preload categories
  useEffect(() => {
    (async () => {
      const newCatsRes = await fetch(`${API_URL}/misc/categories`);
      const newCats = await newCatsRes.json();
      
      setRaw((prev) => ({ ...prev, CATS: newCats.map((c: any) => ({ id: c.id, name: c.category_name, pri: c.priority, dot: "#f91013" /* <-- place holder cats color */ })) }));
    })()
  }, [])

  /** Shape one v_post_all_data row into the Post the UI renders. */
  const toPost = useCallback((p: any): Post => ({
    id: p.id,
    important: p.is_important,
    name: p.author_name,
    time: getTimeAgo(p.created_at),
    initials: p.author_name.slice(0, 2),
    title: p.title,
    body: p.content,
    role: p.role,
    cats: (p.categories ?? []).map((c: any) => c.name),
    likes: p.reaction_count ?? 0,
    myReaction: p.my_reaction ?? null,
    // media rows are { file_url, media_type }, not bare strings.
    media: (p.medias ?? []).map((m: any) => ({
      type: m.media_type === 'video' ? 'video' : 'image',
      label: (m.file_url ?? '').split('/').pop() ?? 'media',
      url: m.file_url,
    })),
    reports: p.report_count ?? 0,
  }), []);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/post/fetch`, { headers: authHeaders() });
      const ps = await res.json();
      if (!Array.isArray(ps)) throw new Error(ps?.message ?? 'bad /post/fetch payload');
      set({ posts: ps.map(toPost) });
      return ps.map((p: any) => p.id) as string[];
    } catch (err) {
      console.error('loadPosts', err);
      return [];
    }
  }, [authHeaders, set, toPost]);

  /**
   * Fetch the comment threads for the given posts and rebuild the reply tree.
   *
   * The API returns every comment of a post flat, with parent_comment_id set on
   * replies, so each post's rows are indexed by id and then linked in one pass.
   */
  const loadComments = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) { set({ comments: {} }); return; }
    try {
      const responses = await Promise.all(
        postIds.map((id) => fetch(`${API_URL}/comment/fetch/${id}`, { headers: authHeaders() })),
      );
      const payloads = await Promise.all(responses.map((r) => r.json()));

      const postComments: Record<string, Comment[]> = {};

      payloads.forEach((rows, idx) => {
        const pid = postIds[idx];
        // A failed fetch answers with { code, message } rather than an array.
        if (!Array.isArray(rows)) return;

        const nodes = new Map<string, Comment & { parent_comment_id: string | null }>();
        rows.forEach((c: any) => nodes.set(c.id, {
          id: c.id,
          parent_comment_id: c.parent_comment_id,
          a: c.display_name,
          r: c.role,
          i: (c.display_name ?? '??').slice(0, 2),
          time: getTimeAgo(c.created_at),
          text: c.content,
          likes: c.reaction_count ?? 0,
          myReaction: c.my_reaction ?? null,
          t: 3,
          replies: [],
        }));

        const roots: Comment[] = [];
        nodes.forEach((node) => {
          const parent = node.parent_comment_id ? nodes.get(node.parent_comment_id) : undefined;
          if (parent) parent.replies.push(node);
          else roots.push(node);
        });
        postComments[pid] = roots;
      });

      set({ comments: postComments });
    } catch (err) {
      console.error('loadComments', err);
    }
  }, [authHeaders, set]);

  // One pass on mount, and again whenever sign-in state changes so my_reaction
  // arrives (or clears) with the rows instead of needing a page reload.
  useEffect(() => {
    (async () => {
      const ids = await loadPosts();
      await loadComments(ids);
    })();
  }, [loadPosts, loadComments]);

  /** Re-pull posts and threads, used after writing a comment or a reply. */
  const refresh = useCallback(async () => {
    const ids = await loadPosts();
    await loadComments(ids);
  }, [loadPosts, loadComments]);

  /**
   * POST a comment (or a reply when parentId is given) and re-read the thread.
   *
   * The create endpoints answer with an empty 200, and the row the UI needs
   * carries joined fields (display_name, role) that the insert does not return,
   * so the thread is re-fetched rather than patched together on the client.
   */
  const postComment = useCallback(async (postId: string, text: string, parentId?: string) => {
    const url = parentId
      ? `${API_URL}/comment/${postId}/replyto/${parentId}`
      : `${API_URL}/comment/${postId}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await refresh();
      return true;
    } catch (err) {
      console.error('postComment', err);
      return false;
    }
  }, [authHeaders, refresh]);

  /**
   * Load the moderation queue. /report/fetch is mod-only (403 otherwise), so
   * this runs only once the server has confirmed is_mod.
   */
  const loadReports = useCallback(async () => {
    if (!isMod || !token) return;
    try {
      const res = await fetch(`${API_URL}/report/fetch`, { headers: authHeaders() });
      if (!res.ok) throw new Error(String(res.status));
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error(rows?.message ?? 'bad /report/fetch payload');

      const status: Record<string, ReportStatus> = {};
      const reason: Record<string, string> = {};
      const rid: Record<string, string> = {};
      // A post can hold several tickets; the newest one represents it in the queue.
      [...rows]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .forEach((r: any) => {
          status[r.post_id] = r.status;
          reason[r.post_id] = r.reason;
          rid[r.post_id] = r.id;
        });
      set({ reportStatus: status, reportReason: reason, reportId: rid });
    } catch (err) {
      console.error('loadReports', err);
    }
  }, [isMod, token, authHeaders, set]);

  useEffect(() => { loadReports(); }, [loadReports]);

  /** Toggle a reaction on one comment and write the server's totals into the tree. */
  const reactToComment = useCallback(async (commentId: string, next: ReactionType) => {
    try {
      const res = await fetch(`${API_URL}/comment/${commentId}/react`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reaction_type: next }),
      });
      if (!res.ok) throw new Error((await res.json())?.message ?? String(res.status));
      const { reaction_count, my_reaction } = await res.json();

      // The target may be a root comment or a reply nested under one.
      const apply = (c: any) => (c.id === commentId ? { ...c, likes: reaction_count, myReaction: my_reaction } : c);
      set((prev) => ({
        comments: Object.fromEntries(
          Object.entries(prev.comments).map(([pid, list]) => [
            pid,
            list.map((c) => ({ ...apply(c), replies: (c.replies ?? []).map(apply) })),
          ]),
        ),
      }));
    } catch (err) {
      console.error('reactToComment', err);
      flash('กดรีแอคไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  }, [authHeaders, set, flash]);

  // Accent palette
  useEffect(() => {
    const v = ACCENT_MAP[accentColor];
    if (!v) return;
    const r = document.documentElement.style;
    ['--color-accent', '--color-accent-600', '--color-accent-700', '--color-accent-200', '--color-accent-100', '--color-accent-800']
      .forEach((k, i) => r.setProperty(k, v[i]));
  }, [accentColor]);

  // Viewport width + Escape to close the post modal
  useEffect(() => {
    const onResize = () => set({ w: window.innerWidth });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ activeId: null, replyTo: null }); };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      clearTimeout(toastTimer.current);
    };
  }, [set]);

  // Modal scroll lock
  const locked = !!(st.activeId || st.composeOpen || st.editFor || st.reportFor);
  useEffect(() => {
    document.body.classList.toggle('wnm-locked', locked);
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.body.classList.remove('wnm-locked');
      document.documentElement.style.overflow = '';
    };
  }, [locked]);

  const wide = st.w >= 880;

  const visible = useMemo(() => {
    const needle = st.q.trim().toLowerCase();
    return st.posts.filter((p) => {
      const cats = p.cats || [];
      if (st.view === 'announce' && !p.important) return false;
      if (st.view === 'interests' && !cats.some((c) => st.interests.includes(c))) return false;
      if (st.view === 'questions' && !cats.includes(QA)) return false;
      if (st.cat && !cats.includes(st.cat)) return false;
      if (needle && !`${p.title} ${p.body} ${p.name} ${cats.join(' ')}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [st.posts, st.view, st.interests, st.cat, st.q]);

  const feed = useMemo(
    () => [...visible].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0)),
    [visible],
  );

  const openPost = (id: string) => set({ activeId: id, notifOpen: false, replyTo: null, replyDraft: '', composerOpen: false, shown: 12 });

  /** `id` is the post id; the ticket it maps to is what actually gets updated. */
  const setStatus = async (id: string, next: ReportStatus) => {
    const rid = st.reportId[id];
    if (!rid) return flash('ไม่พบตั๋วรายงานของโพสต์นี้');

    const before = st.reportStatus[id];
    set((prev) => ({ reportStatus: { ...prev.reportStatus, [id]: next } }));
    try {
      const res = await fetch(`${API_URL}/report/update/${rid}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      flash(`เปลี่ยนสถานะรายงานเป็น ${next}`);
    } catch (err) {
      console.error('setStatus', err);
      set((prev) => ({ reportStatus: { ...prev.reportStatus, [id]: before } }));
      flash('เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const openEdit = (id: string) => {
    const p = st.posts.find((x) => x.id === id);
    if (!p) return;
    set({ editFor: id, editTitle: p.title, editBody: p.body, editCats: [...(p.cats || [])], editImportant: !!p.important });
  };

  /**
   * Send a reaction and adopt the counts the server replies with.
   *
   * The endpoint is the single source of truth: posting the reaction already
   * held clears it, so the caller just forwards what the user tapped and writes
   * back whatever comes home. No optimistic +1 to drift out of sync.
   */
  const reactToPost = useCallback(async (pid: string, next: ReactionType) => {
    try {
      const res = await fetch(`${API_URL}/post/${pid}/react`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reaction_type: next }),
      });
      if (!res.ok) throw new Error((await res.json())?.message ?? String(res.status));
      const { reaction_count, my_reaction } = await res.json();
      set((prev) => ({
        posts: prev.posts.map((p) => (p.id === pid ? { ...p, likes: reaction_count, myReaction: my_reaction } : p)),
      }));
    } catch (err) {
      console.error('reactToPost', err);
      flash('กดรีแอคไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  }, [authHeaders, set, flash]);

  const cardProps = (p: Post) => ({
    CATS: st.CATS,
    post: p,
    commentCount: (st.comments[p.id] || []).length,
    reportStatus: st.reportStatus[p.id],
    isGuest,
    isMod,
    onReact: (r: ReactionType) => reactToPost(p.id, r),
    onGate: gate,
    onOpen: () => openPost(p.id),
    onEdit: () => openEdit(p.id),
    onReport: () => (isGuest ? gate() : set({ reportFor: p.id, reason: null })),
    onSetStatus: (s: ReportStatus) => setStatus(p.id, s),
  });

  const railAnnounce = st.posts.filter((p) => p.important)
    .sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || b.likes - a.likes)
    .slice(0, 4);

  // Prefer the signed-in identity; ME is only the fallback while it loads.
  const meName = isGuest ? 'ผู้เยี่ยมชม' : (me?.display_name ?? ME.name);
  const meInitials = isGuest ? 'G' : meName.slice(0, 2);
  const meAvatar = avatarStyle(isGuest ? 3 : ME.tint, 34);

  const roleBanner = isMod
    ? 'โหมดผู้ดูแล · แตะชิปสถานะบนโพสต์ที่ถูกรายงานเพื่อเปลี่ยน Open → Reviewed → Dismissed'
    : isGuest ? 'กำลังดูในฐานะผู้ใช้ภายนอก (Non-CMU) · อ่านได้เท่านั้น' : '';

  const openCompose = () => (isGuest ? gate() : set({ composeOpen: true, notifOpen: false }));
  const goHome = () => set({ activeId: null, replyTo: null, notifOpen: false });

  const active = st.posts.find((p) => p.id === st.activeId);

  const modQueue = Object.keys(st.reportStatus)
    .map((id) => ({ id, post: st.posts.find((p) => p.id === id), status: st.reportStatus[id] }))
    .filter((r): r is { id: string; post: Post; status: ReportStatus } => !!r.post)
    .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status));

  const shellCols = st.w >= 1060 ? '212px minmax(0,1fr) 292px' : wide ? '176px minmax(0,1fr) 224px' : 'minmax(0,1fr)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: 60 }}>
      {/* ── Top bar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '11px clamp(14px,2.5vw,26px)', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-divider)' }}>
        <div onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <span style={{ width: 26, height: 26, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700 }}>ว</span>
          <span style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: '-0.01em' }}>WhongNaiMor</span>
        </div>

        <input
          className="input"
          value={st.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="ค้นหาโพสต์ หมวดหมู่ หรือผู้ใช้ · search posts, categories"
          style={{ flex: '1 1 200px', maxWidth: 420, margin: '0 auto', background: 'var(--color-surface)', fontSize: 13, padding: '9px 16px' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <button className="btn btn-ghost" onClick={() => set({ notifOpen: !st.notifOpen, readNotif: true })} style={{ fontSize: 13, color: 'var(--color-neutral-800)', padding: '6px 8px' }}>
            การแจ้งเตือน
            {!st.readNotif && (
              <span style={{ minWidth: 17, height: 17, padding: '0 5px', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--pri)', color: '#fff', fontSize: 10, fontWeight: 700 }}>3</span>
            )}
          </button>
          <span style={meAvatar}>{meInitials}</span>

          {st.notifOpen && (
            <div style={{ position: 'absolute', right: 0, top: 44, width: 'min(340px,82vw)', background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-divider)', padding: 12, display: 'flex', flexDirection: 'column', gap: 2, animation: 'wnm-pop .16s ease both' }}>
              <span style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', padding: '2px 6px 8px' }}>แจ้งเตือนจากโพสต์ประกาศ</span>
              {NOTIFS.map((n) => (
                <button key={n.go} className="hov-bg" onClick={() => openPost(n.go)} style={{ cursor: 'pointer', textAlign: 'left', border: 0, background: 'transparent', borderRadius: 12, padding: '9px 10px', fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
                  <span style={{ fontSize: 13, lineHeight: 1.45, display: 'block' }}>{n.text}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{n.time}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: 'clamp(14px,2vw,22px) clamp(12px,2.5vw,26px)', display: 'grid', gap: 'clamp(12px,1.6vw,20px)', gridTemplateColumns: shellCols, alignItems: 'start' }}>
        {/* ── Left: views + categories ── */}
        <aside style={{ display: 'flex', gap: wide ? 14 : 8, flexDirection: wide ? 'column' : 'row', flexWrap: 'wrap', position: wide ? 'sticky' : 'static', top: 76, minWidth: 0 }}>
          <nav style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: wide ? 16 : 999, padding: wide ? 8 : '5px 6px', display: 'flex', flexDirection: wide ? 'column' : 'row', gap: wide ? 2 : 4, flex: 'none' }}>
            {([['home', 'หน้าแรก'], ['announce', 'ประกาศ'], ['interests', 'หมวดที่ฉันสนใจ']] as const).map(([k, l]) => (
              <button
                key={k}
                className="hov-bg"
                onClick={() => set({ view: k, activeId: null, replyTo: null })}
                style={{ cursor: 'pointer', border: 0, textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 13, padding: '9px 12px', borderRadius: 10, background: st.view === k ? 'var(--color-accent-200)' : 'transparent', color: st.view === k ? 'var(--color-accent-800)' : 'var(--color-neutral-800)', fontWeight: st.view === k ? 600 : 400 }}
              >
                {l}
              </button>
            ))}
          </nav>

          <div style={wide
            ? { background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 3 }
            : { display: 'flex', flexDirection: 'row', gap: 6, flex: '1 1 240px', minWidth: 0, overflowX: 'auto', padding: '2px 0', alignItems: 'center' }}
          >
            {wide && <span style={{ fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', padding: '0 6px 7px' }}>หมวดหมู่</span>}
            {st.CATS.map((c) => {
              const on = st.cat === c.name;
              return (
                <button
                  key={c.name}
                  className="hov-bg"
                  title={`Priority ${c.pri}`}
                  onClick={() => set({ cat: on ? null : c.name, activeId: null })}
                  style={wide
                    ? { cursor: 'pointer', border: 0, display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'var(--font-body)', fontSize: 12.5, padding: '7px 8px', borderRadius: 9, background: on ? 'var(--color-accent-100)' : 'transparent', color: 'var(--color-neutral-800)' }
                    : { cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 12, padding: '7px 12px', borderRadius: 999, border: `1px solid ${on ? 'transparent' : 'var(--color-divider)'}`, background: on ? 'var(--color-accent-200)' : 'var(--color-surface)', color: 'var(--color-neutral-800)' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, flex: 'none', background: c.dot }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{c.name}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--color-accent-700)' }}>{st.interests.includes(c.name) ? '★' : ''}</span>
                </button>
              );
            })}
            {st.cat && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (isGuest) return gate();
                  const has = st.interests.includes(st.cat!);
                  set((prev) => ({ interests: has ? prev.interests.filter((x) => x !== prev.cat) : [...prev.interests, prev.cat!] }));
                  flash(has ? 'ลบออกจากความสนใจแล้ว' : 'บันทึกเป็นความสนใจแล้ว · จะได้รับแจ้งเตือนประกาศในหมวดนี้');
                }}
                style={{ fontSize: 11.5, color: 'var(--color-accent-700)', justifyContent: 'flex-start', padding: '7px 8px', marginTop: 4 }}
              >
                {st.interests.includes(st.cat) ? 'ลบหมวดนี้จากความสนใจ' : 'บันทึกหมวดนี้เป็นความสนใจ'}
              </button>
            )}
          </div>
        </aside>

        {/* ── Center: feed ── */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {roleBanner && (
            <div style={{ padding: '10px 15px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.5, background: isMod ? '#e9f0dc' : 'var(--color-neutral-200)', color: 'var(--color-neutral-900)' }}>{roleBanner}</div>
          )}

          {!isGuest && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 16, padding: '12px 14px' }}>
              <span style={meAvatar}>{meInitials}</span>
              <button className="hov-bg" onClick={openCompose} style={{ flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer', border: 0, background: 'var(--color-neutral-100)', borderRadius: 999, padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-neutral-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                แบ่งปันเรื่องราวกับชุมชน มช. …
              </button>
              <button className="btn btn-primary" onClick={openCompose} style={{ flex: 'none', padding: '8px 20px', fontSize: 13 }}>โพสต์</button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '0 2px' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              {st.view === 'announce' ? 'ประกาศทั้งหมด' : st.view === 'interests' ? 'จากหมวดที่ฉันสนใจ' : 'ฟีดรวม'}
            </h3>
            <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
              {st.view === 'announce' ? 'โพสต์จากหน่วยงานและบุคลากร' : st.view === 'interests' ? 'ตามหมวดที่คุณบันทึกไว้' : 'ประกาศขึ้นก่อน แล้วตามด้วยโพสต์ทั่วไป'}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', marginLeft: 'auto' }}>{visible.length} โพสต์</span>
          </div>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: laneMode === 'two' ? 'repeat(auto-fit,minmax(min(100%,320px),1fr))' : '1fr', alignItems: 'start' }}>
            {feed.map((p) => <PostCard key={p.id} {...cardProps(p)} />)}
          </div>

          {feed.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', padding: '26px 4px', margin: 0, textAlign: 'center' }}>ไม่มีโพสต์ที่ตรงกับตัวกรองนี้</p>
          )}
        </main>

        {/* ── Right rail ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, position: wide ? 'sticky' : 'static', top: 76, minWidth: 0 }}>
          <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>ประกาศ</h5>
              <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.45 }}>ประกาศที่ถูกตรึง และประกาศจากบุคลากรที่มีการตอบรับสูงใน 24 ชั่วโมง</span>
            </div>
            {railAnnounce.map((p) => (
              <button key={p.id} className="hov-border" onClick={() => openPost(p.id)} style={{ cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 11px', borderRadius: 12, background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="tag" style={p.priority === 'urgent'
                    ? { background: '#f2c6b6', color: '#6f2f14', fontSize: 10, fontWeight: 700 }
                    : { background: 'var(--peach)', color: 'var(--color-accent-800)', fontSize: 10, fontWeight: 700 }}
                  >
                    {p.priority === 'urgent' ? 'ประกาศด่วน' : 'ประกาศ'}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--color-neutral-700)' }}>{p.likes.toLocaleString()} รีแอค</span>
                </span>
                <span style={{ fontSize: 12.5, lineHeight: 1.4, display: 'block', fontWeight: 600 }}>{p.title}</span>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-700)' }}>{p.name}</span>
              </button>
            ))}
          </section>

          {isMod && (
            <section style={{ background: 'var(--peach)', border: '1px solid var(--color-accent-300)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>งานของผู้ดูแล</h5>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-700)', lineHeight: 1.45 }}>คิวรายงานที่ยังไม่ปิด และโพสต์ที่แก้ไขล่าสุด</span>
              </div>

              <div style={{ display: 'grid', gap: 7, gridTemplateColumns: 'repeat(3,1fr)' }}>
                {([['Open', 'รอตรวจสอบ'], ['Reviewed', 'ตรวจแล้ว'], ['Dismissed', 'ยกคำร้อง']] as const).map(([k, label]) => {
                  const [bg, fg] = statusLook(k);
                  return (
                    <div key={k} style={{ background: bg, color: fg, borderRadius: 12, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>{Object.values(st.reportStatus).filter((v) => v === k).length}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-neutral-700)', lineHeight: 1.25 }}>{label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>คิวรายงาน</span>
                {modQueue.map((r) => {
                  const [bg, fg] = statusLook(r.status);
                  const actions = [
                    { label: 'แก้ไขโพสต์', onClick: () => openEdit(r.id) },
                    ...STATUSES.filter((x) => x !== r.status).map((x) => ({ label: x, onClick: () => setStatus(r.id, x) })),
                  ];
                  return (
                    <div key={r.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 12, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <button className="hov-color" onClick={() => openPost(r.id)} style={{ cursor: 'pointer', border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontFamily: 'var(--font-body)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="tag" style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700 }}>{r.status}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--color-neutral-700)' }}>{r.post.reports || 1} รายงาน</span>
                        </span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>{r.post.title}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--color-neutral-700)' }}>
                          {st.reportReason[r.id] ? `เหตุผล: ${st.reportReason[r.id]}` : 'ไม่ระบุเหตุผล'}
                        </span>
                      </button>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {actions.map((a) => (
                          <button key={a.label} className="hov-border" onClick={a.onClick} style={{ cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 10.5, padding: '5px 11px', borderRadius: 999, border: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', color: 'var(--color-neutral-800)' }}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {modQueue.length === 0 && (
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-neutral-700)', padding: '6px 2px' }}>ไม่มีรายงานที่ยังไม่ปิด</p>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {active && (
        <PostModal
          st={st}
          set={set}
          active={active}
          card={cardProps(active)}
          isGuest={isGuest}
          isMod={isMod}
          meName={meName}
          meInitials={meInitials}
          meAvatar={meAvatar}
          gate={gate}
          flash={flash}
          nextCommentId={() => `n${++ids.current.comment}`}
          onClose={goHome}
          onComment={(pid, text) => postComment(pid, text)}
          onReply={(pid, parentId, text) => postComment(pid, text, parentId)}
          onReactComment={reactToComment}
        />
      )}

      {st.composeOpen && (
        <ComposeDialog
          st={st}
          set={set}
          isMod={isMod}
          meName={meName}
          meInitials={meInitials}
          meAvatar={meAvatar}
          flash={flash}
          nextPostId={() => `p-new-${++ids.current.post}`}
          nextMediaId={() => `m${++ids.current.media}`}
        />
      )}

      {st.editFor && <EditDialog st={st} set={set} flash={flash} setStatus={setStatus} />}

      {st.reportFor && <ReportDialog st={st} set={set} flash={flash} />}

      {st.toast && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 24, zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'var(--color-accent-800)', color: '#fdf8f1', padding: '11px 20px', borderRadius: 999, boxShadow: 'var(--shadow-lg)', fontSize: 13, animation: 'wnm-rise .2s ease both', maxWidth: '90vw', textAlign: 'center' }}>
            {st.toast}
          </div>
        </div>
      )}
    </div>
  );
}

import * as api from './api';
import { supabase, getSession, getMyProfile } from './supabase';

async function shimGet(key, shared) {
  try {
    if (key === 'spark-hq-theme') {
      const v = localStorage.getItem(key);
      return v ? { value: v } : null;
    }
    switch (key) {
      case 'spark-hq-announcements': {
        const data = await api.getAnnouncements();
        return { value: JSON.stringify(data) };
      }
      case 'spark-hq-recognition': {
        const data = await api.getRecognition();
        return { value: JSON.stringify(data) };
      }
      case 'spark-hq-events': {
        const data = await api.getEvents();
        return { value: JSON.stringify(data) };
      }
      case 'spark-hq-custom-subjects': {
        const data = await api.getCustomSubjects();
        return { value: JSON.stringify(data) };
      }
      case 'spark-hq-step-completions': {
        const data = await api.getMyStepCompletions();
        return { value: JSON.stringify(data) };
      }
      case 'spark-hq-completions': {
        const data = await api.getMyQuizCompletions();
        return { value: JSON.stringify(data) };
      }
      case 'spark-hq-user-group': {
        const profile = await getMyProfile();
        return profile?.user_group ? { value: profile.user_group } : null;
      }
      case 'spark-hq-user-name': {
        const session = await getSession();
        if (!session) return null;
        const name = session.user.user_metadata?.full_name
                  || session.user.user_metadata?.name
                  || session.user.email;
        return name ? { value: name } : null;
      }
      case 'spark-hq-step-ratings': {
        const data = await api.getStepRatings();
        const session = await getSession();
        const myEmail = session?.user?.email || 'me';
        const out = {};
        Object.keys(data).forEach(k => {
          const r = data[k];
          out[k] = { up: r.up, down: r.down, voters: r.myVote ? { [myEmail]: r.myVote } : {} };
        });
        return { value: JSON.stringify(out) };
      }
      case 'spark-hq-step-flags': {
        const flags = await api.getFlags();
        const mapped = flags.map(f => ({
          id: f.id, si: f.section_idx, ii: f.item_idx, idx: f.step_idx,
          sectionCat: f.section_cat, itemName: f.item_name, stepHeading: f.step_heading,
          reason: f.reason, by: f.flagged_by_name, at: f.created_at,
          resolved: f.resolved, resolvedAt: f.resolved_at
        }));
        return { value: JSON.stringify(mapped) };
      }
      case 'spark-hq-module-comments': {
        const grouped = await api.getComments();
        const out = {};
        Object.keys(grouped).forEach(mk => {
          out[mk] = grouped[mk].map(c => ({
            id: c.id, text: c.body, by: c.posted_by_name, at: c.created_at
          }));
        });
        return { value: JSON.stringify(out) };
      }
      case 'spark-hq-activity-log': {
        const { data } = await supabase.from('hq_activity_log').select('*')
          .order('created_at', { ascending: false }).limit(2000);
        const mapped = (data || []).map(e => ({
          type: e.event_type, cat: e.cat, item: e.item_name, step: e.step_heading,
          sectionIdx: e.section_idx, itemIdx: e.item_idx, stepIdx: e.step_idx,
          by: e.user_name, at: e.created_at
        }));
        return { value: JSON.stringify(mapped) };
      }
      default:
        console.warn('[shim] unknown key:', key);
        return null;
    }
  } catch (e) {
    console.error('[shim get]', key, e);
    return null;
  }
}

async function shimSet(key, value, shared) {
  try {
    if (key === 'spark-hq-theme') {
      localStorage.setItem(key, value);
      return;
    }
    switch (key) {
      case 'spark-hq-announcements': {
        const current = await api.getAnnouncements();
        const next = JSON.parse(value);
        const currentIds = new Set(current.map(a => a.id));
        const nextIds = new Set(next.map(a => a.id));
        for (const a of current) if (!nextIds.has(a.id)) await api.deleteAnnouncement(a.id);
        for (const a of next) if (!currentIds.has(a.id)) await api.postAnnouncement(a.title, a.body, !!a.pinned);
        break;
      }
      case 'spark-hq-recognition': {
        const current = await api.getRecognition();
        const next = JSON.parse(value);
        const currentIds = new Set(current.map(r => r.id));
        const nextIds = new Set(next.map(r => r.id));
        for (const r of current) if (!nextIds.has(r.id)) await api.deleteRecognition(r.id);
        for (const r of next) if (!currentIds.has(r.id)) await api.postRecognition(r.recipient_name || r.recipient || r.to, r.message);
        break;
      }
      case 'spark-hq-events': {
        const current = await api.getEvents();
        const next = JSON.parse(value);
        const currentIds = new Set(current.map(e => e.id));
        const nextIds = new Set(next.map(e => e.id));
        for (const e of current) if (!nextIds.has(e.id)) await api.deleteEvent(e.id);
        for (const e of next) if (!currentIds.has(e.id)) await api.postEvent(e.title, e.description, e.event_date || e.date, e.event_time || e.time);
        break;
      }
      case 'spark-hq-custom-subjects': {
        const next = JSON.parse(value);
        for (const s of next) {
          await api.saveCustomSubject(s);
        }
        break;
      }
      case 'spark-hq-step-completions': {
        const next = JSON.parse(value);
        const session = await getSession();
        if (!session) break;
        const { data: existing } = await supabase.from('hq_step_completions')
          .select('section_idx,item_idx,step_idx').eq('user_id', session.user.id);
        const existingKeys = new Set((existing || []).map(r => `${r.section_idx}-${r.item_idx}-${r.step_idx}`));
        for (const k of Object.keys(next)) {
          if (existingKeys.has(k)) continue;
          const [si, ii, idx] = k.split('-').map(Number);
          await api.markStepDone(si, ii, idx, null, null, null);
        }
        break;
      }
      case 'spark-hq-completions': {
        const next = JSON.parse(value);
        for (const cat of Object.keys(next)) {
          await api.markQuizPassed(cat, null);
        }
        break;
      }
      case 'spark-hq-user-group': {
        const session = await getSession();
        if (!session) break;
        await supabase.from('hq_user_profiles')
          .update({ user_group: value }).eq('id', session.user.id);
        break;
      }
      case 'spark-hq-user-name':
        break;
      case 'spark-hq-step-ratings': {
        const next = JSON.parse(value);
        const session = await getSession();
        if (!session) break;
        const myEmail = session.user.email;
        for (const k of Object.keys(next)) {
          const r = next[k];
          const myVote = r.voters?.[myEmail] || null;
          if (myVote) {
            const [si, ii, idx] = k.split('-').map(Number);
            await api.rateStep(si, ii, idx, myVote);
          }
        }
        break;
      }
      case 'spark-hq-step-flags': {
        const next = JSON.parse(value);
        const current = await api.getFlags();
        const currentIds = new Set(current.map(f => f.id));
        for (const f of next) {
          if (!currentIds.has(f.id)) {
            await api.flagStep(f.si, f.ii, f.idx, f.sectionCat, f.itemName, f.stepHeading, f.reason);
          } else {
            const prev = current.find(c => c.id === f.id);
            if (prev && !prev.resolved && f.resolved) await api.resolveFlag(f.id);
          }
        }
        break;
      }
      case 'spark-hq-module-comments': {
        const next = JSON.parse(value);
        const current = await api.getComments();
        for (const mk of Object.keys(next)) {
          const newList = next[mk] || [];
          const oldList = current[mk] || [];
          const oldIds = new Set(oldList.map(c => c.id));
          const newIds = new Set(newList.map(c => c.id));
          for (const c of oldList) if (!newIds.has(c.id)) await api.deleteComment(c.id);
          for (const c of newList) if (!oldIds.has(c.id)) await api.addComment(mk, c.text);
        }
        break;
      }
      case 'spark-hq-activity-log':
        break;
      default:
        console.warn('[shim set] unknown key:', key);
    }
  } catch (e) {
    console.error('[shim set]', key, e);
  }
}

export function installStorageShim() {
  window.storage = {
    get: shimGet,
    set: shimSet,
    delete: async () => null,
    list: async () => ({ keys: [] })
  };
}

import { supabase, getSession } from './supabase';

export async function getAnnouncements() {
  const { data, error } = await supabase.from('hq_announcements').select('*')
    .order('pinned', { ascending: false }).order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function postAnnouncement(title, body, pinned = false) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const { data, error } = await supabase.from('hq_announcements').insert({
    title, body, pinned,
    posted_by: session.user.id,
    posted_by_name: session.user.user_metadata?.full_name || session.user.email
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('hq_announcements').delete().eq('id', id);
  if (error) throw error;
}

export async function getRecognition() {
  const { data, error } = await supabase.from('hq_recognition').select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function postRecognition(recipient_name, message) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const { data, error } = await supabase.from('hq_recognition').insert({
    recipient_name, message,
    posted_by: session.user.id,
    posted_by_name: session.user.user_metadata?.full_name || session.user.email
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRecognition(id) {
  const { error } = await supabase.from('hq_recognition').delete().eq('id', id);
  if (error) throw error;
}

export async function getEvents() {
  const { data, error } = await supabase.from('hq_events').select('*')
    .order('event_date', { ascending: true });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function postEvent(title, description, event_date, event_time) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const { data, error } = await supabase.from('hq_events').insert({
    title, description, event_date, event_time, posted_by: session.user.id
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('hq_events').delete().eq('id', id);
  if (error) throw error;
}

export async function getCustomSubjects() {
  const { data, error } = await supabase.from('hq_custom_subjects').select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function saveCustomSubject(subject) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const payload = {
    name: subject.name,
    category: subject.category || 'General',
    description: subject.description || '',
    content: subject.content || [],
    quiz: subject.quiz || [],
    has_quiz: !!subject.has_quiz,
    assigned_groups: subject.assigned_groups || ['All Employees']
  };
  if (subject.id) {
    const { data, error } = await supabase.from('hq_custom_subjects')
      .update(payload).eq('id', subject.id).select().single();
    if (error) throw error;
    return data;
  }
  payload.created_by = session.user.id;
  const { data, error } = await supabase.from('hq_custom_subjects')
    .insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomSubject(id) {
  const { error } = await supabase.from('hq_custom_subjects').delete().eq('id', id);
  if (error) throw error;
}

export async function getMyStepCompletions() {
  const session = await getSession();
  if (!session) return {};
  const { data, error } = await supabase.from('hq_step_completions')
    .select('section_idx,item_idx,step_idx').eq('user_id', session.user.id);
  if (error) { console.error(error); return {}; }
  const map = {};
  (data || []).forEach(r => { map[`${r.section_idx}-${r.item_idx}-${r.step_idx}`] = true; });
  return map;
}

export async function markStepDone(section_idx, item_idx, step_idx, section_cat, item_name, step_heading) {
  const session = await getSession();
  if (!session) return;
  const { error } = await supabase.from('hq_step_completions').upsert({
    user_id: session.user.id,
    section_idx, item_idx, step_idx, section_cat, item_name, step_heading
  }, { onConflict: 'user_id,section_idx,item_idx,step_idx' });
  if (error) console.error('[markStepDone]', error);
  await logActivity({
    event_type: 'step_done', cat: section_cat,
    item_name, step_heading, section_idx, item_idx, step_idx
  });
}

export async function getMyQuizCompletions() {
  const session = await getSession();
  if (!session) return {};
  const { data, error } = await supabase.from('hq_quiz_completions')
    .select('category').eq('user_id', session.user.id);
  if (error) { console.error(error); return {}; }
  const map = {};
  (data || []).forEach(r => { map[r.category] = true; });
  return map;
}

export async function markQuizPassed(category, score) {
  const session = await getSession();
  if (!session) return;
  const { error } = await supabase.from('hq_quiz_completions').upsert({
    user_id: session.user.id, category, score: score || null, passed: true
  }, { onConflict: 'user_id,category' });
  if (error) console.error('[markQuizPassed]', error);
  await logActivity({ event_type: 'quiz_passed', cat: category });
}

export async function getStepRatings() {
  const { data, error } = await supabase.from('hq_step_ratings').select('*');
  if (error) { console.error(error); return {}; }
  const session = await getSession();
  const myUid = session?.user?.id;
  const agg = {};
  (data || []).forEach(r => {
    const k = `${r.section_idx}-${r.item_idx}-${r.step_idx}`;
    if (!agg[k]) agg[k] = { up: 0, down: 0, myVote: null };
    if (r.rating === 'up') agg[k].up++;
    else if (r.rating === 'down') agg[k].down++;
    if (r.user_id === myUid) agg[k].myVote = r.rating;
  });
  return agg;
}

export async function rateStep(section_idx, item_idx, step_idx, rating) {
  const session = await getSession();
  if (!session) return;
  const { data: existing } = await supabase.from('hq_step_ratings')
    .select('rating').eq('user_id', session.user.id)
    .eq('section_idx', section_idx).eq('item_idx', item_idx)
    .eq('step_idx', step_idx).maybeSingle();
  if (existing && existing.rating === rating) {
    await supabase.from('hq_step_ratings').delete()
      .eq('user_id', session.user.id)
      .eq('section_idx', section_idx).eq('item_idx', item_idx).eq('step_idx', step_idx);
    return;
  }
  await supabase.from('hq_step_ratings').upsert({
    user_id: session.user.id, section_idx, item_idx, step_idx, rating
  }, { onConflict: 'user_id,section_idx,item_idx,step_idx' });
}

export async function getFlags() {
  const { data, error } = await supabase.from('hq_step_flags').select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function flagStep(section_idx, item_idx, step_idx, section_cat, item_name, step_heading, reason) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const { error } = await supabase.from('hq_step_flags').insert({
    flagged_by: session.user.id,
    flagged_by_name: session.user.user_metadata?.full_name || session.user.email,
    section_idx, item_idx, step_idx,
    section_cat, item_name, step_heading, reason
  });
  if (error) throw error;
}

export async function resolveFlag(id) {
  const session = await getSession();
  if (!session) return;
  const { error } = await supabase.from('hq_step_flags').update({
    resolved: true, resolved_by: session.user.id, resolved_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
}

export async function getComments() {
  const { data, error } = await supabase.from('hq_module_comments').select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return {}; }
  const byModule = {};
  (data || []).forEach(c => {
    if (!byModule[c.module_key]) byModule[c.module_key] = [];
    byModule[c.module_key].push(c);
  });
  return byModule;
}

export async function addComment(module_key, body) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const { data, error } = await supabase.from('hq_module_comments').insert({
    module_key, body,
    posted_by: session.user.id,
    posted_by_name: session.user.user_metadata?.full_name || session.user.email
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id) {
  const { error } = await supabase.from('hq_module_comments').delete().eq('id', id);
  if (error) throw error;
}

export async function logActivity(event) {
  const session = await getSession();
  if (!session) return;
  const { error } = await supabase.from('hq_activity_log').insert({
    user_id: session.user.id,
    user_name: session.user.user_metadata?.full_name || session.user.email,
    ...event
  });
  if (error) console.error('[logActivity]', error);
}

export async function getTeamProgress() {
  const [stepsRes, quizRes, profilesRes] = await Promise.all([
    supabase.from('hq_step_completions').select('user_id,section_idx,item_idx,step_idx,completed_at'),
    supabase.from('hq_quiz_completions').select('user_id,category,completed_at'),
    supabase.from('hq_user_profiles').select('id,email,full_name,role,division,is_manager,manager_email')
  ]);
  return {
    steps: stepsRes.data || [],
    quizzes: quizRes.data || [],
    profiles: profilesRes.data || []
  };
}

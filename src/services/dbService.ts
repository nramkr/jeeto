import { supabase } from '../lib/supabaseClient';

export { supabase };

export async function getQuestionWithDetails(questionId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (error) throw error;
  return {
    ...data,
    topic_name: data.topic,
    chapter_name: data.chapter
  };
}

export async function updateQuestionContent(questionId: string, updates: { solution_text?: string; quick_trick_text?: string }) {
  try {
    const { error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', questionId);

    if (error) {
      console.error('Supabase Update Error:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to update question content:', err);
    throw err;
  }
}

export async function getHierarchy() {
  const { data, error } = await supabase
    .from('questions')
    .select('subject, chapter, topic');
  
  if (error) throw error;
  return data;
}

export async function getTopicCheatsheet(topicName: string) {
  const { data, error } = await supabase
    .from('topic_cheatsheets')
    .select('*')
    .eq('topic_name', topicName)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveTopicCheatsheet(topicName: string, text: string) {
  const { error } = await supabase
    .from('topic_cheatsheets')
    .insert({
      topic_name: topicName,
      cheatsheet_text: text
    });

  if (error) throw error;
}

import { supabase } from '../lib/supabaseClient';

export interface TopicAccuracy {
  topic_name: string;
  attempts: number;
  accuracy: number;
}

export interface ErrorDistribution {
  error_type: string;
  count: number;
}

export interface PerformanceBreakdown {
  label: string;
  total: number;
  correct: number;
  accuracy: number;
}

export async function getOverallStats(userId: string) {
  const { data, error } = await supabase
    .from('user_question_attempts')
    .select('is_correct, time_taken_seconds')
    .eq('user_id', userId);

  if (error) throw error;

  const totalAttempts = data.length;
  const correctAttempts = data.filter(a => a.is_correct).length;
  const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
  const totalTime = data.reduce((acc, curr) => acc + curr.time_taken_seconds, 0);

  return { totalAttempts, accuracy, totalTime };
}

export async function getTopicAnalytics(userId: string): Promise<TopicAccuracy[]> {
  const { data, error } = await supabase
    .from('user_question_attempts')
    .select(`
      is_correct,
      questions (
        topic
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  const topicMap = new Map<string, { total: number; correct: number }>();

  data.forEach((attempt: any) => {
    const question = Array.isArray(attempt.questions) ? attempt.questions[0] : attempt.questions;
    if (!question) return;

    const topicName = question.topic;
    if (!topicName) return;
    
    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, { total: 0, correct: 0 });
    }
    
    const stats = topicMap.get(topicName)!;
    stats.total += 1;
    if (attempt.is_correct) stats.correct += 1;
  });

  return Array.from(topicMap.entries()).map(([name, stats]) => ({
    topic_name: name,
    attempts: stats.total,
    accuracy: (stats.correct / stats.total) * 100
  }));
}

export async function getErrorDistribution(userId: string): Promise<ErrorDistribution[]> {
  const { data, error } = await supabase
    .from('user_question_attempts')
    .select('error_type')
    .eq('user_id', userId)
    .eq('is_correct', false);

  if (error) throw error;

  const dist: Record<string, number> = {};
  data.forEach(a => {
    dist[a.error_type] = (dist[a.error_type] || 0) + 1;
  });

  return Object.entries(dist).map(([type, count]) => ({
    error_type: type,
    count
  }));
}

export async function getDailyTrend(userId: string) {
  const { data, error } = await supabase
    .from('user_question_attempts')
    .select('created_at, is_correct')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group by date and calculate 7-day moving average
  // Simplified for now: daily accuracy
  const dailyStats: Record<string, { total: number; correct: number }> = {};
  
  data.forEach(a => {
    const date = new Date(a.created_at).toISOString().split('T')[0];
    if (!dailyStats[date]) dailyStats[date] = { total: 0, correct: 0 };
    dailyStats[date].total += 1;
    if (a.is_correct) dailyStats[date].correct += 1;
  });

  return Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    accuracy: (stats.correct / stats.total) * 100
  }));
}

export async function getPerformanceBreakdown(userId: string, type: 'subject' | 'chapter' | 'exam_level' | 'answer_type') {
  const { data, error } = await supabase
    .from('user_question_attempts')
    .select(`
      is_correct,
      questions (
        subject,
        chapter,
        exam_level,
        answer_type
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  const breakdownMap = new Map<string, { total: number; correct: number }>();

  data.forEach((attempt: any) => {
    const question = Array.isArray(attempt.questions) ? attempt.questions[0] : attempt.questions;
    if (!question) return;

    let label = 'Unknown';
    if (type === 'subject') {
      label = question.subject || 'Unknown';
    } else if (type === 'chapter') {
      label = question.chapter || 'Unknown';
    } else if (type === 'exam_level') {
      label = question.exam_level === 'mains' ? 'JEE Mains' : 'JEE Advanced';
    } else if (type === 'answer_type') {
      label = question.answer_type;
    }

    if (!breakdownMap.has(label)) {
      breakdownMap.set(label, { total: 0, correct: 0 });
    }

    const stats = breakdownMap.get(label)!;
    stats.total += 1;
    if (attempt.is_correct) stats.correct += 1;
  });

  return Array.from(breakdownMap.entries()).map(([label, stats]) => ({
    label,
    total: stats.total,
    correct: stats.correct,
    accuracy: (stats.correct / stats.total) * 100
  })).sort((a, b) => b.accuracy - a.accuracy);
}

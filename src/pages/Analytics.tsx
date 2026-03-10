import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, AlertTriangle, Target, Award, BarChart2, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getOverallStats, getTopicAnalytics, getErrorDistribution, getPerformanceBreakdown, TopicAccuracy, ErrorDistribution, PerformanceBreakdown } from '../services/analyticsService';
import { generateCheatsheet } from '../services/geminiService';
import { getTopicCheatsheet, saveTopicCheatsheet } from '../services/dbService';
import MathRenderer from '../components/MathRenderer';

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ totalAttempts: number; accuracy: number; totalTime: number } | null>(null);
  const [topicStats, setTopicStats] = useState<TopicAccuracy[]>([]);
  const [errorDist, setErrorDist] = useState<ErrorDistribution[]>([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState<PerformanceBreakdown[]>([]);
  const [examBreakdown, setExamBreakdown] = useState<PerformanceBreakdown[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<PerformanceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCheatsheet, setGeneratingCheatsheet] = useState<string | null>(null);
  const [activeCheatsheet, setActiveCheatsheet] = useState<{ topic_name: string; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const [s, t, e, sub, ex, typ] = await Promise.all([
        getOverallStats(user!.id),
        getTopicAnalytics(user!.id),
        getErrorDistribution(user!.id),
        getPerformanceBreakdown(user!.id, 'subject'),
        getPerformanceBreakdown(user!.id, 'exam_level'),
        getPerformanceBreakdown(user!.id, 'answer_type')
      ]);
      setStats(s);
      setTopicStats(t);
      setErrorDist(e);
      setSubjectBreakdown(sub);
      setExamBreakdown(ex);
      setTypeBreakdown(typ);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-brand-blue-medium">Loading analytics...</div>;
  }

  const weakTopics = topicStats
    .filter(t => t.attempts >= 5) // Minimum attempts to be considered
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  const calcErrors = errorDist.find(e => e.error_type === 'calculation_error')?.count || 0;
  const totalErrors = errorDist.reduce((acc, curr) => acc + curr.count, 0);
  const calcErrorRate = totalErrors > 0 ? (calcErrors / totalErrors) * 100 : 0;

  const handleViewCheatsheet = async (topic: TopicAccuracy) => {
    if (activeCheatsheet?.topic_name === topic.topic_name) {
      setActiveCheatsheet(null);
      return;
    }

    try {
      const existing = await getTopicCheatsheet(topic.topic_name);
      if (existing) {
        setActiveCheatsheet({ topic_name: topic.topic_name, text: existing.cheatsheet_text });
        return;
      }

      setGeneratingCheatsheet(topic.topic_name);
      const text = await generateCheatsheet({ name: topic.topic_name });
      if (text) {
        await saveTopicCheatsheet(topic.topic_name, text);
        setActiveCheatsheet({ topic_name: topic.topic_name, text });
      }
    } catch (err) {
      console.error('Failed to handle cheatsheet:', err);
    } finally {
      setGeneratingCheatsheet(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="text-slate-500 mt-2">Data-driven insights into your JEE preparation.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <Target className="text-brand-blue-medium mb-4" size={32} />
          <p className="text-sm text-slate-500 uppercase font-semibold tracking-wider">Overall Accuracy</p>
          <p className="text-4xl font-bold text-slate-900">{Math.round(stats?.accuracy || 0)}%</p>
          <p className="text-xs text-slate-400 mt-2">Across {stats?.totalAttempts || 0} attempts</p>
        </div>
        <div className="card">
          <Award className="text-emerald-600 mb-4" size={32} />
          <p className="text-sm text-slate-500 uppercase font-semibold tracking-wider">Best Topic</p>
          <p className="text-2xl font-bold text-slate-900">
            {topicStats.sort((a, b) => b.accuracy - a.accuracy)[0]?.topic_name || 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-2">Highest accuracy topic</p>
        </div>
        <div className="card">
          <BarChart2 className="text-indigo-600 mb-4" size={32} />
          <p className="text-sm text-slate-500 uppercase font-semibold tracking-wider">Total Time</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats?.totalTime && stats.totalTime >= 3600 
              ? `${Math.round(stats.totalTime / 3600)}h` 
              : `${Math.round((stats?.totalTime || 0) / 60)}m`}
          </p>
          <p className="text-xs text-slate-400 mt-2">Focused practice time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-brand-blue-medium">
            <BarChart2 size={20} />
            <span>Subject & Exam Performance</span>
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">By Subject</h3>
              <div className="space-y-3">
                {subjectBreakdown.map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{Math.round(item.accuracy)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.accuracy}%` }}
                        className="h-full bg-brand-blue-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">By Exam Level</h3>
              <div className="grid grid-cols-2 gap-4">
                {examBreakdown.map(item => (
                  <div key={item.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{Math.round(item.accuracy)}%</p>
                    <p className="text-[10px] text-slate-400 mt-1">{item.total} attempts</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-brand-blue-medium">
            <Target size={20} />
            <span>Question Type Breakdown</span>
          </h2>
          <div className="space-y-4">
            {typeBreakdown.map(item => (
              <div key={item.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-brand-blue-medium">
                    {item.label}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.label === 'SCA' && 'Single Choice'}
                      {item.label === 'MCA' && 'Multiple Choice'}
                      {item.label === 'TF' && 'True / False'}
                      {item.label === 'FITB' && 'Numerical'}
                    </p>
                    <p className="text-xs text-slate-500">{item.total} questions attempted</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{Math.round(item.accuracy)}%</p>
                  <p className="text-xs text-slate-400">Accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-red-600">
            <AlertTriangle size={20} />
            <span>Weak Topics</span>
          </h2>
          <div className="space-y-4">
            {weakTopics.length > 0 ? weakTopics.map(topic => (
              <div key={topic.topic_name} className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-semibold text-slate-900">{topic.topic_name}</p>
                    <p className="text-xs text-slate-500">{topic.attempts} attempts</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{Math.round(topic.accuracy)}%</p>
                      <p className="text-xs text-red-400">Accuracy</p>
                    </div>
                    <button
                      onClick={() => handleViewCheatsheet(topic)}
                      disabled={generatingCheatsheet === topic.topic_name}
                      className="p-2 text-brand-blue-medium hover:bg-brand-blue-light rounded-lg transition-colors"
                      title="Generate Cheatsheet"
                    >
                      {generatingCheatsheet === topic.topic_name ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                    </button>
                  </div>
                </div>
                
                {activeCheatsheet?.topic_name === topic.topic_name && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-white border border-brand-blue-soft rounded-xl overflow-hidden shadow-inner"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-brand-blue-dark">Topic Cheatsheet</h4>
                      <button onClick={() => setActiveCheatsheet(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Close</button>
                    </div>
                    <div className="text-sm">
                      <MathRenderer text={activeCheatsheet.text} />
                    </div>
                  </motion.div>
                )}
              </div>
            )) : (
              <p className="text-slate-400 text-sm italic text-center py-4">Not enough data to identify weak topics.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-brand-blue-medium">
            <TrendingUp size={20} />
            <span>Insights</span>
          </h2>
          <div className="space-y-4">
            {calcErrorRate > 30 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-3">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <p className="text-sm text-amber-800">
                  <span className="font-bold">High calculation errors detected.</span> Slow down and verify steps. {Math.round(calcErrorRate)}% of your errors are due to calculation.
                </p>
              </div>
            )}
            {topicStats.length > 0 && (
              <div className="p-4 bg-brand-blue-light rounded-xl border border-brand-blue-soft">
                <p className="text-sm text-slate-700">
                  Your accuracy improved in <span className="font-bold">{topicStats.sort((a,b) => b.accuracy - a.accuracy)[0]?.topic_name}</span> this week.
                </p>
              </div>
            )}
            <p className="text-xs text-slate-400 italic">
              Analytics are updated in real-time after every attempt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

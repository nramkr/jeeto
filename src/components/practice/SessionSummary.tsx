import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Clock, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SessionSummaryProps {
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
  onRestart: () => void;
}

export default function SessionSummary({ totalQuestions, correctAnswers, totalTime, onRestart }: SessionSummaryProps) {
  const navigate = useNavigate();
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const avgTime = Math.round(totalTime / totalQuestions);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card max-w-2xl mx-auto text-center"
    >
      <h2 className="text-3xl font-bold text-brand-blue-dark mb-2">Session Complete</h2>
      <p className="text-slate-500 mb-8">Analytical summary of your practice session.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-brand-blue-light rounded-2xl">
          <Target className="mx-auto text-brand-blue-medium mb-2" size={24} />
          <p className="text-xs text-slate-500 uppercase font-semibold">Accuracy</p>
          <p className="text-xl font-bold text-slate-900">{accuracy}%</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl">
          <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={24} />
          <p className="text-xs text-slate-500 uppercase font-semibold">Correct</p>
          <p className="text-xl font-bold text-slate-900">{correctAnswers}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-2xl">
          <XCircle className="mx-auto text-red-600 mb-2" size={24} />
          <p className="text-xs text-slate-500 uppercase font-semibold">Incorrect</p>
          <p className="text-xl font-bold text-slate-900">{totalQuestions - correctAnswers}</p>
        </div>
        <div className="p-4 bg-indigo-50 rounded-2xl">
          <Clock className="mx-auto text-indigo-600 mb-2" size={24} />
          <p className="text-xs text-slate-500 uppercase font-semibold">Avg Time</p>
          <p className="text-xl font-bold text-slate-900">{avgTime}s</p>
        </div>
      </div>

      <div className="space-y-4">
        <button onClick={onRestart} className="btn-primary w-full py-3">
          Start New Session
        </button>
        <button 
          onClick={() => navigate('/analytics')} 
          className="btn-secondary w-full py-3 flex items-center justify-center space-x-2"
        >
          <span>View Detailed Analytics</span>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="mt-8 pt-8 border-t border-brand-blue-soft">
        <p className="text-sm text-slate-500 italic">
          {accuracy >= 80 ? "Excellent accuracy. Keep pushing your limits!" : 
           accuracy >= 60 ? "Good progress. Focus on the topics where you missed questions." :
           "Focus on core concepts and slow down to avoid calculation errors."}
        </p>
      </div>
    </motion.div>
  );
}

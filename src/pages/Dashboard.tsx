import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Target, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getOverallStats } from '../services/analyticsService';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<{ totalAttempts: number; accuracy: number; totalTime: number } | null>(null);

  useEffect(() => {
    if (user) {
      getOverallStats(user.id).then(setStatsData).catch(console.error);
    }
  }, [user]);

  const stats = [
    { label: 'Total Attempts', value: statsData?.totalAttempts.toString() || '0', icon: Target, color: 'text-blue-600' },
    { label: 'Accuracy', value: `${Math.round(statsData?.accuracy || 0)}%`, icon: TrendingUp, color: 'text-emerald-600' },
    { 
      label: 'Study Time', 
      value: statsData?.totalTime && statsData.totalTime >= 3600 
        ? `${Math.round(statsData.totalTime / 3600)}h` 
        : `${Math.round((statsData?.totalTime || 0) / 60)}m`, 
      icon: Clock, 
      color: 'text-indigo-600' 
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-slate-500 mt-2 italic">“Hard topics stretch the brain. Stay consistent.”</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card flex items-center space-x-4"
          >
            <div className={`p-3 rounded-xl bg-brand-blue-light ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <BookOpen size={20} className="text-brand-blue-medium" />
            <span>Recent Activity</span>
          </h2>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm text-center py-8">
              {statsData?.totalAttempts === 0 ? "No recent practice sessions found. Start your first session today." : "Keep up the momentum."}
            </p>
            <button onClick={() => navigate('/practice')} className="btn-primary w-full">Start Practice</button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <TrendingUp size={20} className="text-brand-blue-medium" />
            <span>Performance Trend</span>
          </h2>
          <div className="h-48 flex items-center justify-center bg-brand-blue-light rounded-xl border border-dashed border-brand-blue-soft">
            <p className="text-slate-400 text-sm">Analytics will appear after 20 attempts.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

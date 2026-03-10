import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Timer, CheckCircle2, XCircle, AlertCircle, BookOpen, Layers, Play } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import MathRenderer from '../components/MathRenderer';
import DiagramRenderer from '../components/practice/DiagramRenderer';
import SessionSummary from '../components/practice/SessionSummary';
import { generateSolution, generateTrick } from '../services/geminiService';
import { updateQuestionContent, getQuestionWithDetails } from '../services/dbService';
import { Lightbulb, BookOpenCheck, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  subject: string;
  chapter: string;
  topic: string;
  exam_level: string;
  answer_type: 'SCA' | 'MCA' | 'TF' | 'FITB';
  solution_text?: string;
  quick_trick_text?: string;
}

interface Subject {
  name: string;
}

interface Chapter {
  subject: string;
  name: string;
}

interface Topic {
  subject: string;
  chapter: string;
  name: string;
}

export default function Practice() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<string>('none');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, time: 0 });
  const [generatingSolution, setGeneratingSolution] = useState(false);
  const [generatingTrick, setGeneratingTrick] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showTrick, setShowTrick] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  // Selection states
  const [selectionMode, setSelectionMode] = useState(true);
  const [selectionStep, setSelectionStep] = useState(0); // 0: Level, 1: Subject, 2: Type, 3: Chapters/Topics, 4: Count
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedExamLevel, setSelectedExamLevel] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectionType, setSelectionType] = useState<'chapter' | 'topic'>('chapter');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [countMode, setCountMode] = useState<'total' | 'per-item'>('total');
  const [perItemCounts, setPerItemCounts] = useState<Record<string, number>>({});
  const [questionCount, setQuestionCount] = useState(20);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!selectionMode && !isSubmitted && questions.length > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [selectionMode, isSubmitted, questions.length]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    // Get unique subjects, chapters, and topics from questions table
    const { data: questionsData } = await supabase.from('questions').select('subject, chapter, topic');
    
    if (questionsData) {
      const uniqueSubjects = Array.from(new Set(questionsData.map(q => q.subject))).map(name => ({ name }));
      const uniqueChapters = Array.from(new Set(questionsData.map(q => JSON.stringify({ subject: q.subject, name: q.chapter }))))
        .map(str => JSON.parse(str) as Chapter);
      const uniqueTopics = Array.from(new Set(questionsData.map(q => JSON.stringify({ subject: q.subject, chapter: q.chapter, name: q.topic }))))
        .map(str => JSON.parse(str) as Topic);
      
      setSubjects(uniqueSubjects);
      setChapters(uniqueChapters);
      setTopics(uniqueTopics);
    }
    setLoading(false);
  };

  const startPractice = async () => {
    if (!selectedSubject) return;
    setSelectionMode(false);
    await fetchQuestions();
  };

  const fetchQuestions = async () => {
    setLoading(true);
    let query = supabase.from('questions').select('*');
    
    if (selectedExamLevel) {
      query = query.eq('exam_level', selectedExamLevel);
    }

    if (selectedSubject) {
      query = query.eq('subject', selectedSubject);
    }
    
    if (selectionType === 'chapter' && selectedChapters.length > 0) {
      query = query.in('chapter', selectedChapters);
    } else if (selectionType === 'topic' && selectedTopics.length > 0) {
      query = query.in('topic', selectedTopics);
    }

    const { data: fetchedQuestions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
      setLoading(false);
      return;
    }

    if (!fetchedQuestions || fetchedQuestions.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    // Get user's attempt history to prioritize wrong questions
    const { data: { user } } = await supabase.auth.getUser();
    let wrongQuestionIds: Set<string> = new Set();

    if (user) {
      const { data: attempts } = await supabase
        .from('user_question_attempts')
        .select('question_id, is_correct')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (attempts) {
        // Track the latest attempt for each question
        const latestAttempts = new Map<string, boolean>();
        attempts.forEach(a => {
          if (!latestAttempts.has(a.question_id)) {
            latestAttempts.set(a.question_id, a.is_correct);
          }
        });

        latestAttempts.forEach((isCorrect, qId) => {
          if (!isCorrect) {
            wrongQuestionIds.add(qId);
          }
        });
      }
    }

    // Selection logic
    const selected: Question[] = [];
    const usedIds = new Set<string>();

    if (countMode === 'total') {
      // Weighted random selection for total count
      const weightedPool: Question[] = [];
      fetchedQuestions.forEach(q => {
        const weight = wrongQuestionIds.has(q.id) ? 3 : 1;
        for (let i = 0; i < weight; i++) {
          weightedPool.push(q);
        }
      });

      const shuffledPool = [...weightedPool].sort(() => Math.random() - 0.5);
      for (const q of shuffledPool) {
        if (selected.length >= questionCount) break;
        if (!usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
        }
      }

      // Fill remaining if needed
      if (selected.length < questionCount) {
        const remaining = fetchedQuestions.filter(q => !usedIds.has(q.id));
        const shuffledRemaining = remaining.sort(() => Math.random() - 0.5);
        for (const q of shuffledRemaining) {
          if (selected.length >= questionCount) break;
          selected.push(q);
          usedIds.add(q.id);
        }
      }
    } else {
      // Per-item selection logic
      const itemsToSelectFrom = selectionType === 'chapter' ? selectedChapters : selectedTopics;
      
      itemsToSelectFrom.forEach(itemName => {
        const targetCount = perItemCounts[itemName] || 0;
        if (targetCount <= 0) return;

        const itemQuestions = fetchedQuestions.filter(q => 
          selectionType === 'chapter' ? q.chapter === itemName : q.topic === itemName
        );

        const itemWeightedPool: Question[] = [];
        itemQuestions.forEach(q => {
          const weight = wrongQuestionIds.has(q.id) ? 3 : 1;
          for (let i = 0; i < weight; i++) {
            itemWeightedPool.push(q);
          }
        });

        const shuffledItemPool = [...itemWeightedPool].sort(() => Math.random() - 0.5);
        let itemSelectedCount = 0;
        for (const q of shuffledItemPool) {
          if (itemSelectedCount >= targetCount) break;
          if (!usedIds.has(q.id)) {
            selected.push(q);
            usedIds.add(q.id);
            itemSelectedCount++;
          }
        }

        // Fill remaining for this item if needed
        if (itemSelectedCount < targetCount) {
          const remainingItem = itemQuestions.filter(q => !usedIds.has(q.id));
          const shuffledRemainingItem = remainingItem.sort(() => Math.random() - 0.5);
          for (const q of shuffledRemainingItem) {
            if (itemSelectedCount >= targetCount) break;
            selected.push(q);
            usedIds.add(q.id);
            itemSelectedCount++;
          }
        }
      });
    }

    setQuestions(selected);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    const question = questions[currentIndex];
    let isCorrect = false;

    if (question.answer_type === 'MCA') {
      const selectedArr = (selectedAnswer || '').split(',').filter(Boolean).sort();
      const correctArr = (question.correct_answer || '').split(',').filter(Boolean).sort();
      isCorrect = selectedArr.length === correctArr.length && selectedArr.every((v, i) => v === correctArr[i]);
    } else if (question.answer_type === 'FITB') {
      isCorrect = (selectedAnswer || '').trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase();
    } else {
      isCorrect = selectedAnswer === question.correct_answer;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error: insertError } = await supabase.from('user_question_attempts').insert({
        user_id: user.id,
        question_id: question.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_taken_seconds: seconds,
        error_type: isCorrect ? 'none' : errorType,
      }).select('id').single();

      if (insertError) {
        console.error('Error saving attempt:', insertError);
      } else if (data) {
        setCurrentAttemptId(data.id);
      }
    }

    setSessionStats(prev => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
      time: prev.time + seconds
    }));

    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setSeconds(0);
      setErrorType('none');
      setCurrentAttemptId(null);
      setShowSolution(false);
      setShowTrick(false);
    } else {
      setSessionFinished(true);
    }
  };

  const handleViewSolution = async () => {
    if (showSolution) {
      setShowSolution(false);
      return;
    }

    setShowTrick(false); // Hide trick when showing solution
    const q = questions[currentIndex];
    if (q.solution_text) {
      setShowSolution(true);
      return;
    }

    setGeneratingSolution(true);
    try {
      const fullQ = await getQuestionWithDetails(q.id);
      let solution = await generateSolution(fullQ);

      // Clean up accidental JSON or code blocks
      if (solution) {
        solution = solution.replace(/```json\n?|\n?```/g, '').trim();
        if (solution.startsWith('{') && solution.endsWith('}')) {
          try {
            const parsed = JSON.parse(solution);
            solution = parsed.solution || parsed.text || solution;
          } catch (e) {
            // Not valid JSON
          }
        }
      }

      if (solution) {
        await updateQuestionContent(q.id, { solution_text: solution });
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex].solution_text = solution;
        setQuestions(updatedQuestions);
        setShowSolution(true);
      }
    } catch (err) {
      console.error('Failed to generate solution:', err);
    } finally {
      setGeneratingSolution(false);
    }
  };

  const handleViewTrick = async () => {
    if (showTrick) {
      setShowTrick(false);
      return;
    }

    setShowSolution(false); // Hide solution when showing trick
    const q = questions[currentIndex];
    if (q.quick_trick_text) {
      setShowTrick(true);
      return;
    }

    setGeneratingTrick(true);
    try {
      const fullQ = await getQuestionWithDetails(q.id);
      let trick = await generateTrick(fullQ);
      
      // Clean up accidental JSON or code blocks
      if (trick) {
        trick = trick.replace(/```json\n?|\n?```/g, '').trim();
        // If it looks like a JSON object, try to extract the message
        if (trick.startsWith('{') && trick.endsWith('}')) {
          try {
            const parsed = JSON.parse(trick);
            trick = parsed.message || parsed.text || trick;
          } catch (e) {
            // Not valid JSON, keep as is
          }
        }
      }

      if (trick) {
        await updateQuestionContent(q.id, { quick_trick_text: trick });
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex].quick_trick_text = trick;
        setQuestions(updatedQuestions);
        setShowTrick(true);
      }
    } catch (err) {
      console.error('Failed to generate trick:', err);
    } finally {
      setGeneratingTrick(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setSeconds(0);
    setErrorType('none');
    setCurrentAttemptId(null);
    setSessionFinished(false);
    setSessionStats({ correct: 0, total: 0, time: 0 });
    setSelectionMode(true);
    setSelectionStep(0);
    setSelectedExamLevel(null);
    setSelectedSubject(null);
    setSelectedChapters([]);
    setSelectedTopics([]);
    setQuestionCount(20);
  };

  const updateErrorTypeInDb = async (type: string) => {
    if (currentAttemptId) {
      const { error } = await supabase
        .from('user_question_attempts')
        .update({ error_type: type })
        .eq('id', currentAttemptId);
      
      if (error) {
        console.error('Error updating error type:', error);
      }
    }
  };

  if (loading && selectionMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue-medium"></div>
      </div>
    );
  }

  if (selectionMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Practice Session</h1>
          <p className="text-slate-500 mt-2">
            {selectionStep === 0 ? 'Choose your exam level' : 
             selectionStep === 1 ? 'Select your subject' : 
             selectionStep === 2 ? 'Choose selection method' :
             selectionStep === 3 ? (selectionType === 'chapter' ? 'Select specific chapters' : 'Select specific topics') :
             'Choose number of questions'}
          </p>
        </header>

        <div className="flex items-center space-x-2 mb-8">
          {[0, 1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                selectionStep === step ? 'bg-brand-blue-medium text-white' : 
                selectionStep > step ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step + 1}
              </div>
              {step < 4 && <div className={`h-1 w-8 sm:w-12 ${selectionStep > step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {selectionStep === 0 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-brand-blue-medium">
                <Layers size={20} />
                <span>Exam Level</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['mains', 'advanced'].map(level => (
                  <button
                    key={level}
                    onClick={() => {
                      setSelectedExamLevel(level);
                      setSelectionStep(1);
                    }}
                    className={`p-6 rounded-xl border text-center transition-all capitalize text-lg ${
                      selectedExamLevel === level
                        ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                        : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                    }`}
                  >
                    JEE {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectionStep === 1 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-brand-blue-medium">
                  <BookOpen size={20} />
                  <span>Select Subject</span>
                </h2>
                <button onClick={() => setSelectionStep(0)} className="text-sm text-brand-blue-medium hover:underline">Back to Level</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {subjects.map(subject => (
                  <button
                    key={subject.name}
                    onClick={() => {
                      setSelectedSubject(subject.name);
                      setSelectedChapters([]);
                      setSelectedTopics([]);
                      setSelectionStep(2);
                    }}
                    className={`p-6 rounded-xl border text-center transition-all ${
                      selectedSubject === subject.name
                        ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                        : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectionStep === 2 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-brand-blue-medium">
                  <Layers size={20} />
                  <span>Selection Method</span>
                </h2>
                <button onClick={() => setSelectionStep(1)} className="text-sm text-brand-blue-medium hover:underline">Back to Subject</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSelectionType('chapter');
                    setSelectionStep(3);
                  }}
                  className={`p-6 rounded-xl border text-center transition-all ${
                    selectionType === 'chapter'
                      ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                      : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                  }`}
                >
                  Chapter-wise
                </button>
                <button
                  onClick={() => {
                    setSelectionType('topic');
                    setSelectionStep(3);
                  }}
                  className={`p-6 rounded-xl border text-center transition-all ${
                    selectionType === 'topic'
                      ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                      : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                  }`}
                >
                  Topic-wise (Sub-topics)
                </button>
              </div>
            </div>
          )}

          {selectionStep === 3 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-brand-blue-medium">
                  <Layers size={20} />
                  <span>Select {selectionType === 'chapter' ? 'Chapters' : 'Topics'}</span>
                </h2>
                <button onClick={() => setSelectionStep(2)} className="text-sm text-brand-blue-medium hover:underline">Back to Method</button>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                {selectionType === 'chapter' ? (
                  <>
                    <button
                      onClick={() => setSelectedChapters([])}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedChapters.length === 0
                          ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                          : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                      }`}
                    >
                      All Chapters
                    </button>
                    {chapters.filter(c => c.subject === selectedSubject).map(chapter => (
                      <button
                        key={chapter.name}
                        onClick={() => {
                          if (selectedChapters.includes(chapter.name)) {
                            setSelectedChapters(selectedChapters.filter(name => name !== chapter.name));
                          } else {
                            setSelectedChapters([...selectedChapters, chapter.name]);
                          }
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedChapters.includes(chapter.name)
                            ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                            : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                        }`}
                      >
                        {chapter.name}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedTopics([])}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedTopics.length === 0
                          ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                          : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                      }`}
                    >
                      All Topics
                    </button>
                    {topics.filter(t => t.subject === selectedSubject).map(topic => (
                      <button
                        key={`${topic.chapter}-${topic.name}`}
                        onClick={() => {
                          if (selectedTopics.includes(topic.name)) {
                            setSelectedTopics(selectedTopics.filter(name => name !== topic.name));
                          } else {
                            setSelectedTopics([...selectedTopics, topic.name]);
                          }
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedTopics.includes(topic.name)
                            ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                            : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wider">{topic.chapter}</span>
                          <span>{topic.name}</span>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setSelectionStep(4)}
                  className="btn-primary flex items-center space-x-2 px-8 py-3"
                >
                  <span>Next Step</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {selectionStep === 4 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-brand-blue-medium">
                  <Layers size={20} />
                  <span>Question Count</span>
                </h2>
                <button onClick={() => setSelectionStep(3)} className="text-sm text-brand-blue-medium hover:underline">Back to Selection</button>
              </div>
              
              <div className="space-y-8">
                <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                  <button
                    onClick={() => setCountMode('total')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      countMode === 'total' ? 'bg-white text-brand-blue-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Total Questions
                  </button>
                  <button
                    onClick={() => {
                      setCountMode('per-item');
                      // Initialize counts if empty
                      const items = selectionType === 'chapter' ? selectedChapters : selectedTopics;
                      const newCounts = { ...perItemCounts };
                      items.forEach(item => {
                        if (!newCounts[item]) newCounts[item] = 5;
                      });
                      setPerItemCounts(newCounts);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      countMode === 'per-item' ? 'bg-white text-brand-blue-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Per {selectionType === 'chapter' ? 'Chapter' : 'Topic'}
                  </button>
                </div>

                {countMode === 'total' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-4">How many questions would you like to practice in total?</label>
                    <div className="flex items-center space-x-4">
                      {[10, 20, 30, 50].map(count => (
                        <button
                          key={count}
                          onClick={() => setQuestionCount(count)}
                          className={`px-6 py-3 rounded-xl border transition-all ${
                            questionCount === count
                              ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark font-bold'
                              : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                      <div className="relative flex-1 max-w-[120px]">
                        <input
                          type="number"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                          className="w-full p-3 rounded-xl border border-brand-blue-soft focus:ring-2 focus:ring-brand-blue-medium focus:border-transparent outline-none"
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Set question count for each selected {selectionType}:</label>
                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2">
                      {(selectionType === 'chapter' ? selectedChapters : selectedTopics).map(itemName => (
                        <div key={itemName} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-medium text-slate-700 truncate mr-4">{itemName}</span>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => setPerItemCounts(prev => ({ ...prev, [itemName]: Math.max(1, (prev[itemName] || 5) - 1) }))}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            >-</button>
                            <input
                              type="number"
                              value={perItemCounts[itemName] || 5}
                              onChange={(e) => setPerItemCounts(prev => ({ ...prev, [itemName]: parseInt(e.target.value) || 0 }))}
                              className="w-12 text-center bg-transparent font-bold text-brand-blue-dark"
                              min="1"
                            />
                            <button 
                              onClick={() => setPerItemCounts(prev => ({ ...prev, [itemName]: (prev[itemName] || 5) + 1 }))}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            >+</button>
                          </div>
                        </div>
                      ))}
                      {(selectionType === 'chapter' ? selectedChapters : selectedTopics).length === 0 && (
                        <div className="text-center py-8 text-slate-400 italic">
                          No {selectionType}s selected. Go back to select some.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-amber-800">
                    Questions will be selected randomly, with priority given to topics where you've previously made errors.
                  </p>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    onClick={startPractice}
                    disabled={(countMode === 'per-item' && (selectionType === 'chapter' ? selectedChapters : selectedTopics).length === 0)}
                    className="btn-primary flex items-center space-x-3 px-12 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play size={20} fill="currentColor" />
                    <span>Start Practice</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue-medium"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-700">No questions available</h2>
        <p className="text-slate-500 mt-2">Please add questions to the database to start practicing.</p>
      </div>
    );
  }

  if (sessionFinished) {
    return (
      <SessionSummary 
        totalQuestions={sessionStats.total}
        correctAnswers={sessionStats.correct}
        totalTime={sessionStats.time}
        onRestart={handleRestart}
      />
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-brand-blue-medium bg-brand-blue-soft px-3 py-1 rounded-full uppercase tracking-wider">
            {currentQuestion.exam_level}
          </span>
          <span className="text-sm text-slate-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-slate-500 font-mono">
          <Timer size={18} />
          <span>{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="card"
        >
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                currentQuestion.answer_type === 'MCA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {currentQuestion.answer_type === 'SCA' && 'Single Correct'}
                {currentQuestion.answer_type === 'MCA' && 'Multiple Correct'}
                {currentQuestion.answer_type === 'TF' && 'True / False'}
                {currentQuestion.answer_type === 'FITB' && 'Numerical'}
              </span>
            </div>
            {currentQuestion.answer_type === 'MCA' && !isSubmitted && (
              <span className="text-[11px] text-brand-blue-medium font-bold italic animate-pulse">
                Select all that apply
              </span>
            )}
          </div>

          <div className="mb-8 overflow-hidden rounded-xl bg-slate-50 flex justify-center items-center p-4 border border-slate-100">
            <img 
              src={currentQuestion.question_text} 
              alt="Question" 
              className="max-w-full h-auto max-h-[500px] object-contain rounded-lg shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>

          {currentQuestion.answer_type === 'FITB' ? (
            <div className="mb-8">
              <input
                type="text"
                disabled={isSubmitted}
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-4 rounded-xl border border-brand-blue-soft focus:ring-2 focus:ring-brand-blue-medium focus:border-transparent outline-none transition-all text-lg"
              />
            </div>
          ) : currentQuestion.answer_type === 'TF' ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {['True', 'False'].map((option) => (
                <button
                  key={option}
                  disabled={isSubmitted}
                  onClick={() => setSelectedAnswer(option)}
                  className={`flex items-center justify-center p-6 rounded-xl border transition-all text-xl font-bold ${
                    selectedAnswer === option
                      ? 'border-brand-blue-medium bg-brand-blue-light text-brand-blue-dark'
                      : 'border-brand-blue-soft hover:border-brand-blue-medium/50 text-slate-600'
                  } ${
                    isSubmitted && option === (currentQuestion.correct_answer || '')
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : isSubmitted && selectedAnswer === option && option !== (currentQuestion.correct_answer || '')
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : ''
                  }`}
                >
                  {option}
                  {isSubmitted && option === (currentQuestion.correct_answer || '') && (
                    <CheckCircle2 className="text-emerald-500 ml-2" size={24} />
                  )}
                  {isSubmitted && selectedAnswer === option && option !== (currentQuestion.correct_answer || '') && (
                    <XCircle className="text-red-500 ml-2" size={24} />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-8">
              {Object.entries(currentQuestion.options || {}).map(([key, value]) => {
                const isSelected = currentQuestion.answer_type === 'MCA' 
                  ? (selectedAnswer || '').split(',').includes(key)
                  : selectedAnswer === key;
                
                const isCorrectOption = currentQuestion.answer_type === 'MCA'
                  ? (currentQuestion.correct_answer || '').split(',').includes(key)
                  : key === currentQuestion.correct_answer;

                return (
                  <button
                    key={key}
                    disabled={isSubmitted}
                    onClick={() => {
                      if (currentQuestion.answer_type === 'MCA') {
                        const current = (selectedAnswer || '').split(',').filter(Boolean);
                        if (current.includes(key)) {
                          setSelectedAnswer(current.filter(k => k !== key).join(','));
                        } else {
                          setSelectedAnswer([...current, key].join(','));
                        }
                      } else {
                        setSelectedAnswer(key);
                      }
                    }}
                    className={`flex items-center p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-brand-blue-medium bg-brand-blue-light'
                        : 'border-brand-blue-soft hover:border-brand-blue-medium/50'
                    } ${
                      isSubmitted && isCorrectOption
                        ? 'border-emerald-500 bg-emerald-50'
                        : isSubmitted && isSelected && !isCorrectOption
                        ? 'border-red-500 bg-red-50'
                        : ''
                    }`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg border mr-4 font-bold transition-all ${
                      isSelected ? 'bg-brand-blue-medium text-white border-brand-blue-medium' : 'bg-slate-50 text-slate-500 border-brand-blue-soft'
                    }`}>
                      {currentQuestion.answer_type === 'MCA' ? (
                        <div className={`w-4 h-4 rounded-sm border-2 ${isSelected ? 'bg-white border-white' : 'border-slate-300'}`} />
                      ) : (
                        <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? 'bg-white border-white' : 'border-slate-300'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <MathRenderer text={value as string} />
                    </div>
                    {isSubmitted && isCorrectOption && (
                      <CheckCircle2 className="text-emerald-500 ml-2" size={20} />
                    )}
                    {isSubmitted && isSelected && !isCorrectOption && (
                      <XCircle className="text-red-500 ml-2" size={20} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {isSubmitted && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-brand-blue-soft">
                <div className="flex items-center space-x-2 mb-4">
                  {selectedAnswer === (currentQuestion.correct_answer || '') ? (
                    <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                      <CheckCircle2 size={20} />
                      <span>Correct! Well done.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-red-600 font-bold">
                        <XCircle size={20} />
                        <span>Incorrect. Review the concept.</span>
                      </div>
                      {currentQuestion.answer_type === 'FITB' && (
                        <div className="text-sm text-slate-600 bg-white p-2 rounded border border-red-100">
                          <span className="font-semibold">Correct Answer:</span> {currentQuestion.correct_answer || 'N/A'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedAnswer !== (currentQuestion.correct_answer || '') && (
                  <>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Why did you miss this?</label>
                    <select 
                      value={errorType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setErrorType(newType);
                        updateErrorTypeInDb(newType);
                      }}
                      className="w-full p-2 rounded-lg border border-brand-blue-soft outline-none"
                    >
                      <option value="none">Select error type</option>
                      <option value="concept_gap">Concept Gap</option>
                      <option value="formula_recall">Formula Recall</option>
                      <option value="calculation_error">Calculation Error</option>
                      <option value="misread_question">Misread Question</option>
                      <option value="time_pressure">Time Pressure</option>
                      <option value="guessed">Guessed</option>
                    </select>
                  </>
                )}
             </div>
          )}

          {isSubmitted && (
            <div className="mt-8 space-y-4 border-t border-brand-blue-soft pt-6">
              <div className="flex space-x-4">
                <button
                  onClick={handleViewSolution}
                  disabled={generatingSolution}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  {generatingSolution ? <Loader2 className="animate-spin" size={18} /> : <BookOpenCheck size={18} />}
                  <span>{showSolution ? 'Hide Solution' : 'View Solution'}</span>
                </button>
                <button
                  onClick={handleViewTrick}
                  disabled={generatingTrick}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  {generatingTrick ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
                  <span>{showTrick ? 'Hide Trick' : '30s Trick'}</span>
                </button>
              </div>

              {showSolution && currentQuestion.solution_text && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-slate-50 rounded-xl border border-brand-blue-soft"
                >
                  <h3 className="text-lg font-bold text-brand-blue-dark mb-4">Detailed Solution</h3>
                  <MathRenderer text={currentQuestion.solution_text} />
                </motion.div>
              )}

              {showTrick && currentQuestion.quick_trick_text && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-amber-50 rounded-xl border border-amber-200"
                >
                  <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center space-x-2">
                    <Lightbulb size={20} />
                    <span>30-Second Trick</span>
                  </h3>
                  <MathRenderer text={currentQuestion.quick_trick_text} />
                </motion.div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t border-brand-blue-soft mt-8">
            <div className="text-sm text-slate-400 italic">
              {!isSubmitted && "Select an option to submit"}
            </div>
            
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="btn-primary flex items-center space-x-2"
              >
                <span>Submit Answer</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="btn-primary flex items-center space-x-2"
              >
                <span>{currentIndex === questions.length - 1 ? 'Finish Session' : 'Next Question'}</span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

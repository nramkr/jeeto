import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown, 
  Book, 
  FileText, 
  Loader2, 
  Download, 
  Maximize2, 
  Minimize2,
  AlertCircle,
  Search
} from 'lucide-react';
import { getHierarchy, getTopicCheatsheet, saveTopicCheatsheet } from '../services/dbService';
import { generateCheatsheet } from '../services/geminiService';
import MathRenderer from '../components/MathRenderer';

interface HierarchyItem {
  subject: string;
  chapter: string;
  topic: string;
}

interface GroupedHierarchy {
  [subject: string]: {
    [chapter: string]: string[];
  };
}

export default function Cheatsheets() {
  const [hierarchy, setHierarchy] = useState<HierarchyItem[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [cheatsheet, setCheatsheet] = useState<string | null>(null);
  const [loadingCheatsheet, setLoadingCheatsheet] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getHierarchy();
      setHierarchy(data);
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const groupedData = useMemo(() => {
    const grouped: GroupedHierarchy = {};
    hierarchy.forEach(({ subject, chapter, topic }) => {
      if (!grouped[subject]) grouped[subject] = {};
      if (!grouped[subject][chapter]) grouped[subject][chapter] = [];
      if (!grouped[subject][chapter].includes(topic)) {
        grouped[subject][chapter].push(topic);
      }
    });
    return grouped;
  }, [hierarchy]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return groupedData;
    
    const filtered: GroupedHierarchy = {};
    const query = searchQuery.toLowerCase();

    Object.entries(groupedData).forEach(([subject, chapters]) => {
      const filteredChapters: { [chapter: string]: string[] } = {};
      
      Object.entries(chapters).forEach(([chapter, topics]) => {
        const filteredTopics = topics.filter(t => t.toLowerCase().includes(query));
        
        if (chapter.toLowerCase().includes(query) || filteredTopics.length > 0) {
          filteredChapters[chapter] = filteredTopics.length > 0 ? filteredTopics : topics;
        }
      });

      if (subject.toLowerCase().includes(query) || Object.keys(filteredChapters).length > 0) {
        filtered[subject] = Object.keys(filteredChapters).length > 0 ? filteredChapters : chapters;
      }
    });

    return filtered;
  }, [groupedData, searchQuery]);

  const handleTopicClick = async (topic: string, chapter: string, subject: string) => {
    setSelectedTopic(topic);
    setSelectedChapter(chapter);
    setSelectedSubject(subject);
    setCheatsheet(null);
    setLoadingCheatsheet(true);

    try {
      const existing = await getTopicCheatsheet(topic);
      if (existing) {
        setCheatsheet(existing.cheatsheet_text);
      } else {
        const generated = await generateCheatsheet({ 
          name: topic, 
          chapter_name: chapter, 
          subject_name: subject 
        });
        if (generated) {
          setCheatsheet(generated);
          try {
            await saveTopicCheatsheet(topic, generated);
          } catch (saveErr) {
            console.warn('Failed to save cheatsheet to DB (RLS?), but showing to user:', saveErr);
          }
        }
      }
    } catch (err) {
      console.error('Error loading cheatsheet:', err);
    } finally {
      setLoadingCheatsheet(false);
    }
  };

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const toggleChapter = (chapter: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapter)) {
      newExpanded.delete(chapter);
    } else {
      newExpanded.add(chapter);
    }
    setExpandedChapters(newExpanded);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex h-[calc(100vh-120px)] gap-6 ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-6 h-screen' : ''}`}>
      {/* Sidebar Navigation */}
      {!isFullScreen && (
        <div className="w-80 flex flex-col bg-white rounded-2xl border border-brand-blue-soft overflow-hidden shadow-sm">
          <div className="p-4 border-b border-brand-blue-soft bg-slate-50">
            <h2 className="font-bold text-brand-blue-dark flex items-center gap-2">
              <Book size={18} />
              <span>Topics</span>
            </h2>
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-medium outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {loadingHierarchy ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-xs">Loading hierarchy...</span>
              </div>
            ) : Object.keys(filteredData).length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">
                No topics found.
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(filteredData).map(([subject, chapters]) => (
                  <div key={subject} className="space-y-1">
                    <button 
                      onClick={() => toggleSubject(subject)}
                      className="w-full flex items-center justify-between p-2 hover:bg-brand-blue-light rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          subject === 'Mathematics' ? 'bg-blue-500' : 
                          subject === 'Physics' ? 'bg-purple-500' : 'bg-emerald-500'
                        }`} />
                        <span className="text-sm font-bold text-slate-700">{subject}</span>
                      </div>
                      {expandedSubjects.has(subject) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    </button>
                    
                    <AnimatePresence>
                      {expandedSubjects.has(subject) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-4 space-y-1"
                        >
                          {Object.entries(chapters).map(([chapter, topics]) => (
                            <div key={chapter} className="space-y-1">
                              <button 
                                onClick={() => toggleChapter(chapter)}
                                className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors"
                              >
                                <span className="text-xs font-semibold text-slate-500 truncate">{chapter}</span>
                                {expandedChapters.has(chapter) ? <ChevronDown size={12} className="text-slate-300" /> : <ChevronRight size={12} className="text-slate-300" />}
                              </button>
                              
                              <AnimatePresence>
                                {expandedChapters.has(chapter) && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden pl-2 space-y-0.5"
                                  >
                                    {topics.map(topic => (
                                      <button 
                                        key={topic}
                                        onClick={() => handleTopicClick(topic, chapter, subject)}
                                        className={`w-full text-left p-2 rounded-lg text-xs transition-all ${
                                          selectedTopic === topic 
                                            ? 'bg-brand-blue-medium text-white font-medium shadow-sm' 
                                            : 'text-slate-600 hover:bg-brand-blue-light hover:text-brand-blue-medium'
                                        }`}
                                      >
                                        {topic}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-brand-blue-soft overflow-hidden shadow-sm relative">
        {/* Toolbar */}
        <div className="p-4 border-b border-brand-blue-soft bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue-light rounded-lg text-brand-blue-medium">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                {selectedTopic || 'Select a topic to view cheatsheet'}
              </h3>
              {selectedChapter && (
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  {selectedSubject} • {selectedChapter}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {cheatsheet && (
              <>
                <button 
                  onClick={handlePrint}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Print / Export PDF"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
          {loadingCheatsheet ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-brand-blue-soft border-t-brand-blue-medium rounded-full animate-spin"></div>
                <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-blue-medium" size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">Generating Master Cheatsheet</p>
                <p className="text-sm text-slate-400 mt-1 italic">This takes about 15-20 seconds for high-density content...</p>
              </div>
            </div>
          ) : cheatsheet ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[800px] mx-auto bg-white shadow-xl border border-slate-200 p-12 min-h-[1100px] print:shadow-none print:border-none print:p-0"
              id="cheatsheet-content"
            >
              <div className="prose prose-slate max-w-none cheatsheet-typography">
                <MathRenderer text={cheatsheet} />
              </div>
              
              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-300 uppercase tracking-widest font-bold print:hidden">
                <span>JEETO Master Series</span>
                <span>Topic: {selectedTopic}</span>
                <span>Page 1 of 1</span>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                <Book size={40} />
              </div>
              <div className="text-center max-w-xs">
                <p className="font-bold text-slate-400">Knowledge Repository</p>
                <p className="text-sm mt-2">Select a topic from the sidebar to view or generate a high-density A4 revision sheet.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cheatsheet-content, #cheatsheet-content * {
            visibility: visible;
          }
          #cheatsheet-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
        
        .cheatsheet-typography h1 {
          font-size: 2.5rem;
          font-weight: 900;
          color: #1e40af;
          border-bottom: 4px solid #3b82f6;
          padding-bottom: 0.5rem;
          margin-bottom: 2rem;
          text-transform: uppercase;
          letter-spacing: -0.02em;
        }
        
        .cheatsheet-typography h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e40af;
          background: #f0f7ff;
          padding: 0.5rem 1rem;
          border-left: 4px solid #3b82f6;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .cheatsheet-typography h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #334155;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cheatsheet-typography p, .cheatsheet-typography li {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #475569;
        }

        .cheatsheet-typography table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.75rem;
        }

        .cheatsheet-typography th {
          background: #f8fafc;
          text-align: left;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          font-weight: 700;
          color: #1e40af;
        }

        .cheatsheet-typography td {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .cheatsheet-typography strong {
          color: #1e40af;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

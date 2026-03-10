-- ENUMS
CREATE TYPE exam_level_enum AS ENUM ('mains', 'advanced');
CREATE TYPE error_type_enum AS ENUM (
  'concept_gap',
  'formula_recall',
  'calculation_error',
  'misread_question',
  'time_pressure',
  'guessed',
  'none'
);

-- TABLES

-- Note: Supabase handles auth.users, but we can have a public.users profile if needed.
-- For this single-user system, we'll follow the prompt's request.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE answer_type_enum AS ENUM ('SCA', 'MCA', 'TF', 'FITB');

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  topic TEXT NOT NULL,
  year INTEGER,
  exam_level exam_level_enum NOT NULL,
  answer_type answer_type_enum NOT NULL DEFAULT 'SCA',
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Format: {"A": "...", "B": "...", "C": "...", "D": "..."}
  correct_answer TEXT NOT NULL, -- e.g., "A" for SCA, "A,B" for MCA, "True" for TF, "42" for FITB
  solution_text TEXT,
  quick_trick_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE topic_cheatsheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_name TEXT NOT NULL,
  cheatsheet_text TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE TABLE user_question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  error_type error_type_enum DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic setup for single user
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_cheatsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for single-user/owner access)
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can manage their own attempts" ON user_question_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view cheatsheets" ON topic_cheatsheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can save cheatsheets" ON topic_cheatsheets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view questions" ON questions FOR SELECT TO authenticated USING (true);

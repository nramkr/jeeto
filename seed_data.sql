-- SEED DATA FOR JEETO
-- Run this after supabase_schema.sql

-- 1. Insert Questions (5 per subject)

-- MATHEMATICS
INSERT INTO questions (subject, chapter, topic, year, exam_level, question_text, options, correct_answer, answer_type) VALUES
('Mathematics', 'Calculus', 'Definite Integrals', 2023, 'mains', 'https://picsum.photos/seed/math1/800/400', '{"A": "$\\pi/2$", "B": "$\\pi/4$", "C": "$\\pi/8$", "D": "0"}', 'B', 'SCA'),
('Mathematics', 'Algebra', 'Complex Numbers', 2022, 'advanced', 'https://picsum.photos/seed/math2/800/400', '{"A": "$z$", "B": "$\\bar{z}$", "C": "1", "D": "None of these"}', 'A', 'SCA'),
('Mathematics', 'Calculus', 'Definite Integrals', 2021, 'mains', 'https://picsum.photos/seed/math3/800/400', '{"A": "1/6", "B": "-1/6", "C": "1/3", "D": "-1/3"}', 'B', 'SCA'),
('Mathematics', 'Algebra', 'Complex Numbers', 2023, 'advanced', 'https://picsum.photos/seed/math4/800/400', '{"A": "1", "2": "2", "C": "Infinite", "D": "0"}', 'C', 'SCA'),
('Mathematics', 'Calculus', 'Definite Integrals', 2020, 'mains', 'https://picsum.photos/seed/math5/800/400', '{"A": "1", "B": "2", "C": "4", "D": "0"}', 'B', 'SCA');

-- PHYSICS
INSERT INTO questions (subject, chapter, topic, year, exam_level, question_text, options, correct_answer, answer_type) VALUES
('Physics', 'Mechanics', 'Rotational Motion', 2023, 'mains', 'https://picsum.photos/seed/phys1/800/400', '{"A": "$\\sqrt{2gh}$", "B": "$\\sqrt{\\frac{10gh}{7}}$", "C": "$\\sqrt{\\frac{4gh}{3}}$", "D": "$\\sqrt{gh}$"}', 'B', 'SCA'),
('Physics', 'Electromagnetism', 'Electrostatics', 2022, 'advanced', 'https://picsum.photos/seed/phys2/800/400', '{"A": "$\\frac{kq}{d}$", "B": "$\\frac{2kq}{d}$", "C": "Zero", "D": "$\\frac{kq}{2d}$"}', 'C', 'SCA'),
('Physics', 'Mechanics', 'Rotational Motion', 2021, 'mains', 'https://picsum.photos/seed/phys3/800/400', '{"A": "$ML^2/12$", "B": "$ML^2/3$", "C": "$ML^2/2$", "D": "$ML^2/6$"}', 'A', 'SCA'),
('Physics', 'Electromagnetism', 'Electrostatics', 2023, 'advanced', 'https://picsum.photos/seed/phys4/800/400', '{"A": "$CV^2$", "B": "$\\frac{1}{2}CV^2$", "C": "$QV$", "D": "$\\frac{1}{2}QV^2$"}', 'B', 'SCA'),
('Physics', 'Mechanics', 'Rotational Motion', 2020, 'mains', 'https://picsum.photos/seed/phys5/800/400', '{"A": "Force", "B": "Torque", "C": "Linear Momentum", "D": "Velocity"}', 'B', 'SCA');

-- CHEMISTRY
INSERT INTO questions (subject, chapter, topic, year, exam_level, question_text, options, correct_answer, answer_type) VALUES
('Chemistry', 'Physical Chemistry', 'Chemical Equilibrium', 2023, 'mains', 'https://picsum.photos/seed/chem1/800/400', '{"A": "$K_p = K_c(RT)^2$", "B": "$K_p = K_c(RT)^{-2}$", "C": "$K_p = K_c(RT)$", "D": "$K_p = K_c$"}', 'B', 'SCA'),
('Chemistry', 'Organic Chemistry', 'General Organic Chemistry', 2022, 'advanced', 'https://picsum.photos/seed/chem2/800/400', '{"A": "Methyl carbocation", "B": "Ethyl carbocation", "C": "Isopropyl carbocation", "D": "Tert-butyl carbocation"}', 'D', 'SCA'),
('Chemistry', 'Physical Chemistry', 'Chemical Equilibrium', 2021, 'mains', 'https://picsum.photos/seed/chem3/800/400', '{"A": "8", "B": "7", "C": "Between 6 and 7", "D": "Between 7 and 8"}', 'C', 'SCA'),
('Chemistry', 'Organic Chemistry', 'General Organic Chemistry', 2023, 'advanced', 'https://picsum.photos/seed/chem4/800/400', '{"A": "$sp^3, sp^2, sp$", "B": "$sp, sp^2, sp^3$", "C": "$sp^2, sp^3, sp$", "D": "$sp^3, sp, sp^2$"}', 'A', 'SCA'),
('Chemistry', 'Physical Chemistry', 'Chemical Equilibrium', 2020, 'mains', 'https://picsum.photos/seed/chem5/800/400', '{"A": "Mass", "B": "Volume", "C": "Density", "D": "Enthalpy"}', 'C', 'SCA');

-- NEW MULTI-TYPE QUESTIONS
INSERT INTO questions (subject, chapter, topic, year, exam_level, question_text, options, correct_answer, answer_type) VALUES
-- MCA (Mathematics)
('Mathematics', 'Algebra', 'Complex Numbers', 2024, 'advanced', 'https://picsum.photos/seed/math6/800/400', '{"A": "$\\cos x$", "B": "$x^2$", "C": "$\\sin x$", "D": "$|x|$"}', 'A,B,D', 'MCA'),
-- MCA (Physics)
('Physics', 'Mechanics', 'Rotational Motion', 2024, 'mains', 'https://picsum.photos/seed/phys6/800/400', '{"A": "Force", "B": "Velocity", "C": "Mass", "D": "Acceleration"}', 'A,B,D', 'MCA'),
-- TF (Mathematics)
('Mathematics', 'Calculus', 'Definite Integrals', 2024, 'mains', 'https://picsum.photos/seed/math7/800/400', '{}', 'False', 'TF'),
-- TF (Chemistry)
('Chemistry', 'Organic Chemistry', 'General Organic Chemistry', 2024, 'advanced', 'https://picsum.photos/seed/chem6/800/400', '{}', 'True', 'TF'),
-- FITB (Chemistry)
('Chemistry', 'Organic Chemistry', 'General Organic Chemistry', 2024, 'mains', 'https://picsum.photos/seed/chem7/800/400', '{}', '6', 'FITB'),
-- FITB (Physics)
('Physics', 'Electromagnetism', 'Electrostatics', 2024, 'mains', 'https://picsum.photos/seed/phys7/800/400', '{}', '9.8', 'FITB');

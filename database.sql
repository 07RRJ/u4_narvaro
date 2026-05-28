-- ============================================================
-- Attendance System — Full Schema + RLS
-- Run this in your Supabase SQL editor
-- ============================================================

-- Profiles (linked to Supabase auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = ANY (ARRAY['teacher', 'admin'])),
  created_at timestamp with time zone DEFAULT now()
);

-- Students
CREATE TABLE public.students (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Attendance sessions (one row per school day that has been opened)
CREATE TABLE public.attendance_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_date date NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Attendance records (one row per student per session)
CREATE TABLE public.attendance_records (
  session_id bigint NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  marked_by uuid REFERENCES public.profiles(id),
  marked_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (session_id, student_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records  ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read; only own user inserts their row
CREATE POLICY "profiles_read"
  ON public.profiles FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- students: public read; teachers can insert / update / delete
CREATE POLICY "students_read"
  ON public.students FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "students_write"
  ON public.students FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

CREATE POLICY "students_update"
  ON public.students FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

CREATE POLICY "students_delete"
  ON public.students FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

-- attendance_sessions: public read; teachers can insert
CREATE POLICY "sessions_read"
  ON public.attendance_sessions FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "sessions_insert"
  ON public.attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

-- attendance_records: public read; teachers can insert / update / delete
CREATE POLICY "records_read"
  ON public.attendance_records FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "records_insert"
  ON public.attendance_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

CREATE POLICY "records_update"
  ON public.attendance_records FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

CREATE POLICY "records_delete"
  ON public.attendance_records FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

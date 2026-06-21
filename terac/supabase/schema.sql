create table if not exists public.video_comparison_responses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  participant_session_id uuid not null,
  trial_index integer not null check (trial_index between 1 and 40),
  video_a text not null,
  video_b text not null,
  question_1 text not null check (question_1 in ('a', 'b')),
  question_2 text not null check (question_2 in ('a', 'b')),
  question_3 text not null check (question_3 in ('a', 'b')),
  question_4 text not null check (question_4 in ('a', 'b')),
  question_5 text not null check (char_length(question_5) > 0),
  unique (participant_session_id, trial_index)
);

alter table public.video_comparison_responses enable row level security;
create index if not exists video_comparison_responses_created_at_idx on public.video_comparison_responses (created_at desc);

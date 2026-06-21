# Cut Test

Standalone Vercel-ready paired-video study. On every page load it randomly selects two distinct videos from `public/mp4s/1.mp4` through `80.mp4`, then saves the five answers as one response.

## Deploy

1. In Vercel, import this repository and set the **Root Directory** to `terac`.
2. In the Supabase SQL editor, run [supabase/schema.sql](./supabase/schema.sql).
3. Copy `.env.example` to `.env.local` locally, and add the same two variables in Vercel’s Environment Variables.
4. Deploy.

The server-only `SUPABASE_SERVICE_ROLE_KEY` saves every response as one row: session ID, trial number, `video_a`, `video_b`, answers `question_1` through `question_5`, and timestamp. Answers 1–4 store `a` or `b`, which corresponds to the displayed filename in the same row.

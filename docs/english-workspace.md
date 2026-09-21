# English workspace

This is a personal Cloze / Reading study tool. Recognition of unfamiliar words is the first priority. No public accounts or multi-user features are planned.

## Learning

- Recall the English meaning, reveal, then self-assess: again / good.
- New items are introduced before testing. Failed items return after up to three other cards, at most twice per round.
- The spacing policy is deliberately transparent: again 10 minutes, good initially 1 day with a 2.2 multiplier up to 90 days. The multiplier can advance only after 20 hours; early same-day practice does not repeatedly inflate the interval. These are initial product defaults, not a claim of individual optimality.
- Recognition is shared across collections. Confusion sides have separate records from ordinary recognition.
- Word/phrase content is in the existing Words table. Existing rich fields remain available. Imports attach existing entries without overwriting definitions or progress.
- Collections are many-to-many playlists. Removing a collection never removes vocabulary.
- Review events have request IDs, optimistic revisions and atomic SQL writes. Undo rejects a record superseded by later practice. Web progress is saved before advancing.
- In-progress browser rounds persist in localStorage; review results and WeChat sessions persist in Postgres.

## Setup and verification

1. `npm run db:migrate:english` backs up Words and legacy word progress to ignored `.local/backups`, then runs migration 0008 in one transaction. It preserves content and initializes existing recognition history as due for recalibration.
2. `npm run test:english`
3. `npx tsc --noEmit --incremental false`
4. Stop the dev server before `npm run build` (Next dev/build share `.next`).

The local JSON vocabulary file is not automatically imported: it can differ from the database and may contain uncommitted user edits.

Structured vocabulary HTML can be previewed with `npm run import:english:html -- "path\to\list.html"`. Add `--apply` only after the preview counts are correct. The importer validates the expected 218 source rows, merges case-insensitive duplicates without replacing richer existing entries, creates separate confusing-word and phrase collections, and writes a pre-import backup under ignored `.local/backups`.

## WeChat / iLink / OpenClaw

Tencent's official `@tencent-weixin/openclaw-weixin` plugin owns QR login, iLink polling, credentials and message delivery. `integrations/openclaw` supplies a small FlashLearn plugin with a deterministic `/vocab` command and the `flashlearn_vocab` agent tool. It does not read the database directly.

- Store a random `FLASHLEARN_BOT_TOKEN` (at least 32 characters) in ignored `.env.local`. Configure `plugins.entries.flashlearn-study.config` with `baseUrl: http://127.0.0.1:3000`, the matching `token`, and optionally `allowedSender` (the paired owner's sender ID). Never commit the token.
- Install Tencent's channel plugin: `openclaw plugins install @tencent-weixin/openclaw-weixin --accept-capabilities`.
- After reviewing the local plugin source, install it with `openclaw plugins install ./integrations/openclaw --link --accept-capabilities --force`.
- Start or install the OpenClaw Gateway, then log in with `openclaw channels login --channel openclaw-weixin`. Check `openclaw channels status --channel openclaw-weixin --probe`. QR login requires the owner to scan with WeChat.
- The website must stay running on this computer. `scripts/start-english-local.ps1` can start the production build manually on loopback only. On this machine, a `FlashLearn English Local` Scheduled Task runs Next.js directly at sign-in; OpenClaw Gateway has its own Scheduled Task. Rebuild with `npm run build` only after stopping the website task, then start it again. The computer must be awake and connected for WeChat review.
- `/vocab 开始 5`, `/vocab 短语 5`, `/vocab 易混 5`, `/vocab 词表`, `/vocab 词表编号 12 5`, `/vocab 答案`, `/vocab 下一题`, `/vocab 1`, `/vocab 2`, `/vocab 继续`.
- Plain-language review messages use the existing configured OpenClaw model and the agent tool. Free-text meaning answers are followed by the canonical meaning and explicit self-assessment rather than opaque AI grading.
- The iLink channel probe verifies login and polling. A message round-trip from the owner's WeChat remains the final delivery check.

Endpoint: authenticated `POST /api/english/bot`, JSON `{ peer, requestId, action, mode?, collection?, count?, rating? }`. Every submitted answer gets an idempotent review ID. Client credentials remain server-side in the local OpenClaw configuration.

## Current boundaries

- No full-passage Cloze generation or reading comprehension grader in this first recognition-focused version.
- Additional senses remain in rich word data; independent per-sense scheduling is a future extension.
- Browser rounds and WeChat rounds each have their own queue; they share the same vocabulary, lists and memory records.
- The private bot endpoint requires a bearer token. Existing website access assumptions are unchanged; keep the deployment private.

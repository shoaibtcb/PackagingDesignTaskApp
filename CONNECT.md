# H3 Image — Remote Generation over Supabase Queue

**Read this first if you are a new agent.** It explains the whole working system:
how images are generated on this PC, and how a laptop on a **different network**
running n8n can submit jobs and receive PNGs — with **no VPN, no port-forward,
no firewall rule, no admin rights**.

Last verified: 2026-11-19 (full end-to-end run + self test passing).

---

## 0. TL;DR

| Machine | What runs | Command |
|---|---|---|
| This PC (Windows, RTX 4060 8GB) | model server :8633, UI :8640, queue worker | `C:\AI\minimax-h3-image-server\START.cmd` |
| Laptop (any network) | n8n workflow | paste code from **Appendix A**, set `SB` + `KEY` |

> **Self-contained file.** Appendix A = full `n8n-node.js` source, Appendix B = all
> `config.json` settings + how to fill the key, Appendix C = full `schema.sql`,
> Appendix D = end-to-end runbook, Appendix E = checklist for the next agent.
> Nothing else needs to be opened to (re)build this system.

Data path:

```
n8n (laptop)  --HTTPS-->  Supabase (ap-southeast-1)
                               ^
                               |  HTTPS (outbound only)
                               |
                     poller.py (this PC)  --->  local model 127.0.0.1:8633
                               |
                               +--> uploads PNG to Supabase Storage
n8n (laptop)  <--HTTPS----  reads row status=completed, downloads PNG
```

Key point: **only outbound HTTPS** leaves this PC. Nothing listens on the internet.
That is why the different-network laptop works with zero network configuration.

---

## 1. Machine inventory

| Item | Value |
|---|---|
| OS / user | Windows 11 Pro, `C:\Users\m.shoaib` (NOT admin) |
| CPU / RAM | i7-14700K / 64 GB |
| GPU | RTX 4060, **8 GB VRAM** |
| Project root | `C:\AI\minimax-h3-image-server` |
| Python | `.venv` (3.12.16), torch 2.11.0+cu130 |
| Model | MiniMaxAI/MiniMax-H3-Image (33B DiT, nf4 text encoder) |
| Model server | uvicorn on `0.0.0.0:8633` (`H3IMG_HOST`), 8gb profile |
| Human UI | `http://127.0.0.1:8640` (`run-md.cmd` -> `tools\md_wrapper.py`) |
| HF cache | `E:\hf-cache\huggingface` (`HF_HOME`) |
| Text encoder (nf4) | `E:\h3models\te` (`H3IMG_TE_DIR`, 16.2 GB) |
| LoRA | `E:\h3models\lora` |
| Transformer cache | `models\cache\ckw4a8_adaln_table_pdmd3` (10.98 GB, 50/50 blocks) |
| Worker | `queue\poller.py` (+ `config.json`) |
| Git | `C:\AI\tools\MinGit` (portable) |

Measured performance (8gb profile, `H3IMG_STEPS=6`):

| Job | Time | Peak VRAM |
|---|---|---|
| t2i 1024², 3 steps | 5–7 s | ~2.4 GB |
| t2i 2048², 6 steps (native) | ~30 s | 3.71 GB |
| edit 1024², 3 steps | ~15–17 s | 3.54 GB |
| edit 2048², 6 steps | ~35–45 s | ~3.8 GB |

Model load: `/api/admin/load` **blocks ~200 s** (cache load 11.5 s + hosts pinned).
Do not use a short HTTP timeout on that call; poll `/api/health` for `loaded:true` instead.

---

## 2. Local model API (port 8633)

Base URL on this PC: `http://127.0.0.1:8633`.

### Endpoints used by the worker

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{status, model, loaded, steps, prompt_enhancer}` |
| POST | `/api/admin/load` | load model (slow, ~200 s, blocks) |
| POST | `/api/assets` | multipart upload, field name **`file`** -> `{"id": "<asset>"}` |
| POST | `/api/jobs` | create job -> `{"id": "<job>"}` |
| GET | `/api/jobs/{id}` | status; when completed also `image_url` |
| GET | `/api/jobs` | `{"value": [...]}` |
| POST | `/api/interrupt` | `{}` = cancel all, `{"job_id": "..."}` = one |
| GET | `/outputs/<file>.png` | the rendered image |

### Job request body

```json
{
  "mode": "edit",
  "prompt": "...",
  "width": 2048,
  "height": 2048,
  "steps": 6,
  "generation_area": "native",
  "seed": 42,
  "conditions": [{ "asset_id": "6f0c...-asset" }]
}
```

### Hard constraints (learned the hard way)

- `steps` enum is **only 2, 3, 6** — anything else is rejected.
- `generation_area` is **`requested` or `native`** only.
- `prompt` max length is **8000 characters**; longer input must be truncated
  (`poller.py` sends `prompt[:8000]`).
- `POST /api/assets` returns **`{"id": ...}`**, NOT `asset_id`.
  Conditions always use `["asset_id"]` (the value from `id`).
- `image_url` in job status is **relative** (`/outputs/xxx.png`) — prepend the base URL.
- Job states: `queued` -> `running` -> `completed` | `failed` | `interrupted`.
- **One generation at a time**; extra jobs queue inside the model server.
- `mode: "edit"` requires exactly the reference(s) in `conditions`; t2i omits it.
- Edit references are capped at ~1.05 MP each in the 8gb profile (no upscaling).

### Health / state gotcha

After `POST /api/admin/load`, requests may time out at 30 s while the model is
still loading. Always confirm with:

```powershell
Invoke-RestMethod http://127.0.0.1:8633/api/health
# {"status":"ok",...,"loaded":true,"steps":6,...}
```

---

## 3. Supabase project

| Field | Value |
|---|---|
| Project ref | `vozddjldekcnvadbcxbp` |
| Project URL (**`SB`**) | `https://vozddjldekcnvadbcxbp.supabase.co` |
| Region | `ap-southeast-1` (Singapore) |
| Dashboard name | `shoaibtcb's Project` |
| Plan | Free |

### 3.1 What `SB` and `KEY` are (important)

```js
const SB  = 'https://vozddjldekcnvadbcxbp.supabase.co';  // Project URL
const KEY = 'eyJhbGciOiJIUzI1NiIs...';                    // service_role JWT
```

- **`SB`** is the project base URL. Everything is a path under it:
  - `/rest/v1/...`      -> PostgREST (the `h3_jobs` table)
  - `/storage/v1/...`   -> Storage (the PNG buckets)
  - `/auth/v1/...`      -> auth (not used here)
- **`KEY`** is the **legacy `service_role` JWT** (219 chars, starts with `eyJ`).
  It is used **twice** on every request:

  ```http
  apikey: <KEY>
  Authorization: Bearer <KEY>
  ```

  It is a *server-side* key: it **bypasses RLS** and can read/write every row and
  every object. That is exactly what we need (table has RLS enabled with **zero**
  policies, so `anon` can do nothing).
- Where to find it: Supabase dashboard -> **Project Settings -> API** ->
  *Project API keys* -> `service_role`. (The same value is already stored in
  `queue\config.json` under `service_key` — copy from there for n8n.)
- The project also has newer keys (`sb_publishable_...`, `sb_secret_...`) and an
  `anon` JWT. **Do not** use `anon`/`publishable` for the worker or n8n — they
  will fail with RLS/401. The legacy `service_role` JWT is used because it works
  with both PostgREST and Storage without extra config.

**Never** put `KEY` in a browser, a public repo, a screenshot, or an n8n node
that is exposed to end users. It is full database access.

### 3.2 Database schema (`queue\schema.sql`)

Table `public.h3_jobs`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto via trigger `h3_touch` |
| `status` | text | `pending` / `running` / `completed` / `failed` |
| `mode` | text | `t2i` / `edit` |
| `prompt` | text | max 8000 chars (enforced by backend) |
| `width`, `height` | int | default 2048 |
| `steps` | int | 2 / 3 / 6 |
| `seed` | int | nullable = random |
| `generation_area` | text | `requested` / `native` |
| `ref_path` | text | object path in bucket `h3-refs` (optional) |
| `image_path` | text | result object path in `h3-images` |
| `seconds` | numeric | generation time reported by the model |
| `vram` | numeric | peak VRAM GB |
| `error` | text | failure reason |
| `client_tag` | text | correlation id from n8n |
| `meta` | jsonb | spare |

Index: `(status, created_at)`. RLS **enabled**.

### 3.3 Storage buckets

| Bucket | Public | Used for |
|---|---|---|
| `h3-refs` | no | reference images uploaded by n8n |
| `h3-images` | no | generated PNGs uploaded by the worker |

Both are private. Only `service_role` can read them (no signed URLs involved).
Result object name = `<job uuid>.png`.

### 3.4 PostgREST behaviours that bite

- **Bulk insert** requires all objects to have **identical key sets**; otherwise
  `400 Bad Request`. Insert one row at a time (the n8n snippet does).
- To get the inserted row back, send header `Prefer: return=representation`.
- Atomic claim is `PATCH /rest/v1/h3_jobs?id=eq.<id>&status=eq.pending` — if the
  response array is empty, another worker won the race.
- Delete: `DELETE /rest/v1/h3_jobs?id=eq.<id>`.
- Timestamps are UTC in the DB; `monitor.py` converts to local for display.

---

## 4. The worker (`queue\poller.py`)

Purpose: turn "row in Postgres" into "PNG in Storage", on this PC only.

### 4.1 Config (`queue\config.json`)

```json
{
  "supabase_url": "https://vozddjldekcnvadbcxbp.supabase.co",
  "service_key": "eyJ...service_role...",
  "backend": "http://127.0.0.1:8633",
  "ref_bucket": "h3-refs",
  "image_bucket": "h3-images",
  "interval_seconds": 8,
  "stale_minutes": 20,
  "timeout_seconds": 600
}
```

`config.json` **contains the real key** — keep it local, never commit it.

### 4.2 Loop

1. Recover stale: `PATCH h3_jobs?status=eq.running&updated_at=lt.<now-20min>`
   -> back to `pending` (handles crashes/sleep).
2. Claim oldest `pending` (atomic two-step described above) -> `running`.
3. If `ref_path` is set: download from `h3-refs`, `POST /api/assets`
   (multipart, field `file`), put returned `id` into
   `conditions: [{ "asset_id": id }]`, force `mode: "edit"`.
4. `POST /api/jobs` (prompt truncated to 8000), remember the local `h3_id`.
5. Poll `/api/jobs/{h3_id}` every 2 s up to `timeout_seconds`.
6. On `completed`: download `backend + image_url`, upload to
   `h3-images/<row uuid>.png` (`x-upsert: true`), set row
   `{status: completed, image_path, seconds, vram, error: null}`.
7. On any error: row `{status: failed, error: "<reason>"[:500]}`.
8. Sleep `interval_seconds`, repeat.

### 4.3 Run / verify

```powershell
cd C:\AI\minimax-h3-image-server

# config + cloud + backend sanity (no model work)
.venv\Scripts\python.exe queue\poller.py --check

# cloud-only roundtrip test (insert/claim/storage/update/delete) — safe to re-run
.venv\Scripts\python.exe queue\selftest.py

# normal worker (auto-restart wrapper)
queue\start-poller.cmd

# or process exactly one job then exit
.venv\Scripts\python.exe queue\poller.py --once
```

Logs: `queue\poller.log` (also printed to the console window).

### 4.4 Autostart

`START.cmd` starts model :8633, UI :8640, and — **only if `queue\config.json`
exists** — the queue worker. So after reboot the user just runs `START.cmd`.

---

## 5. n8n side (laptop, any network)

The laptop needs **nothing installed** besides n8n and internet access.

### 5.1 Exact steps

1. n8n -> **New workflow** -> **Manual Trigger**.
2. Add **Code** node (mode: *Run Once for All Items*).
3. Paste the whole content of `queue\n8n-node.js` — full source is also in
   **Appendix A (section 13)** below, so this one MD file is enough.
4. Edit exactly two constants at the top:

   ```js
   const SB  = 'https://vozddjldekcnvadbcxbp.supabase.co';
   const KEY = '<service_key from queue\config.json>';
   ```

5. Provide inputs (either pin data in the Code node or from previous nodes):

   ```json
   { "prompt": "A ceramic teapot on marble, soft daylight, 50mm",
     "width": 2048, "height": 2048, "steps": 6 }
   ```

6. **Execute step**. After ~30–60 s the node returns:
   - `binary.data` — the finished PNG
   - `json` — `{job_id, seconds, vram, width, height, steps, seed, image_path}`
7. Attach a consumer node (**Google Drive**, **Write Binary File**, **Telegram**,
   **HTTP Request**) and use `binary.data`.

### 5.2 Reference image (edit mode)

The Code node accepts either:

- `refBinaryProperty: "data"` — name of a binary property on the input item; the
  code uploads it to `h3-refs` and sets `ref_path`, mode becomes `edit`.
- or `refPath: "inputs/foo.png"` — an object already present in `h3-refs`.

### 5.3 What the snippet does internally

```
POST /rest/v1/h3_jobs              (Prefer: return=representation) -> id
loop every 3 s, max 240 tries (12 min):
  GET /rest/v1/h3_jobs?id=eq.<id>&select=*      -> break on completed/failed
GET /storage/v1/object/h3-images/<image_path>   (arraybuffer)
prepareBinaryData(buffer, "<uuid>.png", "image/png")
```

Notes:

- n8n Code nodes allow top-level `await`; plain `node --check` will complain —
  that is expected, the file is valid inside n8n. (Verified by wrapping in an
  async function.)
- If the workflow must wait longer than 12 min, raise the loop count or set the
  node's timeout; the worker itself allows 10 min per job (`timeout_seconds`).
- Alternative (UI-only) build: **Supabase node** insert + **Wait** loop +
  **HTTP Request** download with `apikey`/`Authorization` headers. The Code node
  is fewer clicks and already tested.
- Store `KEY` in an n8n **credential** or `$env` if the instance is shared.

### 5.4 Manual job without n8n (useful for debugging)

```powershell
$cfg = Get-Content C:\AI\minimax-h3-image-server\queue\config.json | ConvertFrom-Json
$h = @{ apikey = $cfg.service_key; Authorization = "Bearer $($cfg.service_key)"; "Content-Type" = "application/json"; Prefer = "return=representation" }
$body = @{ prompt = "A red apple on linen"; width = 2048; height = 2048; steps = 6; mode = "t2i"; client_tag = "manual" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$($cfg.supabase_url)/rest/v1/h3_jobs" -Headers $h -Body $body
# then: .venv\Scripts\python.exe queue\poller.py --once
# and check: queue\monitor.cmd
```

---

## 6. Measured end-to-end result

Real run on this machine (row created by script, worker processed it):

```
1. reference uploaded to h3-refs          1,664,558 B
2. row queued                            01ea8298-da6d-4a48-9d9d-59e246549650
3. worker claimed it                     status running
4. local model: edit 1024², 3 steps      17.15 s, peak 3.54 GB
5. PNG uploaded to h3-images             1,668,854 B  (row -> completed)
6. downloaded back from Supabase         outputs\e2e_supabase.png (valid PNG)
7. cleanup                               rows left: []
```

Cloud-only self test (`queue\selftest.py`) covers: insert, atomic claim,
double-claim rejection, both buckets roundtrip, update, delete — currently
**PASS**.

Expected user-visible latency = generation time + up to 8 s (worker poll) +
up to 3 s (n8n poll) ≈ 20–50 s for typical jobs.

---

## 7. Monitoring

```powershell
cd C:\AI\minimax-h3-image-server
queue\monitor.cmd              # snapshot: pending/running/done/failed + last 10
queue\monitor.cmd --watch 5    # live refresh every 5 s
Get-Content queue\poller.log -Tail 30 -Encoding UTF8
```

Also:

- Supabase dashboard -> **Table Editor -> h3_jobs** (live rows; filter by status).
- Every n8n job appears in the table with `seconds`, `vram` and `error`.
- n8n's own execution history lives on the laptop; from this PC we only see the
  jobs it submitted.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `401` / `Invalid API key` | wrong key (anon/publishable) or whitespace | use `service_role` JWT exactly |
| Select returns `[]` but rows exist | RLS with anon key | must use `service_role` |
| `400 Bad Request` on insert | bulk insert with differing keys | insert one row at a time |
| `Bucket not found` | `schema.sql` not run | run `queue\schema.sql` in SQL Editor |
| Job stays `pending` | worker not running / backend down / PC asleep | `queue\start-poller.cmd`, `START.cmd`, check `poller.log` |
| Job `running` forever | worker crashed mid-job | auto-requeued after `stale_minutes` (20) |
| `failed: model ... 422` | bad `steps` (not 2/3/6) or `generation_area` | fix values in row/n8n |
| Prompt tail lost | >8000 chars | shorten prompt or put key details first |
| `ConnectError 10061` | model server not started | run `START.cmd`, wait for `loaded:true` |
| n8n times out | job longer than 12 min loop | raise loop count; check row status |
| Image transparent/blank | reading wrong binary property | use `binary.data` from the Code node |
| `Invalid JWT` after rotation | old key still cached | update `config.json` and n8n `KEY`, restart worker |

Stuck/old data cleanup:

```sql
-- in Supabase SQL Editor
update h3_jobs set status='pending' where status='running' and updated_at < now() - interval '20 minutes';
delete from h3_jobs where created_at < now() - interval '7 days';
```

---

## 9. Security

- **No inbound exposure.** The worker and n8n only make outbound HTTPS calls.
  No firewall rule is required (and none could be created — the account has no
  admin rights). `H3IMG_HOST=0.0.0.0` only means the model is also reachable on
  the LAN; nothing is forwarded to the internet, and the API has **no auth**.
- **`service_role` key** = full DB/storage access. Keep it in `queue\config.json`
  and the n8n credential only. Never in a browser or repo.
- **Rotate if leaked:** Dashboard -> Settings -> API -> rotate JWT secret (this
  invalidates `anon` + `service_role`), then update `config.json` and n8n `KEY`
  and restart the worker.
- **Setup PAT** (`sbp_...`) was used only through the Management API to create
  the schema/buckets and read keys. It is **not** used at runtime — safe to
  revoke: https://supabase.com/dashboard/account/tokens
- **Tailscale auth key** (`tskey-auth-...`) is unused; delete it in the Tailscale
  admin console if it was created.
- Data (prompts + images) is stored in Supabase `ap-southeast-1`. Do not send
  content that must not leave the machine/region.
- For sensitive work prefer a local-only flow: `H3IMG_HOST=127.0.0.1` + the
  browser UI on :8640.

---

## 10. What was rejected and why (context for the next agent)

| Option | Verdict |
|---|---|
| Tailscale / ZeroTier / WireGuard | needs **admin** (driver/service) — not available |
| Windows firewall inbound rule | needs **admin** (`netsh advfirewall` denied) |
| Phone hotspot / same LAN | works only same network; inbound still may be blocked |
| Cloudflare Tunnel / ngrok | no admin, but creates a **public URL** — violates "don't expose" |
| **Supabase queue + outbound worker** | **chosen**: no admin, no VPN, private buckets, cross-network |

The model server itself has **no authentication**, so never port-forward 8633.

---

## 11. File map

```
C:\AI\minimax-h3-image-server\
  START.cmd                     model + UI + worker (one click)
  run-8gb.cmd                   H3IMG_HOST=0.0.0.0, PORT=8633, VRAM=8, STEPS=6, TE dir
  run-md.cmd                    wrapper UI :8640
  app\main.py                   FastAPI routes (/api/assets, /api/jobs, /api/admin/*)
  app\pruned_image.py           cache builder + 8gb prune logic
  tools\md_wrapper.py           human UI + annotations + proxy
  queue\
    CONNECT.md                  <-- this file
    README.md                   short setup steps
    schema.sql                  Supabase DDL (table, trigger, buckets, RLS)
    poller.py                   worker (claim -> render -> upload)
    selftest.py                 cloud roundtrip test (safe, no model)
    monitor.py / monitor.cmd    queue dashboard
    config.json                 real URL + service key (SECRET, local only)
    config.example.json         template
    start-poller.cmd            auto-restart wrapper
    n8n-node.js                 Code node for n8n
    poller.log                  worker log
  outputs\                      rendered images (e2e_supabase.png = proof)
  models\cache\...              transformer cache (do not delete)
```

---

## 12. Known limitations

- One job at a time (single GPU); queue depth is handled but throughput is ~1 job/30–60 s.
- Free Supabase tier: 500 MB DB / 1 GB storage — generated PNGs accumulate;
  clean old rows/objects periodically.
- Poll-based (8 s worker, 3 s n8n) → up to ~11 s of extra latency.
- If the PC sleeps, jobs pause in `pending`; wake it or change sleep settings.
- Worker crash mid-job leaves `running` for up to 20 min, then auto-recovers.
- `prompt` > 8000 chars is truncated, not rejected.
- No retry of a failed generation (row must be reset to `pending` or re-inserted).

---

## 13. Appendix A — `queue\n8n-node.js` (full source)

Paste this **verbatim** into an n8n **Code** node (mode: *Run Once for All Items*).
Then set the two constants `SB` and `KEY` (see Appendix B).

```js
// n8n -> Code node (Run Once for All Items)
// Submits a job to the Supabase queue, waits for the PC worker to render it,
// then downloads the finished PNG as binary output.
//
// Put your own values in SB / KEY below (or read them from $env).

const SB  = 'https://YOUR-PROJECT.supabase.co';
const KEY = 'YOUR-SERVICE-ROLE-KEY';
const H   = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const inp = $input.first().json;

// ---------- 1) push the job ----------
// Optional reference image: upload it to the h3-refs bucket first (Supabase/HTTP node),
// then pass the object path as refPath (e.g. 'inputs/my-product.png').
let refPath = inp.refPath || null;

if (inp.refBinaryProperty) {
  const bin = inp[inp.refBinaryProperty];
  const buf = Buffer.from(bin.data, 'base64');
  const path = 'inputs/' + Date.now() + '-' + (bin.fileName || 'ref.png');
  await this.helpers.httpRequest({
    method: 'POST',
    url: SB + '/storage/v1/object/h3-refs/' + path,
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': bin.mimeType || 'image/png', 'x-upsert': 'true' },
    body: buf,
  });
  refPath = path;
}

const rows = await this.helpers.httpRequest({
  method: 'POST',
  url: SB + '/rest/v1/h3_jobs',
  headers: { ...H, Prefer: 'return=representation' },
  json: true,
  body: {
    prompt: inp.prompt || 'A single ripe red apple on pale linen, soft morning window light, 50mm, editorial still life.',
    width: inp.width || 2048,
    height: inp.height || 2048,
    steps: inp.steps || 6,
    generation_area: inp.generation_area || 'native',
    mode: refPath ? 'edit' : 't2i',
    seed: inp.seed ?? null,
    ref_path: refPath,
    client_tag: inp.client_tag || 'n8n',
  },
});
const jobId = rows[0].id;

// ---------- 2) wait for the local PC worker ----------
let row = rows[0];
for (let i = 0; i < 240; i++) {
  await new Promise(r => setTimeout(r, 3000));               // 3s * 240 = 12 min budget
  const q = await this.helpers.httpRequest({
    url: SB + '/rest/v1/h3_jobs?id=eq.' + jobId + '&select=*',
    headers: H, json: true,
  });
  row = q[0];
  if (['completed', 'failed'].includes(row.status)) break;
}
if (row.status !== 'completed') throw new Error('H3 job ' + row.status + ': ' + (row.error || 'timeout'));

// ---------- 3) download the image ----------
const buf = await this.helpers.httpRequest({
  method: 'GET',
  url: SB + '/storage/v1/object/h3-images/' + row.image_path,
  headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  responseType: 'arraybuffer',
});
const binary = await this.helpers.prepareBinaryData(
  Buffer.from(buf),
  row.image_path.split('/').pop(),
  'image/png'
);

return [{
  json: {
    job_id: row.id,
    seconds: row.seconds,
    vram: row.vram,
    width: row.width,
    height: row.height,
    steps: row.steps,
    seed: row.seed,
    image_path: row.image_path,
  },
  binary: { data: binary },
}];
```

### Input contract (what the Code node reads)

| Field | Type | Default | Notes |
|---|---|---|---|
| `prompt` | string | demo apple prompt | >8000 chars is truncated by the worker |
| `width` / `height` | int | 2048 | 1024 for speed, 2048 for quality |
| `steps` | int | 6 | **only 2, 3, 6** |
| `seed` | int | random | same seed + prompt = same image |
| `generation_area` | string | `native` | or `requested` |
| `refBinaryProperty` | string | — | name of a binary prop, e.g. `"data"`; triggers edit mode |
| `refPath` | string | — | existing object in `h3-refs`, e.g. `"inputs/x.png"` |
| `client_tag` | string | `n8n` | your correlation id |

### Output contract

- `binary.data` — PNG bytes (use in the next node)
- `json.job_id`, `json.seconds`, `json.vram`, `json.width`, `json.height`,
  `json.steps`, `json.seed`, `json.image_path`

> `node --check` on this file fails with "await is only valid in async functions"
> — **expected**, n8n wraps Code nodes in an async function. Syntax was verified
> by checking a wrapped copy.

---

## 14. Appendix B — `queue\config.json` (all settings)

Deployed values for this machine (this is the **complete** config; there are no
other parameters):

```json
{
  "supabase_url": "https://vozddjldekcnvadbcxbp.supabase.co",
  "service_key": "<SERVICE_ROLE_KEY>",
  "backend": "http://127.0.0.1:8633",
  "ref_bucket": "h3-refs",
  "image_bucket": "h3-images",
  "interval_seconds": 8,
  "stale_minutes": 20,
  "timeout_seconds": 600
}
```

| Key | Meaning | Change it when |
|---|---|---|
| `supabase_url` | Project URL, same value as n8n `SB` | new Supabase project |
| `service_key` | `service_role` JWT, same value as n8n `KEY` | key rotation |
| `backend` | local model server | port changed / remote model host |
| `ref_bucket` | bucket for reference uploads | rename |
| `image_bucket` | bucket for generated PNGs | rename |
| `interval_seconds` | idle poll interval (8 s) | want lower latency (min 2) |
| `stale_minutes` | re-queue `running` rows older than this (20) | long jobs rejected wrongly |
| `timeout_seconds` | max wait per job before marking failed (600) | very slow big jobs |

### Fill / rewrite config.json without printing the secret

```powershell
$env:SB_KEY = '<paste service_role key once>'
@{
  supabase_url     = 'https://vozddjldekcnvadbcxbp.supabase.co'
  service_key      = $env:SB_KEY
  backend          = 'http://127.0.0.1:8633'
  ref_bucket       = 'h3-refs'
  image_bucket     = 'h3-images'
  interval_seconds = 8
  stale_minutes    = 20
  timeout_seconds  = 600
} | ConvertTo-Json | Set-Content C:\AI\minimax-h3-image-server\queue\config.json -Encoding UTF8
Remove-Item Env:\SB_KEY
```

### Read the key for n8n (Appendix A `KEY =`)

```powershell
(Get-Content C:\AI\minimax-h3-image-server\queue\config.json -Raw | ConvertFrom-Json).service_key
```

### Validate after any edit

```powershell
.venv\Scripts\python.exe queue\poller.py --check
# expect: config OK | backend ok loaded=<true|false> | supabase OK
```

If `--check` says `'service_key' is not set`, the value still starts with
`PASTE_` or is empty — it is not being read from the file.

---

## 15. Appendix C — `queue\schema.sql` (full, idempotent)

Run once in **Supabase -> SQL Editor**. Safe to re-run.

```sql
-- Supabase setup for the H3 image queue (run in Supabase -> SQL Editor, once)

create extension if not exists pgcrypto;

create table if not exists public.h3_jobs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  status          text not null default 'pending',   -- pending | running | completed | failed
  mode            text not null default 't2i',       -- t2i | edit
  prompt          text not null,
  width           int  not null default 2048,
  height          int  not null default 2048,
  steps           int  not null default 6,
  seed            int,
  generation_area text default 'native',
  ref_path        text,        -- optional: object path inside bucket h3-refs
  image_path      text,        -- result: object path inside bucket h3-images
  seconds         numeric,     -- generation time reported by the model
  vram            numeric,     -- peak VRAM GB
  error           text,
  client_tag      text,        -- free-form correlation id from n8n
  meta            jsonb
);

create index if not exists h3_jobs_status_idx on public.h3_jobs (status, created_at);

create or replace function public.h3_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists h3_jobs_touch on public.h3_jobs;
create trigger h3_jobs_touch before update on public.h3_jobs
  for each row execute function public.h3_touch();

-- private buckets (no public URL; access only via service key)
insert into storage.buckets (id, name, public) values ('h3-refs',   'h3-refs',   false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('h3-images', 'h3-images', false) on conflict (id) do nothing;

-- RLS on, no policies: only the service_role key (used by n8n + poller) can read/write.
alter table public.h3_jobs enable row level security;
```

Verify (SQL Editor):

```sql
select table_name from information_schema.tables where table_schema='public' and table_name='h3_jobs';
select id, public from storage.buckets where id in ('h3-refs','h3-images') order by id;
-- expect: both public=false
```

---

## 16. Appendix D — End-to-end runbook (copy-paste order)

### D.0 The key pair (remember this)

```
SB  = https://vozddjldekcnvadbcxbp.supabase.co      (Project URL, not secret)
KEY = eyJ... 219 chars                              (service_role JWT, secret)
```

Both `queue\config.json` (`supabase_url`, `service_key`) and n8n (`SB`, `KEY`).
`KEY` bypasses RLS — it is the only credential in the whole system.

### D.1 PC — start everything

```powershell
cd C:\AI\minimax-h3-image-server
.\START.cmd
```

Wait until:

```powershell
Invoke-RestMethod http://127.0.0.1:8633/api/health
# {"status":"ok","model":"MiniMaxAI/MiniMax-H3-Image","loaded":true,"steps":6,...}
```

`loaded:false` -> trigger the load (takes ~200 s, the call blocks, ignore timeouts):

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8633/api/admin/load
```

### D.2 PC — verify cloud wiring (no model needed, safe anytime)

```powershell
.venv\Scripts\python.exe queue\poller.py --check
.venv\Scripts\python.exe queue\selftest.py
```

Expected: `config OK ... supabase OK` and `RESULT: OK`.

### D.3 Laptop — n8n

1. New workflow -> Manual Trigger -> **Code** node (Run Once for All Items).
2. Paste **Appendix A**.
3. Set `SB` and `KEY` (Appendix B read command).
4. Pin input:
   ```json
   { "prompt": "A ceramic teapot on marble, soft daylight, 50mm",
     "width": 2048, "height": 2048, "steps": 6 }
   ```
   Reference image: add `"refBinaryProperty": "data"` and have a binary item
   named `data` (e.g. from a Telegram/HTTP node).
5. **Execute step** -> `binary.data` = PNG.

### D.4 PC — watch it happen

```powershell
queue\monitor.cmd --watch 5
Get-Content queue\poller.log -Tail 20 -Encoding UTF8
```

Flow visible: `pending` -> `running` -> `completed` with seconds/vram, or
`failed` with the reason.

### D.5 Full manual job (no n8n, proves the whole chain)

```powershell
cd C:\AI\minimax-h3-image-server
$cfg = Get-Content queue\config.json | ConvertFrom-Json
$h = @{ apikey=$cfg.service_key; Authorization="Bearer $($cfg.service_key)"; "Content-Type"="application/json"; Prefer="return=representation" }
$body = @{ prompt="A single red apple on pale linen"; width=2048; height=2048; steps=6; mode="t2i"; client_tag="manual" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$($cfg.supabase_url)/rest/v1/h3_jobs" -Headers $h -Body $body
.venv\Scripts\python.exe queue\poller.py --once
queue\monitor.cmd
```

The PNG is then in bucket `h3-images` as `<row uuid>.png`; worker also prints the
path in `queue\poller.log`.

---

## 17. Appendix E — Checklist for the next agent

Read order: section 0 -> 3.1 (`SB`/`KEY`) -> Appendix D. Then:

1. `Test-Path C:\AI\minimax-h3-image-server\queue\config.json` — must exist.
2. `.venv\Scripts\python.exe queue\poller.py --check` — must print `supabase OK`.
3. `.venv\Scripts\python.exe queue\selftest.py` — must print `RESULT: OK`.
4. `Invoke-RestMethod http://127.0.0.1:8633/api/health` — if it fails, run
   `START.cmd`; if `loaded:false`, POST `/api/admin/load` and wait ~200 s.
5. n8n: `SB` must equal `supabase_url`; `KEY` must equal `service_key` (219-char
   `eyJ...`). Any other key -> 401/RLS errors.
6. Never expose port 8633, never put `KEY` in a browser/public repo.
7. Do not delete `models\cache\ckw4a8_adaln_table_pdmd3` (10.98 GB, required).
8. After changing `config.json` restart the worker (`queue\start-poller.cmd`) —
   it reads config only at startup.
9. The worker processes **one job at a time**; parallel n8n executions just queue.
10. If a job is stuck `running` >20 min, the worker auto-requeues it; force with:
    ```sql
    update h3_jobs set status='pending' where status='running';
    ```

---

# 18. Appendix F — Laptop-only agent (no access to the PC)

Use this if the MD was handed to someone who has **only the laptop** (n8n) and
cannot read files on the PC.

### F.1 Division of labour

| Section | Needed on laptop? |
|---|---|
| 0–4, 9, 16 (D.1/D.2) | **No** — reference only (PC/model/worker) |
| 3.1 (`SB`, what `KEY` is) | **Yes** — read it |
| 13 (Appendix A code) | **Yes** — paste into n8n |
| 8 (troubleshooting) | **Yes** — laptop rows |

The laptop needs exactly **3 things**: `SB`, `KEY`, the Appendix A code.
No VPN, no agent, no firewall change, no inbound port.

### F.2 The one thing this file does NOT contain

The real `service_key` (`KEY`) is intentionally **not embedded** here — a
shareable markdown file must not carry full database credentials.
The PC owner must send it separately (password manager / secure note / n8n
credential), **not** chat or email plaintext.

`SB` (safe, not secret) = `https://vozddjldekcnvadbcxbp.supabase.co`

### F.3 Prerequisites on the laptop

- Internet with **outbound HTTPS 443** to `vozddjldekcnvadbcxbp.supabase.co`
  (corporate proxies with SSL inspection are the usual blocker).
- Working n8n. Nothing else.
- The PC must be **on, online, and running `START.cmd`** — otherwise jobs stay
  `pending` and n8n fails after its 12-minute wait.

### F.4 Verify connectivity from the laptop (no Python needed)

```powershell
$SB  = 'https://vozddjldekcnvadbcxbp.supabase.co'
$KEY = '<service_role key from PC owner>'
$h   = @{ apikey = $KEY; Authorization = "Bearer $KEY" }

# 1) table reachable + key valid -> [] or rows
Invoke-RestMethod "$SB/rest/v1/h3_jobs?select=id,status&limit=3" -Headers $h

# 2) storage reachable (404/400 JSON body = auth OK, object just absent)
try { Invoke-WebRequest "$SB/storage/v1/object/h3-images/none.png" -Headers $h }
catch { "status " + $_.Exception.Response.StatusCode.value__ }
```

| Result | Meaning |
|---|---|
| `[]` or rows | ✅ connected |
| `401` / `Invalid API key` | wrong key (anon key? whitespace?) |
| `404` on everything | wrong `SB` URL |
| SSL / certificate error | proxy/SSL inspection on that network |
| DNS error / timeout | network blocks supabase.co |

### F.5 Submit a test job from the laptop

```powershell
$body = @{ prompt='A red apple on linen'; width=1024; height=1024; steps=3; mode='t2i'; client_tag='laptop-test' } | ConvertTo-Json
$job = Invoke-RestMethod -Method Post "$SB/rest/v1/h3_jobs" `
        -Headers ($h + @{ 'Content-Type'='application/json'; Prefer='return=representation' }) -Body $body
$job[0].id

# poll (should become completed in ~20-40 s if the PC worker is alive)
Invoke-RestMethod "$SB/rest/v1/h3_jobs?id=eq.$($job[0].id)&select=status,error,image_path" -Headers $h
```

`pending` for more than ~2 min = PC/worker offline (ask the owner to run
`START.cmd`). `failed` carries the reason in `error`.

### F.6 Laptop hygiene

- Put `KEY` in an **n8n credential / `$env`**, not directly in the workflow
  node, if the n8n instance is shared.
- Never print `KEY` in logs; never paste a full workflow JSON containing it.
- Do not change `SB`/`KEY` per run — they are constants.

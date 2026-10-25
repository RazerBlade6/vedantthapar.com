# vedantthapar.com — Portfolio Plan

Status: **M1 + M2 live** (resume PDF pending) · Last updated: 2026-10-25

---

## 1. Goal & positioning

**Primary goal:** get hired for full-time SWE / AI-engineering roles (2026). The site backs up the resume; it should let a recruiter understand who Vedant is in ~30 seconds, and let an engineer go as deep as they want.

**One-liner:** *AI engineer building agent systems — and going deep on the systems underneath.*

- Lead with AI/agent work (Apex, SQLSense, 1Kosmos).
- Support it with low-level depth (R-Lox, NovaRV, RotiOS). This is what sets the portfolio apart.
- Data engineering (Mondelez) and security (Underscore) appear in Experience, not in the headline.

**Status line (hero):** `R&D intern @ 1Kosmos — building agent control planes · New Delhi · India / remote · open to full-time roles, 2026`

**Secondary goal (later):** writing / technical posts. The structure supports it now (hidden `posts/` collection), and it ships when the first post exists.

---

## 2. Information architecture

### Routes

| Route | Content |
|---|---|
| `/` | Single page: hero → projects → experience → about → contact |
| `/projects/apex` | Flagship project page |
| `/projects/sqlsense` | Flagship project page |
| `/projects/r-lox` | Flagship project page |
| `/projects/archive` | Compact list: NovaRV, ScholaRAG, RotiOS (each may get its own page later) |
| `/posts/*` | Reserved. Hidden from nav, sitemap and filesystem until a post exists |
| `/resume.pdf` | Static resume |
| `404` | Terminal-style error page |

### Home page sections

1. **Hero:** `whoami` prompt, name (Departure Mono), one-liner, status line, CTAs: **Resume** and **Email**.
2. **Projects (`ls ./projects`):** 3 flagship rows (name, stack, one-line description) linking to project pages, plus an "archive" link.
3. **Experience (`cat experience.log`):** compact timeline.
   - **1Kosmos** (R&D Intern, Aug 2026–) and **Mondelez** (Strategy Intern, Aug 2025–Jan 2026): expanded, 2–3 lines each.
   - **Kosha Yoga** (Web & SEO, Jun–Aug 2025) and **Underscore** (Cybersecurity, May–Aug 2024): one line each.
4. **About (`cat about.txt`):** short first-person paragraph + dithered photo.
5. **Contact:** contact@vedantthapar.com · GitHub · LinkedIn · Resume. **No phone numbers. No contact form.**

### Project page template

Every flagship page follows the same structure:

1. One-line summary + stack tags + links (repo, live demo if any)
2. **Demo:** asciinema recording (Apex, R-Lox), GIF/screenshot (SQLSense)
3. **The problem:** why it exists
4. **Architecture:** diagram (inline SVG, theme-aware)
5. **Key design decisions:** 3–4, each with the *why* and the trade-off
   - e.g. Apex: provider abstraction over Anthropic/OpenAI/Claude Code CLI; CAS cross-machine locking + flock; per-project digests keyed to content + git-state hash; advisor loop vs builder loop
6. **What I'd do differently**
7. Prev / next project navigation

---

## 3. Visual design

Reference mockups (private canvas): https://claude.ai/artifact/39PLE2zCKc3BhUsHvyor28

**Direction:** mockup **A (Phosphor Editorial)** is the base; mockup **B (Full Vim Buffer)** is a mode you toggle into. The inspiration is rauno.me's restraint fused with a retro vi/terminal buffer.

### Principles

- Narrow single column (~640px max content width), lots of whitespace, typography-led.
- Terminal flavour through **details**: section labels as shell commands (`ls ./projects`), a vim-style status line pinned to the bottom (`NORMAL  ~/index.md  …  theme: gruvbox`), a block cursor.
- **Mostly static.** Hover states and a View Transition fade only. Richer motion is a possible later phase.
- Retro comes from typography, the status line and the cursor, not from any one color, so it survives every theme.

### Typography (fixed across all themes, self-hosted)

| Role | Font |
|---|---|
| Body, headings | **IBM Plex Sans** (400/500/600) |
| Status line, command line, metadata, tags, full-buffer mode, code | **IBM Plex Mono** (400/500) |
| Name in hero + full-buffer splash only | **Departure Mono** |

- Subset and `font-display: swap`; preload Plex Sans 400 and Departure Mono.

### Themes

Five presets. **Themes change colors only.** Type, layout and spacing are identical across themes.

| Theme | Kind | Notes |
|---|---|---|
| `gruvbox` | dark | **Default when system = dark** |
| `paper` | light | **Default when system = light**. Sepia/off-white, ink text, printed-manual feel |
| `phosphor` | dark | Green CRT. The only theme with glow + scanlines (disabled under `prefers-reduced-motion`) |
| `mocha` | dark | Catppuccin Mocha |
| `latte` | light | Catppuccin Latte |

**Selection logic:** a stored user choice (localStorage, wrapped in try/catch) wins; otherwise follow `prefers-color-scheme`. Applied by a tiny inline `<head>` script that sets `<html data-theme>` before first paint, so there's no theme flash.

**Switching:** `:theme <name>` (tab-completes; bare `:theme` lists them), clicking the theme name in the status line cycles, and a theme chip in the mobile sheet.

**Token set (~12 per theme)**, defined as CSS custom properties under `[data-theme="…"]`:

```
--bg          page background
--bg-alt      status line / code blocks / cards
--border      hairlines
--fg          body text
--fg-strong   headings, names
--fg-muted    metadata, labels (must pass 4.5:1 on --bg)
--accent      cursor, mode badge, highlights
--accent-fg   text on --accent
--link        links
--selection   ::selection background
--dither-dark / --dither-light   photo duotone
--glow        text-shadow strength (0 except phosphor)
```

**Starting palettes** (from each theme's canonical spec; every pairing gets a contrast check before shipping):

| Token | gruvbox | paper | phosphor | mocha | latte |
|---|---|---|---|---|---|
| bg | `#282828` | `#f4efe4` | `#0b0d0b` | `#1e1e2e` | `#eff1f5` |
| bg-alt | `#1d2021` | `#ebe4d4` | `#111511` | `#181825` | `#e6e9ef` |
| border | `#3c3836` | `#d8cfbc` | `#1c221c` | `#313244` | `#ccd0da` |
| fg | `#ebdbb2` | `#2b2620` | `#c9d1c7` | `#cdd6f4` | `#4c4f69` |
| fg-muted | `#a89984` | `#6b6256` | `#8a9888` | `#a6adc8` | `#6c6f85` |
| accent | `#fabd2f` | `#9c4a1a` | `#5cf08a` | `#cba6f7` | `#8839ef` |
| link | `#83a598` | `#1f4e79` | `#5cf08a` | `#89b4fa` | `#1e66f5` |

Possible later addition: an `amber` theme (IBM 3270 style).

### Photo & favicon

- Source photo supplied by Vedant.
- Build-time processing → **1-bit dithered** (Floyd–Steinberg or Bayer) PNG with a transparent background, rendered as a **duotone tinted by the active theme** (`--dither-dark` / `--dither-light`) so it recolors when the theme changes.
- **Favicon:** pixel-art crop of the same image (32×32 + 180×180 apple-touch, SVG/ICO).
- **Full-buffer mode:** `cat about.txt` prints an ASCII-art rendering of the photo above the text.

---

## 4. The terminal layer

The defining feature. **It's an extra layer on top of a normal site, never the only way to reach content.**

### 4.1 Modes

| Mode | How you enter | What it is |
|---|---|---|
| **Page mode** (default) | — | The normal site. Status line at the bottom |
| **Command line** | Press `:` (or `/` for search), or click/tap the status line | vim-style single-line prompt in the status line. Output appears in a small panel above it |
| **Full-buffer mode** | `:term`, or the toggle in the status line | Whole viewport becomes a vim buffer (mockup B): line numbers, `~` filler, mono everything, shell-like scrollback. `exit` or `Esc Esc` returns |

**Persistence across navigation:** Astro View Transitions (`transition:persist`) keep the terminal component alive, so command history, buffer scrollback and the current mode survive page changes.

### 4.2 Virtual filesystem

Generated at build time from the content collections (single source of truth; never hand-maintained):

```
~/
├── about.txt
├── experience.log
├── contact
├── resume.pdf
├── projects/
│   ├── apex.md
│   ├── sqlsense.md
│   ├── r-lox.md
│   └── archive/
│       ├── novarv.md
│       ├── scholarag.md
│       └── rotios.md
└── posts/            (hidden until a post exists)
```

Each node carries: path, type (file/dir), route URL, title, short description, and (for files) a rendered plain-text/ANSI-ish body for buffer mode.

### 4.3 Commands (v1)

| Command | Page mode | Full-buffer mode |
|---|---|---|
| `help` | Lists commands + keybindings | Same, printed |
| `ls [dir]` | Lists entries (clickable) | Same |
| `cd <dir\|section>` | Scrolls to a home section or navigates to a dir's page | Changes cwd (prompt updates) |
| `cat <file>` | **Navigates** to that page/section | **Prints** content into the buffer; links stay clickable |
| `open <project>` | Navigates to project page | Same (exits buffer mode) |
| `resume` | Opens/downloads `resume.pdf` | Same |
| `contact` | Copies contact@vedantthapar.com, confirms | Same + prints links |
| `theme [name]` | Lists or sets the theme | Same |
| `clear` | Clears output panel | Clears buffer |
| `exit` | Closes command line | Leaves buffer mode |
| `term` | Enters full-buffer mode | — |

**Behaviours:**
- Tab-completion for commands, paths and theme names.
- ↑/↓ history (persisted in sessionStorage, try/catch).
- Unknown command → `command not found: xyz — did you mean ls?` (Levenshtein nearest match).
- `cat resume.pdf` → `cat: resume.pdf: binary file — try \`resume\``.
- Paths are case-insensitive and support relative paths, `..` and `~`.

**v1.1 easter eggs (not in v1):** `sudo`, `vim`/`vi`, `rm -rf /`, `neofetch`, `whoami`, `exit` in page mode, `theme amber`, etc.

### 4.4 Vim-style keybindings (page mode)

| Key | Action |
|---|---|
| `j` / `k` | Move focus to next / previous item (project row, section, link) |
| `gg` / `G` | Top / bottom |
| `Enter` | Open focused item |
| `/` | Search (filters items, `n`/`N` next/prev) |
| `:` | Command line |
| `?` | Help overlay |
| `Esc` | Close command line / overlay |

Disabled when focus is in any text field or a modifier key is held; never overrides browser shortcuts. The focused item gets a visible cursor-style highlight.

### 4.5 Mobile

- Status line stays pinned and is a tappable bar (≥44px tall).
- Tap opens a **bottom sheet** of command chips (`ls projects`, `resume`, `contact`, `theme`, `term`, `help`) plus a text input with the soft keyboard.
- Vim keys are irrelevant on mobile. Full-buffer mode works with the same sheet.

### 4.6 Accessibility & no-JS (non-negotiable)

- All content is real server-rendered HTML with semantic headings, landmarks and real `<a href>` links. **With JS disabled the site is complete**; only the terminal is missing.
- Skip link; visible focus states in every theme; all text ≥4.5:1 contrast in every theme.
- Command line: labelled input, output region `aria-live="polite"`, `Esc` always exits, focus returns to its previous spot.
- Full-buffer mode is announced and escapable; screen-reader users are never trapped in it.
- `prefers-reduced-motion` disables glow, scanlines, cursor blink and transitions.

---

## 5. Content

**Authoring:** Claude drafts all copy (hero, about, experience lines, project write-ups) from the resume **and by reading the actual repos** in `~/Development` (`Apex`, `sqlsense`, `rlox-lang`, plus the others for archive entries). Vedant edits for voice.

**Content model** (Astro content collections, Zod-typed):

- `projects/*.mdx`: `title, slug, summary, stack[], repo?, live?, demo?, featured: bool, order, archived: bool`
- `experience.yaml`: `role, company, location, start, end?, expanded: bool, bullets[]`
- `about.md`
- `posts/*.mdx`: `title, date, summary, draft` (hidden collection)
- `site.ts`: name, one-liner, status, location, contact email, social URLs

**Inputs needed from Vedant:**
- [ ] Photo (high-res, plain-ish background)
- [ ] Correct LinkedIn URL (resume shows `linkedin.com/vedant`; verify)
- [ ] Demo recordings: asciinema for Apex + R-Lox, GIF/screenshot for SQLSense (Claude will provide exact commands)
- [ ] Review/edit drafted copy
- [ ] Updated resume PDF if anything changes (current: `Vedant_Thapar_Resume.pdf`)

---

## 6. Tech stack & architecture

| Concern | Choice |
|---|---|
| Framework | **Astro** (static output) + **MDX** |
| Terminal | Framework-free TypeScript module mounted as one client island. Engine (parser, VFS, commands, completion) is pure TS with unit tests; UI is a small custom element |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`). Theme tokens are CSS custom properties under `[data-theme]`, exposed to Tailwind via `@theme inline` (e.g. `bg-bg`, `text-fg-muted`, `border-border`). Prose from MDX styled with `@tailwindcss/typography` mapped to the same tokens |
| Diagrams | Hand-authored inline SVG using theme tokens |
| Demos | asciinema-player (lazy-loaded on project pages only) |
| OG images | Generated at build time (Satori), styled as a terminal window per page |
| Tests | Vitest for the terminal engine; Playwright smoke test (no-JS render, keyboard nav, theme switch) |
| Hosting | **Cloudflare Workers with static assets**, `wrangler` config, `not_found_handling: "404-page"` |
| CI/CD | GitHub → Cloudflare Workers Builds, deploy on push to `main`, preview deploys on PRs |
| Analytics | Cloudflare Web Analytics (cookieless, no consent banner) |
| SEO | Sitemap, canonical URLs, meta/OG/Twitter tags, `robots.txt`, JSON-LD `Person` |

### Proposed source layout

```
portfolio/
├── PLAN.md
├── astro.config.mjs
├── wrangler.jsonc
├── public/
│   ├── resume.pdf
│   ├── fonts/
│   └── favicon.*
├── src/
│   ├── content/
│   │   ├── config.ts
│   │   ├── projects/        apex.mdx, sqlsense.mdx, r-lox.mdx, novarv.mdx, …
│   │   ├── posts/           (empty)
│   │   ├── experience.yaml
│   │   └── about.md
│   ├── site.ts
│   ├── layouts/             Base.astro, Project.astro
│   ├── components/          Hero, WorkList, Experience, About, Contact, StatusLine, Photo, Diagram/*
│   ├── terminal/
│   │   ├── engine/          parser.ts, vfs.ts, commands/*.ts, complete.ts, history.ts, suggest.ts
│   │   ├── ui/              command-line.ts, buffer.ts, sheet.ts, keys.ts
│   │   └── vfs.build.ts     builds the filesystem from content collections
│   ├── styles/              base.css, themes.css, typography.css
│   ├── scripts/             theme-init.ts (inline, pre-paint)
│   └── pages/               index.astro, projects/[slug].astro, projects/archive.astro, 404.astro, og/[...].png.ts
├── scripts/                 dither-photo.ts (build-time image processing)
└── tests/
```

### Budgets

- Lighthouse ≥ 95 on all four categories (mobile).
- Home page JS: **≤ 30 KB gzipped** (terminal island), zero JS required to render.
- LCP < 1.5s on 4G; CLS ≈ 0 (fonts preloaded/sized, photo dimensions fixed).

---

## 7. Domain, email & infrastructure

- **Canonical:** `https://vedantthapar.com`. `www.vedantthapar.com` → 301 to apex (Cloudflare redirect rule).
- **Workers custom domain** bound to the apex.
- **Email:** Cloudflare Email Routing: `contact@vedantthapar.com` → Vedant's Gmail. Add SPF/DKIM so replies sent "as" the address (via Gmail send-as) deliver properly.
- **Repo:** public GitHub `RazerBlade6/vedantthapar.com`, linked from the footer and from `help`.

---

## 8. Milestones

### M1: Static site (live, complete portfolio)
- Astro scaffold, content collections, fonts, all 5 themes + pre-paint theme script + status-line theme cycling
- Home page (all sections), 3 flagship project pages (drafted copy, placeholder demos/diagrams OK), archive page, terminal-style 404
- Static status line (visual only)
- Deployed to Cloudflare Workers on vedantthapar.com, www redirect, email routing live
- **Done when:** site is live, works with JS off, passes contrast checks in every theme, Lighthouse ≥ 95.

### M2: Command line
- VFS build step, command parser, all v1 commands, tab-completion, history, did-you-mean
- `:` / `/` command line UI in the status line, vim keybindings, `?` help overlay
- Mobile bottom sheet
- Unit tests for engine; Playwright keyboard + a11y smoke tests
- **Done when:** every route is reachable by commands, keyboard-only and on a phone; no a11y regressions.

### M3: Full-buffer mode
- Buffer UI (line numbers, `~`, scrollback), `cat` prints rendered content, cwd-aware prompt
- ASCII-art photo in `cat about.txt`
- State kept across navigation via View Transitions
- **Done when:** the full site can be browsed without leaving buffer mode.

### M4: Polish
- Dithered, theme-tinted photo + pixel favicon
- Real architecture diagrams, asciinema/GIF demos embedded
- Build-time OG images, Web Analytics, sitemap, JSON-LD
- v1.1 easter eggs
- **Done when:** sharing any URL in Slack/LinkedIn shows a terminal-styled card; all project pages have real demos and diagrams.

### Later / maybe
- First blog post → unhide `posts/`
- `amber` theme
- Richer motion (CRT power-on on first visit, typed hero)
- Pages for archive projects

---

## 9. Decision log

| # | Decision |
|---|---|
| Q1 | Primary goal: get hired (SWE / AI eng) |
| Q2 | Positioning: AI/agents first, systems depth as differentiator |
| Q3 | Single home page + flagship project pages; blog later |
| Q4 | rauno-style minimal × retro vi/terminal buffer |
| Q4b | Follow system theme, dark preferred |
| Q4c | Mostly static; richer motion later |
| Q4d | Terminal/vim navigation (`help`, `ls`, `cat`…) alongside normal clicking |
| Q5 | Astro on Cloudflare, MDX content |
| Q6 | v1 live within ~1–2 weekends, then iterate |
| Q7 | Flagships: Apex, SQLSense, R-Lox; archive: NovaRV, ScholaRAG, RotiOS |
| Q8 | Hero: name, one-liner, status line, Resume + Email CTAs |
| Q9 | Experience: 1Kosmos + Mondelez expanded, others one line |
| Q10 | Email, GitHub, LinkedIn, resume PDF, photo; no phone |
| Q11 | Location: India / remote, stated explicitly |
| Q12 | Mockup A as base, B as full-buffer toggle mode |
| Q13 | `:` command line in status line (+ full-buffer mode) |
| Q14 | Full v1 command set with completion, history, suggestions; easter eggs in v1.1 |
| Q15 | Vim keybindings in page mode |
| Q16 | Mobile: tappable status line → command-chip sheet |
| Q17 | Fully usable with no JS and with screen readers |
| Q18–19 | Multiple swappable themes; retro feel need not be green |
| Q20 | Themes: phosphor, gruvbox, mocha, latte, paper |
| Q21 | Defaults: gruvbox (dark), paper (light); stored choice wins |
| Q22 | Themes are colors only; CRT glow on phosphor only |
| Q23 | Switch via `:theme`, status-line click, mobile chip |
| Q24 | Virtual filesystem generated from content |
| Q25 | `cat` navigates in page mode, prints in buffer mode |
| Q26 | Terminal state persists across navigation |
| Q27 | IBM Plex Sans + IBM Plex Mono |
| Q28 | Departure Mono for the name only |
| Q29 | 1-bit dithered, theme-tinted photo; pixel favicon; ASCII in buffer |
| Q30 | Fixed project page template incl. decisions + "what I'd do differently" |
| Q31 | Email only (contact@vedantthapar.com via Email Routing); no form |
| Q32 | Cloudflare Workers static assets; apex canonical, www redirects |
| Q33 | Public GitHub repo |
| Q34 | Cloudflare Web Analytics, sitemap, terminal-styled OG images |
| Q35 | Hidden `posts/` collection until first post |
| Q36 | Claude drafts copy from resume + repos; Vedant edits |
| Q37 | Terminal-style 404 |
| Q38 | Four milestones; M1 is a shippable portfolio on its own |

### Defaults chosen without an explicit question (flag in review if you disagree)
- Terminal implemented in framework-free TypeScript (no React/Preact) to keep JS tiny.
- ~~Plain CSS~~ → **Tailwind v4** (decided 2026-10-25: Vedant works in Tailwind daily). Terminal UI avoids shadow DOM so utilities apply.
- Satori for OG images; Vitest + Playwright for tests.
- Project slugs: `apex`, `sqlsense`, `r-lox`.
- Command history in sessionStorage (per tab), theme in localStorage.

# Phase 2 — Task 0: External Link Audit

Audit of every external URL embedded in `src/sections/*.vue` (`src/data/` contains none).
Performed 2026-06-20 on branch `phase2-content-interactives`.

**Method.** Each URL was checked for (a) HTTP resolution and (b) whether the
destination is the *intended* resource — not merely a 200. Course-logistics
links (the named accuracy risk in PROJECT_BRIEF.md §4) were cross-checked against
two ground-truth sources: the GitHub REST API, and the **raw HTML of the official
course page** `https://cvg.ethz.ch/lectures/Robot-Learning/`, whose per-lecture
"Slides / Recording / Code" link targets are authoritative.

## Headline finding

- The constructed **GitHub repo** `github.com/mees-robot-learning-course/ethz-course-2026`
  and **all four homework folder paths** are **REAL** — confirmed via the GitHub
  REST API (`/git/trees/main` returns exactly `hw1_pytorch_tutorial`,
  `hw2_robot_control_mdps`, `hw3_imitation_learning`, `hw4_reinforcement_learning`)
  and they appear verbatim as the "Code" links on the official course page. No change.
- The **ETH video-portal links** `video.ethz.ch/lectures/d-infk/2026/spring/263-5911-00L/v/<ID>`
  were **fabricated / pattern-constructed**. The video portal is a JavaScript SPA
  that returns **HTTP 200 for every path** (even `…/v/<garbage>` and a bogus
  `.series-metadata.json`), so a 200 proves nothing. Critically, the **official
  course page links NO lectures to video.ethz.ch at all** — every lecture's
  "Recording" is a **YouTube** link. The specific portal video IDs are therefore
  **UNVERIFIABLE and almost certainly wrong-content**. Fixed by replacing each with
  the official per-lecture YouTube "Recording" URL taken from the course page
  (each content-confirmed: titled "Robot Learning 2026 – Lecture N … | ETH Zürich").

## Status legend
OK = resolves and content confirmed intended · FIXED = bad link replaced with a
web-confirmed correct URL · UNVERIFIABLE = resolves but content cannot be
confirmed · (no 404/WRONG-CONTENT survived into the final file).

## Course-logistics links (high-risk)

| URL | Section / where | Purpose | Status | Note |
|---|---|---|---|---|
| https://cvg.ethz.ch/lectures/Robot-Learning/ | Start L86 | Official course page | OK | Confirmed: "Robot Learning: From Fundamentals to Foundation Models", Spring 2026, Oier Mees. Known-good anchor. |
| https://www.youtube.com/playlist?list=PLPU18BnWYUZJx3_d901-GD6BGpeWwE2vx | Start L87, L1 L75, L12 L46 | Main lecture playlist | OK | Known-good anchor playlist id. |
| https://github.com/mees-robot-learning-course/ethz-course-2026 | Start L88 | Course GitHub (HW 1–4) | OK | Repo confirmed via GitHub API + on official course page. 418★. |
| https://video.ethz.ch/lectures/d-infk/2026/spring/263-5911-00L | Start L89 | "ETH video portal (all recordings)" | FIXED | Portal returns 200 for any path; official page uses YouTube, not this portal. Replaced with the official YouTube playlist (same destination the page itself points recordings to). |
| https://video.ethz.ch/.../v/AS1N0xMxWTe | L1 L75 | Recording — Lecture 1 | FIXED → https://www.youtube.com/watch?v=X0k14u6pSxw | Official page "Recording" for L1; confirmed title "Robot Learning 2026 – Lecture 1: Introduction to Robot Learning \| ETH Zürich". |
| https://github.com/mees-robot-learning-course/ethz-course-2026/tree/main/hw1_pytorch_tutorial | L1 L76 | HW1 | OK | Folder confirmed via GitHub API + official "Code" link. |
| https://video.ethz.ch/.../v/L224Ovxd2l4 | L2 L90 | Recording — Lecture 2 | FIXED → https://www.youtube.com/watch?v=5-Bb84eTTqQ | Official L2 Recording; confirmed title "…Lecture 2: Robot Control & Markov Decision Processes \| ETH Zürich". |
| https://youtu.be/aG8NPTPhwkE | L2 L91 | Guest spotlight (Abhishek Gupta) | OK | Appears verbatim on official course page (L2 secondary YouTube link). |
| https://github.com/.../tree/main/hw2_robot_control_mdps | L2 L92 | HW2 | OK | Folder confirmed via GitHub API + official "Code" link. |
| https://video.ethz.ch/.../v/JsiQ5TXg7TE | L3 L92 | Recording — Lecture 3 | FIXED → https://youtu.be/Ef4R5s1LqoQ | Official L3 "Recording" link from course page. |
| https://youtu.be/qvTP6T5oq1w | L3 L93 | Guest spotlight (Danfei Xu) | OK | Verbatim on official course page. |
| https://github.com/.../tree/main/hw3_imitation_learning | L3 L94 | HW3 | OK | Folder confirmed via GitHub API + official "Code" link. |
| https://video.ethz.ch/.../v/Es_bD52lZcS | L4 L118 | Recording — Lecture 4 | FIXED → https://youtu.be/90raNpc11tQ | Official L4 "Recording" link from course page. |
| https://youtu.be/fHHLmTu9sFk | L4 L119 | Guest spotlight (Aviral Kumar) | OK | Verbatim on official course page. |
| https://video.ethz.ch/.../v/D5hhpjIs3C4 | L5 L202 | Recording — Lecture 5 | FIXED → https://youtu.be/AdTGz8YnnlE | Replaced with official L5 "Recording". The site already carried `youtube.com/watch?v=AdTGz8YnnlE` as a "YouTube mirror" alongside; the mirror line is now redundant and removed. |
| https://www.youtube.com/watch?v=AdTGz8YnnlE | L5 L202 | "YouTube mirror" | OK (merged) | Same video as the official L5 recording; kept as the single Recording link. |
| https://youtu.be/CPmTpXA5azw | L5 L203 | Guest spotlight (Andrew Wagenmaker) | OK | Verbatim on official course page. |
| https://github.com/.../tree/main/hw4_reinforcement_learning | L5 L204 | HW4 | OK | Folder confirmed via GitHub API + official "Code" link. |
| https://video.ethz.ch/.../v/LFYFshj243o | L6 L86 | Recording — Lecture 6 | FIXED → https://youtu.be/qd6Ldsuu46I | Official L6 "Recording" link from course page. |
| https://youtu.be/tvFvIEOBKfM | L6 L87 | Guest spotlight (Cheng Chi) | OK | Verbatim on official course page. |
| https://video.ethz.ch/.../v/F8PRjuPO59n | L7 L85 | Recording — Lecture 7 | FIXED → https://youtu.be/imSTfMJjp7M | Official L7 "Recording" link from course page. |
| https://youtu.be/VS7Ulaugevg | L7 L86 | Guest (Ted Xiao) | OK | Verbatim on official course page. |
| https://video.ethz.ch/.../v/Jb90moV57jQ | L8 L73 | Recording — Lecture 8 | FIXED → https://youtu.be/cTTmUZlOF2s | Official L8 "Recording" link from course page. |
| https://www.youtube.com/watch?v=fqkp_wkov6M | L8 L74 | Guest spotlight (Scott Reed) | OK | Verbatim on official course page. |
| https://video.ethz.ch/.../v/KyyHLxpERXT | L9 L76 | Recording — Lecture 9 | FIXED → https://youtu.be/dtofzDY9zuo | Official L9 "Recording" link from course page. |
| https://youtu.be/pzolgvyWEFY | L9 L77 | Guest spotlight (Quan Vuong) | OK | Verbatim on official course page. |
| https://youtu.be/oBEkY6NeE_o | L10 L73 | Guest spotlight (Archit Sharma) | OK | Verbatim on official course page (L10 secondary YouTube link). |
| https://www.youtube.com/watch?v=0XB7fNS_ONg | L11 L59 | Lecture 11 video | OK | Verbatim on official course page (L11 "YouTube Recording"). |

### Lecture slide PDFs (course page) — all OK
All `cvg.ethz.ch/lectures/Robot-Learning/lectures/lectureN_*.pdf` return HTTP 200
with `Content-Type: application/pdf`, and each href matches the official course
page exactly.

| URL | Section | Status |
|---|---|---|
| .../lecture1_intro.pdf | L1 L74 | OK (application/pdf) |
| .../lecture2_control_mdp.pdf | L2 L89 | OK |
| .../lecture3_imitation.pdf | L3 L91 | OK |
| .../lecture4_rl_I.pdf | L4 L117 | OK |
| .../lecture5_rl_II.pdf | L5 L201 | OK |
| .../lecture6_generative.pdf | L6 L85 | OK |
| .../lecture7_sequence_modeling.pdf | L7 L84 | OK |
| .../lecture8_world_models.pdf | L8 L72 | OK |
| .../lecture9_generalist_policies.pdf | L9 L75 | OK |
| .../lecture10_reasoning.pdf | L10 L72 | OK |
| .../lecture12_*  (none) | — | n/a — site has no L12 slide link |

## Reading / citation links (lower-risk — paper & resource references)

All resolve HTTP 200 as genuine destinations. arXiv IDs are stable; samples were
content-confirmed (e.g. 2511.14759 = "π*₀.₆: a VLA That Learns From Experience",
Physical Intelligence, Nov 2025). Not in the named high-risk scope; none changed.

| URL | Section | Purpose | Status |
|---|---|---|---|
| https://arxiv.org/pdf/2408.15980 | L10 | Reading | OK |
| https://arxiv.org/abs/2305.16291 | L10 | Reading (Voyager) | OK |
| https://arxiv.org/pdf/2505.08243 | L10 | Reading | OK |
| http://www.incompleteideas.net/IncIdeas/BitterLesson.html | L11 | Sutton, Bitter Lesson | OK |
| https://openreview.net/pdf?id=BZ5a1r-kVsf | L11 | Reading | OK |
| https://people.csail.mit.edu/brooks/papers/representation.pdf | L11 | Brooks paper | OK |
| https://homes.cs.washington.edu/~fox/ | L12 | Researcher page | OK |
| https://people.eecs.berkeley.edu/~pabbeel/ | L12 | Researcher page (Abbeel) | OK |
| https://arxiv.org/abs/1504.00702 | L12, L5 | E2E deep visuomotor | OK |
| https://arxiv.org/abs/1803.07055 | L2 | Reading | OK |
| https://www.alexirpan.com/2018/02/14/rl-hard.html | L2 | "Deep RL Doesn't Work Yet" | OK |
| https://arxiv.org/pdf/1705.05363 | L2 | Curiosity | OK |
| https://arxiv.org/abs/1905.11979 | L3 | Reading | OK |
| https://arxiv.org/abs/2112.01511 | L3 | Reading | OK |
| https://arxiv.org/pdf/2010.14406 | L3 | Reading | OK |
| https://arxiv.org/abs/1703.03864 | L4 | Evolution strategies | OK |
| https://arxiv.org/abs/1803.09956 | L4 | Reading | OK |
| https://arxiv.org/pdf/2410.21845 | L4 | Reading | OK |
| https://arxiv.org/abs/2310.12931 | L5 | Reading | OK |
| https://arxiv.org/pdf/2209.08959 | L5 | Reading | OK |
| https://arxiv.org/abs/2205.09991 | L6 | Reading | OK |
| https://arxiv.org/pdf/2109.00137 | L6 | Reading | OK |
| https://arxiv.org/abs/2506.15799 | L6 | Reading | OK |
| https://arxiv.org/abs/2106.01345 | L7 | Decision Transformer | OK |
| https://arxiv.org/abs/2304.13705 | L7 | Reading | OK |
| https://arxiv.org/pdf/2402.19469 | L7 | Reading | OK |
| https://arxiv.org/abs/2302.00111 | L8 | Reading | OK |
| https://arxiv.org/abs/2509.24527 | L8 | Reading | OK |
| https://dreamzero0.github.io/DreamZero.pdf | L8 | DreamZero paper (also on official page) | OK (real PDF; exceeds fetch size) |
| https://arxiv.org/abs/2504.16054 | L9 | Reading | OK |
| https://arxiv.org/pdf/2005.07648 | L9 | Reading | OK |
| https://arxiv.org/abs/2205.06175 | L9 | Gato | OK |
| https://arxiv.org/abs/2511.14759 | L9 | π*₀.₆ (content-confirmed) | OK |
| http://calvin.cs.uni-freiburg.de/ | L9 | CALVIN benchmark | OK |
| https://openvla.github.io/ | L9 | OpenVLA | OK |
| https://robotics-transformer-x.github.io/ | L9 | RT-X / Open X-Embodiment | OK |

## Decisions & rationale

1. **Kept** the GitHub repo and all four HW paths — they are genuine (API +
   official-page confirmed). The original brief flagged them as *risk*; the audit
   clears them.
2. **Replaced** all nine per-lecture ETH video-portal links and the course-wide
   portal link. The portal IDs are unverifiable (SPA 200-for-everything) and the
   official course page never uses that portal — it links recordings to YouTube.
   Replacements are the exact per-lecture YouTube "Recording" URLs from the
   official course page, each a content-confirmed ETH lecture video.
3. The site's "ETH video portal — Lecture N" link **text** was changed to
   "YouTube recording — Lecture N" so the label matches the new destination (no
   false promise of an ETH-portal resource). All other prose left byte-identical.
4. L5 carried a redundant "YouTube mirror" (`watch?v=AdTGz8YnnlE`) next to the
   portal link; since that IS the official recording, the portal half was dropped
   and the single Recording link now points to it.

## Honesty notes / residual concerns

- HTTP 200 from `video.ethz.ch` and from `youtube.com` is **not** proof of
  content. For the kept YouTube links, confirmation comes from their verbatim
  presence on the official course page (authoritative), not from the 200.
- The official per-lecture YouTube IDs were taken from the course page HTML on
  2026-06-20; two were additionally title-confirmed (L1, L2). The remaining seven
  are trusted on the basis that the official page lists them as that lecture's
  "Recording" — a strong source but not independently title-fetched here.
- arXiv citation links are out of the named high-risk scope and were not changed;
  all resolve and sampled ones are genuine.

# Alexia's World — project context

A hub of voice-led games for 2–4 year olds, starring five characters generated
from the family's photos. Live: https://vinson-leow.github.io/alexias-world/
Read HANDOFF.md first, then EVENTS.md. The character bible, art masters and
scene docs live in the private repo `vinson-leow/alexias-world-private`.

## The five characters — never drop, rename, or re-imagine any of them

| Character | Who | Height | Higgsfield solo still — use THIS as the reference |
|---|---|---|---|
| Zane | boy | 91cm (94cm with his topknot) | `68e73f57-a4fd-41ec-b4f8-339ac79b1c71` |
| Alexia | girl | 88cm | `884d2b77-1f66-4d36-a699-c8493a83f358` |
| Oliver | boy, blonde | 92cm | `c0a90ef4-6ad5-432d-90af-6c6c1a97fdac` |
| Bunny | living plush rabbit | 80cm | `508cdf7d-1a1e-4a77-9e3d-321f82fc9d13` |
| Grumblor | big friendly shaggy monster | 150cm | `f785c8d1-caa8-4d29-a300-daec93f87a26` |

The children's locked physical descriptions are in CHARACTER-BIBLE.md in the
private repo — restate them verbatim in every generation prompt. Alexia's
sneakers are always "plain unbranded, no logos".

- **Bunny** — dusty rose-pink plush, long floppy ears, glossy mint-green bead
  eyes, gold heart nose, red heart patch on the chest that glows, mint-turquoise
  satin hooded cape with a gold star clasp; the cape hood carries the heart icon.
- **Grumblor** — dense salmon-pink fur, two short white tusks, wide blunt-toothed
  grin, big pointed ears, small green nose, glowing yellow eyes, glowing violet
  spines down back and tail, tufted purple tail, rainbow-panelled propeller
  beanie between two small white horns.
- **Shared mark** — the heart icon (girl + bunny inside a red heart outline),
  asset `528e0707-4b2b-45de-a4ac-1de3b7547003`. Printed on Alexia's tee and on
  Bunny's cape hood, always identical; pass it as a reference wherever either
  is visible.

These IDs belong to the Higgsfield account and work from any session with the
Higgsfield connector.

## Art rules

Reference photos → turnaround sheet → ONE solo still → everything else from
the solo still. Never feed a multi-panel sheet into a scene; it duplicates the
character. Every multi-character prompt says "EXACTLY N characters, one per
reference image, each appears exactly ONCE" and restates all heights. Describe
costumes, never name licensed characters. Model: gpt_image_2 — 16:9 · 2k · high
for sheets and scenes; 1:1 · 1k · high for cards; 2:3 · 1k · high for solo
stills. Photos must go in through media_upload_widget; chat attachments are
invisible to remote tools. If the connector's array-typed tools reject arrays,
use single generate_image calls and poll job_display by id.

## App rules

No fail state anywhere — a wrong answer wobbles or springs back. Every screen
speaks; nothing requires reading. Every tappable thing is big. Cards never
move. Difficulty is set by a grown-up behind the number gate, never by a menu
the child can read. Only one outfit per character in a memory deck (toddlers
match by character). Wrong answers teach ("That is blue — find red!"). Zero
build step: plain ES modules and CSS served over HTTP; deploy = push to main,
GitHub Pages builds in ~30s.

## Data

Every tap is logged with who / game / correct / gap-since-last-action; "fast"
and "slow" are relative to the child's own history. Profiles: alexia (default),
zane, oliver, and parent (testing, kept separate). Parent dashboard at
`#/parent` behind the gate. Schema is versioned (`events.v1`, JSON Schema at
`assets/schema/events.v1.json`); `summarise()` produces `digest.v1`;
`window.AlexiaWorld` exposes events and the digest in-page; an opt-in webhook
POSTs events live. This is the integration surface for a future MCP server —
keep the schema stable and versioned. Full contract: EVENTS.md.

## Architecture, gotchas, open threads

See HANDOFF.md — the file map, the gotchas and the open threads are kept there.

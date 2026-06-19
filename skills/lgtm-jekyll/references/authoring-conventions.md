# Authoring conventions

The house rules that keep a large, multi-chapter book consistent and buildable.

## Depth standard for chapters

Chapters are substantial prose, not summaries. The bar that produced the source
book: roughly **1,400–1,900 words**, explaining the *why* behind each choice, not
just the *what*; walk the reader through the mechanism the way it actually works;
include a real cross-check (a second tool or method that confirms the result); and
use full, explicit paths to any example files (`examples/NN-name/file`) so prose
and the repo agree. Field-guide / catalogue chapters should carry **several**
working examples, not one.

A consistent chapter spine works well: a short hook → a diagram → the concept →
how the code works → build/run/observe → cross-check → "what you learned" → a
verification-status line. If a chapter emits a metric, **name both observation
surfaces**: the terminal/live view *and* the specific dashboard query. If it emits
none (inspection/control-plane chapters), say so explicitly ("no dashboard panel
by design") rather than omitting it silently.

## Static validation (run before shipping each chapter)

No Ruby/Jekyll is needed to catch the common breakers:

```python
import yaml, re
s = open("_docs/NN-name.md").read()
fm = yaml.safe_load(s.split("---")[1])           # front matter parses?
assert fm["part"]                                 # has a part
# Liquid: any {{ }} that isn't relative_url / include / site. must be in {% raw %}
bad = [q for q in re.findall(r"\{\{.*?\}\}", s)
       if not any(k in q for k in ("relative_url","include ","site."))]
# alt text: no stray bare tags inside the excalidraw include's alt=""
for blk in re.findall(r"{% include excalidraw.html.*?%}", s, re.S):
    alt = re.search(r'alt="(.*?)"', blk, re.S)
    assert not (alt and re.findall(r"<[a-zA-Z/][^>]*>", alt.group(1)))
```

And the rule that links the collections: a chapter's `part:` **must exactly
equal** some `_parts/*.md` `part_name` (case + spacing). A quick check is to load
every part_name and assert each chapter's `part` is in that set.

## Liquid escaping

`_docs` content is processed by Liquid. Wrap any literal `{{ }}`/`{% %}` in
`{% raw %}…{% endraw %}` — most often around a fenced `excalidraw.html` include
example or any braces in code. `_plans` pages set `render_with_liquid: false`, so
literal braces there need no escaping.

## Command and status conventions

- Prefix shell commands by where they run: `[host]$` (your laptop), `[vm]$` (the
  target VM), `[peer]$` (a second VM). Use `<angle-brackets>` for placeholders.
- Keep commands single-line and shell-safe; never leave a trailing unbalanced
  quote.
- Mark code/examples the reader should still run and verify with a
  **verification-status** line, e.g. an `unverified` badge, and list the concrete
  things to confirm on real hardware. Don't claim a result you didn't run.
- Prefer the word "real"/"practical" over "honest" in prose.

## Per-iteration rhythm (for big builds)

Building a large book goes faster as small, cumulative iterations:

1. Write/revise the chapter and its example.
2. Generate/refresh any diagram (`scripts/generate_diagram.py`) and catalogue it.
3. Run the static validation above; fix front matter / Liquid / alt issues.
4. Keep a `_plans/iteration-plan.md` row and a reconciliation note so the build
   stays auditable.
5. Commit and let the Pages workflow deploy. Reader feedback on the rendered site
   (diagram legibility, table wrapping, navigation) is the real test — fold it
   back into `site.css` or the chapter and re-ship.

## Keep the Pages workflow on current (Node 24) actions

GitHub forced Actions onto Node 24 in June 2026; Node 20 actions warn (and are
removed Sept 16 2026). The bundled `workflow-pages.yml` pins Node-24 majors:
`actions/checkout@v5`, `actions/configure-pages@v6`,
`actions/upload-pages-artifact@v5` (it bundles `upload-artifact@v7`), and
`actions/deploy-pages@v5`. If a deprecation warning reappears, bump the offending
action to its latest major; as a stopgap you can set
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` as a workflow-level `env`.

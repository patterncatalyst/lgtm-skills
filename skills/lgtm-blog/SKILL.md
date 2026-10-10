---
name: lgtm-blog
description: Author a post for the Pattern Catalyst Blog (patterncatalyst-blog) end to end in the house style, and wire it into the ecosystem — write the essay in the lgtm-professional-voice register, generate paired SVG + Excalidraw figures with lgtm-diagram-generator, add real code samples, back-link to the source workshop/tutorial/reference project the post is mined from, feature it on the hub (patterncatalyst-workshops-tutorials-list `_data/blogs.yml`), and verify the Jekyll build. Use whenever someone wants to write, draft, or add a blog post for Pattern Catalyst, turn a chapter/appendix of a workshop or tutorial into an article, "write a blog from the datamesh/otel/cpp/... project", mine a reference build for a post, or publish field notes drawn from the catalog. Also triggers on "new blog post", "add a post", "blog this up", "write an article from <project>", "feature the post on the hub". Composes lgtm-professional-voice (voice pass), lgtm-diagram-generator (figures), and the "Blog mode" of lgtm-jekyll (site mechanics); reach for those directly for a pure voice pass, a one-off diagram, or site scaffolding.
---

# lgtm-blog — author a Pattern Catalyst blog post

The Pattern Catalyst Blog (`~/Dev/patterncatalyst-blog`, live at
<https://patterncatalyst.github.io/patterncatalyst-blog/>) holds essay-style
articles **mined from** the workshops, tutorials, and reference builds in the
catalog. A good post takes one sharp idea from a source project, makes the
argument in prose for an engineer reader, backs every claim with real code and a
figure, and links back to the source so a reader can go deeper. This skill is
the repeatable recipe for producing one.

It is a **thin orchestrator**. The site mechanics live in the blog repo's
`CLAUDE.md` and the "Blog mode" section of `lgtm-jekyll`; the voice rules live in
`lgtm-professional-voice`; the figures come from `lgtm-diagram-generator`. This
skill ties them into one pass and adds the two steps those skills don't cover:
**back-linking to the source project** and **featuring the post on the hub**.

## Non-negotiables

- **Every post has real code samples and at least one diagram.** Prose-only
  posts are not in house style. Pull code from the source project's actual
  files (not invented), and generate figures as paired SVG + `.excalidraw`.
- **Voice.** Write in the `lgtm-professional-voice` register: peer-to-peer, for
  engineers. No em-dash overuse, no contrived/AI-sounding phrasing, no
  meta-narration. Run the scan before you call it done.
- **Mined, not duplicated.** The post makes its own argument; it does not
  copy-paste a chapter. It *links* to the source chapter for the full treatment.
- **Never commit or push without explicit permission.** Author locally, build to
  verify, then stop and report. Publishing is the user's call.

## The workflow

### 1. Pick the idea and the source

One post = one idea. Identify the source project (a repo under
`~/Dev/` that's also in the hub's `_data/sites.yml`) and the specific
chapter/appendix the post draws from. Grab its live site URL, GitHub repo, and
the deep-link URLs for the chapters you'll cite from `_data/sites.yml`.

### 2. Scaffold the post

`scripts/new_post.sh "<Title>" <source-repo-slug>` creates
`_posts/YYYY-MM-DD-<slug>.md` with the house front matter filled in, or write it
by hand:

```yaml
---
title: "A specific, concrete title"
date: YYYY-MM-DD
author: "Pattern Catalyst"
tags: [tag-a, tag-b]
categories: [cloud-native]
canonical_project:
  name: "Source Project Name"
  repo: "patterncatalyst/<source-repo>"
  url: "https://patterncatalyst.github.io/<source-repo>/"
excerpt: "One-sentence summary used on the listing and in the feed."
---
```

Single posts use the **essay layout** (`_layouts/post.html`): one centered
column, ~46rem measure, kicker + title + byline + tag chips, lead paragraph,
no breadcrumb, no sidebar. Keep listings (home, tag/category) **tabular**.

### 3. Write the body

- Open with a concrete hook, not a definition. State the idea the post exists to
  make, then earn it section by section.
- **Code samples:** fenced blocks with a one-line comment header naming the file
  they're from. The blog has no `codetabs` include — use sequential fenced
  blocks, not tabs. Keep snippets short and real; link the full file in the
  source repo pinned to a tag/branch (e.g. `stage/06`) so the link stays valid.
- **Figures:** generate with `lgtm-diagram-generator` into
  `assets/diagrams/<name>.svg` + `.excalidraw`, then embed:

  ```liquid
  {% include excalidraw.html file="<name>"
     alt="Full sentence describing the figure for screen readers."
     caption="What the figure shows / the point it makes" %}
  ```

  House style: amber accent (`#e8870c`) on neutral greys, Red Hat fonts (the
  generator's default). No AI/stock hero art.
- Close with a **Source project** note: a short paragraph linking
  `canonical_project.url` and the specific chapter(s) the post is mined from,
  plus the GitHub repo. If the post borrows from more than one project, link
  each.

### 4. Back-link to source projects

This is the step the composed skills don't do. For each project the post draws
on, link:

- the **live chapter/appendix** URL (deep link, not just the site root),
- the **source files** on GitHub for any code shown (pinned ref), and
- the **site root** in the Source-project footer.

Internal links to the hub use `{{ site.hub_url }}`, never a hardcoded URL.

### 5. Feature it on the hub

Add an entry to `~/Dev/patterncatalyst-workshops-tutorials-list/_data/blogs.yml`
with the post's **live** URL (computed from the permalink
`/:year/:month/:day/:title/`), newest first:

```yaml
- title: "<same as post title>"
  date: "YYYY-MM-DD"
  author: "Pattern Catalyst"
  url: "https://patterncatalyst.github.io/patterncatalyst-blog/YYYY/MM/DD/<slug>/"
  blurb: >
    1-2 sentence summary (can reuse the excerpt).
  tags: ["tag-a", "tag-b"]
  source_project: "<source-repo-slug>"
```

### 6. Voice pass

Run the professional-voice scan on the new file and fix what it flags (it skips
code, commands, and recorded output):

```bash
bash ~/.claude/skills/lgtm-professional-voice/scripts/scan.sh \
  ~/Dev/patterncatalyst-blog/_posts/YYYY-MM-DD-<slug>.md
```

### 7. Build to verify — both sites

A post touches **two Jekyll sites**, so build and verify both before stopping:

```bash
cd ~/Dev/patterncatalyst-blog && bundle exec jekyll build                     # the post itself
cd ~/Dev/patterncatalyst-workshops-tutorials-list && bundle exec jekyll build  # the hub blogs page
```

Each must exit 0 with no Liquid/YAML errors. Confirm the post renders with its
diagrams resolving, and that the hub's Blogs page lists the new entry. Then
**report and stop** — do not commit or push unless the user asks.

### 8. Publish updates both sites

When the user says to publish, remember it is **two repos, two commits, two
pushes, two GitHub Pages deploys**:

1. `patterncatalyst-blog` — the new post + its `assets/diagrams/*` files.
2. `patterncatalyst-workshops-tutorials-list` — the `_data/blogs.yml` entry.

Push each to `main` and **confirm both Actions runs go green** (the blog post is
not actually live for the hub link to reach until the blog deploy finishes). A
blog push without the matching hub push leaves the post unlisted; a hub push
without the blog push leaves a dead link. Do both.

## Checklist before calling it done

- [ ] Front matter complete (title, date, author, tags, categories, `canonical_project`, excerpt)
- [ ] At least one diagram, paired `.svg` + `.excalidraw` committed under `assets/diagrams/`
- [ ] Real code samples with file-name comment headers, full files linked at a pinned ref
- [ ] Source-project footer links the chapter(s) + repo; hub links use `{{ site.hub_url }}`
- [ ] Hub `_data/blogs.yml` entry added, newest first, with the live URL
- [ ] `lgtm-professional-voice` scan clean
- [ ] Both sites `jekyll build` exit 0 — the blog (post + figures) and the hub (blogs page lists it)
- [ ] Not committed/pushed unless the user asked; when asked, **both** repos pushed and both Pages runs confirmed green

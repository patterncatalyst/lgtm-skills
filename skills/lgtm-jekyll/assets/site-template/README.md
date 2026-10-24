<!--
  Top-level README for the GitHub repo landing page. Jekyll excludes this file
  from the built site (see _config.yml `exclude`), so it never renders as a page.
  When scaffolding a project, REPLACE every <PLACEHOLDER> and delete the parts
  that do not apply. Keep it voice-clean: no em-dash, no ban-tier phrasing.
-->

# <PROJECT_TITLE>

<ONE_LINE_DESCRIPTION>

**Live site:** https://<GITHUB_OWNER>.github.io/<REPO_SLUG>/

## What this is

<A short paragraph: who it is for and what they will be able to do by the end.>

## Prerequisites

<List the local tools and versions. Point at scripts/check-prereqs.sh if present.
Chapter 0 covers setup in full.>

## Build and test

<The real commands a reader runs. For example:>

```sh
./scripts/build.sh
./scripts/verify.sh
```

## Reading the site locally

```sh
bundle install
bundle exec jekyll serve
```

## Layout

| Path | Contents |
| --- | --- |
| `_docs/` | Chapters (`NN-*.md`) |
| `_parts/` | Part landing pages |
| `examples/` | Runnable example per hands-on chapter (if any) |
| `diagrams/` | Paired `.svg` + `.excalidraw` figures |
| `_plans/` | Build plans and verification status (not published) |

## Status

<What is done, what is still to come.>

## License

<LICENSE_NAME>. See [LICENSE](LICENSE).

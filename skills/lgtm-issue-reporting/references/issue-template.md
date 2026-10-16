# Issue body template

Copy this to `<project>/_plans/upstream/<slug>.md`. Line 1 holds the title, and everything after it becomes the body.
Generate the body file with `tail -n +2 <slug>.md | sed '1{/^$/d}' > <slug>.body.md`, then pass that file to `gh issue create --body-file`.

Replace every `<…>` with the real value. Delete any optional section that has nothing to say instead of
writing "N/A".

````markdown
**Title:** <symptom, stated as fact> <, so / but> <the consequence a user sees>

### Describe the bug

<What the user declares or sends, in one sentence.> <What the library promises: the schema it prints, its
docs, the spec it implements.> <What happens instead, with the exact error text in backticks.>

<The cause, if you read the source: `Class.method` at `path/File.java:NNN–MMM` on `main`, and the call that
is missing or the check that fires first.>

<If the library's own docs, tests or examples use the failing pattern, link them here, e.g. "SmallRye's own
[federation guide](…) shows `product(@Id List<String> id)`".>

<If an open issue overlaps: "This is narrower than #NNN (<its subject>). <What this one adds and why it helps
even before #NNN lands.>">

### Reproducer

Runnable project: [<module>](https://github.com/<owner>/<project>-reproducers/tree/main/<module>) in
https://github.com/<owner>/<project>-reproducers. Its test asserts the expected behaviour, so it fails until
this is fixed:

```console
git clone https://github.com/<owner>/<project>-reproducers.git && cd <project>-reproducers
<clean build/test command for the pinned line>            # <framework x.y.z> / <library a.b.c>
<same with the pre-release line override>                 # <library pre-release>
<same with the locally built main override>               # local main
```

Result on all <N>: <Tests run: T, Failures: F> (<the failing test names>); <the control tests that pass>.

The same code inline:

```<lang>
<the single class or function; nothing else>
```

<Requests and responses, or test output, copied exactly from your run. Remove timestamps, absolute paths and
hostnames, and nothing else.>

```console
$ <request>
<response>
```

### Expected behavior

- <one bullet per bug assertion in the test, stated in prose>

### Variants tried

<Optional.>

| Declaration | Result | Observed by |
|---|---|---|
| `<variant>` | <result> | <this run / earlier probe on version X> |

### Suggested fix

<Optional, and only from reading the source. Numbered steps that name the method and the missing call.>

### Workaround

<What an application can do today, with a pointer to working code. Otherwise: "None inside <project>:
applications have to <…>".>

### Environment

The same output was reproduced on:

| <Framework> | <Library> | <Engine> |
|---|---|---|
| <pinned> | <x.y.z> | <e.f> |
| <pre-release> | <x.y.z-BetaN> (<BOM-managed or pinned>) | <e.f> |
| <framework> | `main` at <sha7>, built locally as `<version>-SNAPSHOT` (<N> commits ahead of `<latest tag>`) | <e.f> |

Also: <JDK/Python version>, <OS>, <run mode>. <Related: #NNN>
````

## Title patterns that worked

- `` `@Id` on a `List<String>` query argument prints `[ID]` in the schema but every request fails with "Unknown Scalar Type [java.util.List]" ``
- `` `@io.smallrye.graphql.api.Deprecated(reason=…)` is printed as `@deprecated` but introspection reports `isDeprecated: false` ``
- `` Client request `extensions` never reach graphql-java's `ExecutionInput`, so `ApolloPersistedQuerySupport` cannot be plugged in ``

Each one names the user-facing API, what looks right and what goes wrong. None of them uses "bug", "broken",
"doesn't work" or "please".

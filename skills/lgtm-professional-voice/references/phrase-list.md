# Phrase list

Every pattern `scripts/scan.sh` checks, grouped as in `scripts/patterns.tsv`,
with the default rewrite. **Ban** means rewrite unless you can state why the
phrase is needed. **Watch** means triage each hit. Many are correct in context.

Counts in brackets are hits across four sibling repositories
(datamesh-reference-arch-quarkus, modernizing-enterprise-applications,
cloud-native-design-patterns, enterprise-integration-patterns-with-camel) in
October 2026. They show which tics recur.

## Confessional register

The text calls itself honest, which implies the rest of it is not.

| Phrase | Tier | Rewrite |
|--------|------|---------|
| honest, honestly, honesty, to be honest, an honest accounting [50+] | ban | Delete the word, or name the property: *accurate*, *measured*, *complete*, *with its limits*. "An honest accounting of when microservices are the wrong answer" → "When microservices are the wrong answer". |
| frankly, candidly, admittedly | ban | Delete. |
| plainly, stated plainly, put plainly [15+] | ban | Delete. "Stated plainly rather than implied" → nothing; the sentence already states it. |
| let's be clear, to be clear, to be fair | ban | Delete and start with the claim. |
| the truth is, in reality, truth be told | ban | Delete. |
| not hidden, nothing is hidden | ban | Say where the thing is: "listed in Appendix C". |
| on purpose, for free [40+] | ban | *on purpose* → delete, or give the reason ("to keep the example single-module"). *for free* → *by default*, *without extra configuration*, *provided by X*. |
| lie, lies, lying | watch | Person or process as subject: rewrite (*naive*, *unwarmed*, *incomplete*). Machine reporting a wrong value ("the mtime can lie"): keep. This is the `lgtm-tutorial` rule. |

## Defensive contrast

The text answers an objection nobody raised ("this is real code, not a toy").
Engineers assume the code is real. Defending it makes them suspect it is not.

| Phrase | Tier | Rewrite |
|--------|------|---------|
| genuine, genuinely [110+] | ban | Delete. "under genuine concurrent load" → "under concurrent load". |
| deliberately, intentionally [180+] | ban | Delete, or replace with the reason. Keep at most one per chapter, where a reader would otherwise assume a mistake. |
| real X, not a toy Y; not a stub; not slideware | ban | Keep the positive half: "a real endpoint, not a toy snippet" → "a running endpoint". |
| real, running; for real; truly real | ban | "real, running code" → "running code". |
| not just asserted in prose; not merely declared | watch | Delete the negative clause. |
| ALL-CAPS emphasis: NOT, IS, SAME, AFTER, NEVER | watch | Lowercase. If the emphasis matters, restructure the sentence so the word lands at the end, or use one bold. Keep caps in RFC 2119 text, SQL, constants, and quoted log lines. |
| "isn't X — it's Y", "not X, but Y" | watch | State Y. Keep the contrast only when X is a misconception the audience actually holds. |

## Meta-narration

The text talks about itself instead of the subject.

| Phrase | Tier | Rewrite |
|--------|------|---------|
| worth noticing, worth noting, worth stating, worth spelling out, worth taking seriously, worth holding in mind | ban | Delete the frame and state the fact. "Design decision worth noticing: the push happens after the commit" → "The push happens after the commit". |
| the thing to land, the point to take away, the key point | ban | Delete. In speaker notes, use "Emphasize:" once, if at all. |
| the rest of this deck / book / tutorial uses … | ban | Delete, or name the section: "Section 03 uses both". |
| "the vocabulary the rest of this deck uses by name" | ban | Delete the clause. The list is the vocabulary. |
| this section covers, this slide walks through, the next chapter turns to | watch | One opening sentence per chapter may say what it covers. Slides and sections never do. |
| note that, notice how, keep in mind, as we saw | watch | Delete. "Note that X" → "X". |
| let's dive in, let's walk through, let's unpack | watch | Delete. Use imperative steps or a heading. |

## School and condescending framing

| Phrase | Tier | Rewrite |
|--------|------|---------|
| capstone [97] | ban | *full project example*, *reference build*, *end-to-end example*. Keep it in identifiers (`capstone.order.v1`, image file names) until the identifier itself is renamed. |
| homework, pop quiz, students, classroom, lesson plan | ban | *exercise*, *readers*, *attendees*, *participants*. |
| teaching cluster, learning project | watch | *local cluster*, *reference project*. |
| simply, obviously, of course, easy, easily, trivially, don't worry, magical, like magic | watch | Delete. If it is easy the reader will notice; if it is not, the word insults them. Keep *magic* only for a literal magic number or byte. |

## Generated-text tells and hype

These phrases mark prose as machine-written to an engineering audience.

| Phrase | Tier | Rewrite |
|--------|------|---------|
| load-bearing [40+] | ban | *required*, *critical*, *the part X depends on*. |
| earns its place / keep / complexity | ban | *is worth the cost when …*, or state the condition. |
| delve, tapestry, game-changing, supercharge, revolutionize, cutting-edge, best-in-class, blazing | ban | Delete or quantify. |
| seamless, unlock, elevate, empower, robust, powerful, leverage, journey, landscape, in the realm of | watch | *leverage* → *use*. *robust* → name the failure it survives. *landscape* is fine for a survey of options. |
| quietly, silently [200+] | watch | Correct for a machine ("the producer silently drops the record"). As prose drama ("quietly does the heavy lifting"), delete. |
| actually | watch | Delete in most sentences. Keep when it contrasts with a stated wrong belief. |
| very, really, truly, incredibly, crucially, notably, importantly | watch | Delete, or replace with the number. |
| three or more em dashes on one line | watch | Split into sentences. One em dash per sentence at most. |
| exclamation marks in prose | watch | Remove. |

## Wordiness and hedging

| Phrase | Tier | Rewrite |
|--------|------|---------|
| in order to; the fact that; at the end of the day; it should be noted | ban | *to*; *that*; delete; delete. |
| arguably, perhaps, somewhat, fairly, essentially, basically, sort of, kind of | watch | Commit or quantify. "Somewhat slower" → "12% slower". |

## Titles and environment leakage

| Pattern | Tier | Rewrite |
|---------|------|---------|
| Slide/heading title that is a file name: `"demo-grpc.sh — a typed contract, generated at build time"` | watch | Title: **gRPC typed contracts**. Subtitle: *Generated at build time*. Script name: 8pt reference footnote. |
| Parallel-number titles: "Nine capabilities, nine real services" (nouns of three letters or more, so unit lists such as "1 s, 2 s, 4 s" do not match) | watch | "Nine capabilities demonstrated". |
| Environment-specific nouns in prose: minikube, k3d, laptop | watch | *Kubernetes*, *a local cluster*, *a workstation*. Keep the literal name in commands, flags, file names, and where the environment itself is the subject ("minikube's tunnel"). |
| Tracking codes and plan paths: `DRQ-006`, `CAP-003`, `Phase C`, `_plans/`, "the roadmap" | watch | Remove from reader-facing text. State the decision itself. |

## Project-specific jargon

House metaphors that leak into prose belong in a project-local pattern file,
passed with `--patterns`:

```tsv
# .voice-patterns.tsv in the project root
ban	i	"reactor" as project metaphor	\b(the|this|a learning) reactor\b
```

The datamesh sweep replaced *reactor* (meaning "this project") with *project*
or *build* while keeping Maven's reactor and Vert.x's reactor, which are real
technical terms.

## Technical terms the scanner deliberately does not flag

- **magic byte / magic number / magic string**: wire-format and file-format terms. Only *magical*, *like magic*, and *as if by magic* are flagged.
- **realm**: an OIDC/Keycloak identity term. Only *in the realm of* is flagged.
- **Unit sequences** such as "1 s, 2 s, 4 s" or "100 ms, 200 ms": backoff and latency values, not parallel-number titles.
- **`# name.sh` in shell, Python, or YAML files**: a comment, not a heading. The filename-as-heading check runs on Markdown only.

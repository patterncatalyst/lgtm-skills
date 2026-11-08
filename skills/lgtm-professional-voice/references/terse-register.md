# Terse pattern register: before and after

Pairs from the `design-patterns-with-python` style study, 2026-11-08. Each
rewrite keeps every fact. The rules (T1 to T12) are in SKILL.md.

## Nominalisation (T2, T3)

> What the language did not remove is the decision to expose a sequence of
> items without exposing its storage. That decision is still the design, and a
> `TrackingHistory` that hides how events are fetched is still the right
> boundary. Only the classes are gone.

> Python removed the iterator classes, not the boundary. `TrackingHistory`
> still hands out a sequence and hides how it fetches the events.

## Thesis framing (T7, T11)

> A pattern catalogue is a record of decisions made with the tools on hand.
> Its authors say as much: the language you design in shapes the patterns you
> can state [...]. Read that way, the 1994 book is a snapshot of one set of
> assumptions, and the useful question about each entry is which assumption it
> depended on.

> The catalogue's authors say the language shapes which patterns you can
> state. So for each pattern, ask which 1994 language feature it relied on.

## Evidence inside the sentence (T8)

> It isn't wrong. `test_a_class_per_strategy_passes_the_same_table` runs it
> against the same behaviour table as
> `test_each_registered_rule_prices_the_behaviour_table`, and both pass for
> the flat, per-kilogram and zone rows. [...] The rules module has one,
> `ZoneRate`. The fixture has four.

> The class design works: it prices the flat, per-kilogram and zone rows of
> the same table. It declares more strategy classes: four in the fixture, one
> (`ZoneRate`) in the rules module.
>
> *Tests:* `test_a_class_per_strategy_passes_the_same_table`,
> `test_each_registered_rule_prices_the_behaviour_table`.

## Abstract subject (T2)

> Each is a decision, and both patterns survive because Python's syntax
> doesn't make those decisions for you.

> Both survive. Python's syntax doesn't choose the stage order, what the last
> stage returns, or who tracks the reports still owed.

## Comparison as prose (T6)

> The function wins on the forces in the one-carrier case [...]. A Protocol is
> the right participant when it holds state or offers several operations [...].
> A Visitor-like split fits many operations over a stable set of kinds [...].
> An interface with one implementation adds a name and no seam.

> | Situation | Shape |
> |---|---|
> | One carrier: one owner, one tariff schedule | One function |
> | The participant holds state or offers several operations | A `Protocol` |
> | Many operations over a stable set of kinds | A `match` over a closed union |
> | One implementation | No interface: it adds a name and no seam |
>
> Keep a class only when you can name the change it makes cheaper.

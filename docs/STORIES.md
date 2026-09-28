# The AI race and How AI benchmarks work

Two animated pages built on the How AI works engine ([HOW-AI-WORKS.md](HOW-AI-WORKS.md)): the same shell (`src/components/descent/Story.tsx`), one animation loop, pictures drawn from scroll progress and a looping clock, reduced-motion keyframes, a chapter rail and a pause control. Both draw their pictures from the site's own published data, prerendered inline, and state no figure the data does not support. Data files and method: [DATA.md](DATA.md) ("The AI race and How AI benchmarks work").

## The AI race (`/race`)

Every model on the Epoch Capabilities Index, placed by release date. Six chapters and one pause:

1. Every dot is a model: the field fills in over time, takes the six strongest makers' colours, and names the five highest scores (listed with links in the text).
2. The record changes hands: a line that steps up with each model that beat every earlier one, in its maker's colour, with how many records each maker set.
3. Each maker's climb: the six strongest makers' own records, and how close their best models finish.
4. Open weights close in: the best open-weights model and the best closed model to date, and how many months earlier a closed model first reached the best open score.
5. The price of a score: the cheapest model at or above an index level, by release date, on a log scale, and how many times cheaper it became. Prices are today's list prices at each release date, not launch prices.
6. Where the race stands: the eight highest scores with their confidence intervals, and how many reach into the leader's.

Every number in the words is worked out from `race.json` (`facts` in `shared/race.ts`), so the page stays true as the data refreshes. Maker colours always sit beside the maker's name in a key. Code: `src/pages/Race.tsx`, `src/components/race/` (`chart.ts` for time charts, `scenes.ts`, `chapters.tsx`).

## How AI benchmarks work (`/how-benchmarks-work`)

From one question to a ranking. Seven chapters and two pauses:

1. One question: a multiple-choice question, the model's probability for each letter, its answer, and the grade.
2. Hundreds of questions: GPQA Diamond's 198 questions answered by an illustrative model, its score against random guessing, and the best real result today.
3. How sure is a score?: other samples of questions give other scores; the standard error and 95% range; real GPQA Diamond results with Epoch AI's standard errors.
4. Four ways to grade: a letter, an exact number, a code fix that must pass a project's tests, and a person's vote.
5. Votes become ratings: pairwise votes, the Bradley–Terry ratings that explain them, and Arena's real text leaders with their 95% intervals.
6. When the test leaks: contamination, inflated scores and how tests stay fresh.
7. Many tests, one scale: why no one test ranks every model, a logistic scale joining tests of different difficulty, and the capability index leaders with their intervals.

The close lists five questions to ask of any ranking, with links to the leaderboard, the tests and the site's articles on reading benchmarks and on contamination.

### Content boundaries

- Written for the page and labelled: the example question and its probabilities, the illustrative model's 159 of 198 and its simulated reruns, the eight anonymous models and their ratings, the leaked and new question scores (92% and 71%), and the three tests and three models on the logistic scale.
- From sources: GPQA Diamond's 198 questions (Rein et al., 2023); error bars for evaluations (Miller, 2024); SWE-bench (Jimenez et al., 2023); pairwise votes and Bradley–Terry scores (Chiang et al., 2024); LiveBench's monthly new questions (White et al., 2024); the capability index combining more than 50 benchmarks, fitted jointly and anchored so Claude 3.5 Sonnet scores 130 and GPT-5 150 (Epoch AI). AIME answers are whole numbers from 0 to 999.
- Real results, with their published uncertainty: Epoch AI (CC BY 4.0) and Arena (CC BY 4.0).
- Arena's scores are not converted to win chances: the paper describes Bradley–Terry coefficients, not a fixed rating-to-probability rule, so the page says only that a larger gap means a more likely win.

Code: `src/pages/HowBenchmarksWork.tsx`, `src/components/scoring/` (`model.ts` for the illustrative figures and arithmetic, `scenes.ts`, `chapters.tsx`).

## Verification

- `tests/stories.test.ts`: the race's records, makers, open-weights gap, price records and facts; the benchmarks page's results, standard errors, illustrative answers and reruns, and the logistic scale.
- `tests/e2e/stories.spec.ts`: both pages draw every picture without errors and state what their data says; reduced-motion steps are still and reversible; axe finds no WCAG 2.1 AA violations and nothing overflows from 320 to 1440px; the menus lead to both pages; the prerendered HTML carries the canonical address, indexing, every chapter and the data.
- `tests/e2e/descent-layout.spec.ts`: on all three pages, at eight sizes from 360×640 to 1440×900 and between steps on a phone, no text drawn on a canvas overlaps other text, runs off its picture, straddles a box or hides under the controls, and no picture slips under the site header.

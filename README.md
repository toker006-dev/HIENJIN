# ຮຽນພາສາຈີນ · Hanyu Learning Web

Translate Lao sentences into Chinese, one word per blank (`你 吃饭 了 吗` = 4 blanks).

## Run

```sh
npm install
npm run dev
```

## Content pipeline

Sentences are generated ahead of time and shipped as static JSON (`src/data/sentences/hsk<level>.json`),
so the Gemini key never reaches the browser.

```sh
cp .env.example .env              # add GEMINI_API_KEY
npm run hsk:fetch                 # HSK 2.0 word lists -> data/hsk/1..6.json
npm run generate                  # 20 HSK1 sentences (resumes where it stopped)
npm run generate -- --level 2 --count 50
npm run generate -- --words 爱,吃 --force   # regenerate specific words
```

Each sentence is checked before it is saved: the target word must be its own blank, and every word must be
HSK vocabulary (or made only of HSK characters, e.g. 吃饭). The free Gemini tier has small daily limits
per model; when one runs out, set `GEMINI_MODEL` in `.env` to another model and re-run.

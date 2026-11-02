# Contributing

## Setup

Node.js 22 or later.

```sh
npm ci
npm test            # unit + integration tests
npm run verify      # everything CI runs: types, lint, format, coverage, build, package checks
```

`npm run bench` runs the micro-benchmarks in `test/bench/`.

## Code layout

| Folder          | Role                                                              |
| --------------- | ----------------------------------------------------------------- |
| `src/tokenizer` | splits the source into fields and detects macros                  |
| `src/parser`    | turns each field into an AST node, with per-dialect metadata      |
| `src/validator` | rules shared by the parser, plus the Quartz `?` rule              |
| `src/ast`       | AST types and field matching shared by the iterator and describer |
| `src/iterator`  | `nextOccurrences`, timezone and DST handling                      |
| `src/describer` | `describe`, locale registry and the JSON locale files             |
| `src/builder`   | `build` / `buildResult`                                           |
| `shared-tests`  | language-independent test cases (see below)                       |

## Shared test cases

`shared-tests/cases.json` describes the expected behaviour (validity, descriptions, run
times) independently of the language, so that ports to other languages can run the same
cases. When a change alters behaviour, update the cases in the same pull request. Compute new
expected values by hand rather than copying the library's output.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/); a git
hook checks them. The type drives the next version number:

- `fix:` → patch release
- `feat:` → minor release
- `feat!:` or a `BREAKING CHANGE:` footer → major release
- `docs:`, `test:`, `refactor:`, `chore:`, `ci:` → no release on their own

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please):

1. Each push to `main` updates an open "release" pull request with the next version number
   and the changelog.
2. Merging that pull request tags the version, creates the GitHub release and publishes the
   package to npm from the `Release` workflow.

Publishing uses npm trusted publishing (OIDC), so no npm token is stored in the repository.

### One-time setup

npm can only trust a workflow for a package that already exists, so the very first version is
published by hand:

1. `npm login`, then `npm run verify && npm publish --access public`.
2. Tag that commit `v1.0.0` and push the tag.
3. On npmjs.com, open the package settings → Trusted publishing → add GitHub Actions with
   repository `axizof/cronforge`, workflow `release.yml` and environment `npm`. Allow direct
   `npm publish`.
4. In the GitHub repository settings, create an environment named `npm` (optionally with
   required reviewers to approve each publication).

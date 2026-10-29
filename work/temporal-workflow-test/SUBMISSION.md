# Bounty submission: temporal-workflow-test

- Source: https://github.com/oll4com/spaceapp/issues/60
- Repo: oll4com/spaceapp  Issue: #60
- Title: [$400] Test every Temporal workflow on a real time-skipping test server and gate replay determinism in CI
- State: open

## Task (verbatim)

## Context

SpaceApp runs its long-lived orchestration on Temporal (`apps/worker`): Room Agent supervision, chat turns, Dot goals and memory maintenance. These workflows use signals, `condition()` timeouts, `continueAsNew`, child workflows and `patched()` branches. Their tests mock `@temporalio/workflow` (for example `apps/worker/tests/room-supervisor-continuation.test.ts`), so the real workflow sandbox, timers, signal ordering and continue-as-new are never exercised. Nothing checks replay determinism automatically either: a workflow change that breaks running executions would first show up in a user's installation.

This is finding **CORE-006** in [`docs/quality/KNOWN_LIMITATIONS.md`](https://github.com/oll4com/spaceapp/blob/main/docs/quality/KNOWN_LIMITATIONS.md): "No TestWorkflowEnvironment or time-skipping tests" and "The check is manual; it is not wired into deploy or CI".

Workflows in scope (all in `apps/worker/src`):

- `workflows.ts`: `dotGoalWorkflow`, `dummyTurnWorkflow`, `codexAppServerTurnWorkflow`, `roomAgentSupervisorWorkflow` (both the current branch and the pre-patch branch behind `patched("room-background-continuation-v1")`), `roomAgentActionWorkflow`
- `memory-maintenance-workflows.ts`: `memoryMaintenanceWorkflow`, `memoryConsolidationWorkflow`
- `memory-mutation-workflows.ts`: `memoryMutationWorkflow`

## Goal

Run every workflow in the real Temporal workflow sandbox on `@temporalio/testing`'s time-skipping environment with stubbed activities, and fail CI when a workflow change is not replay-compatible with recorded histories.

## Acceptance criteria

- [ ] `@temporalio/testing` is a devDependency of `apps/worker`, pinned to the same version as the other `@temporalio/*` packages (1.24.0 today), with `package-lock.json` updated in the same commit.
- [ ] Each of the 8 workflows above has tests that run in a `TestWorkflowEnvironment.createTimeSkipping()` worker with the real workflow code (`workflowsPath`) and stub activities. No network, database, Docker or AI provider is needed.
- [ ] The tests cover at least:
  - `dotGoalWorkflow`: wake signal vs. timeout, and continue-as-new while the goal is unfinished;
  - `roomAgentSupervisorWorkflow`: enqueue and stop signals, the 1-second polling `condition()` loops, interrupting a running mission, continue-as-new after 50 processed items or 250 polls with the carried state intact, for both the current and the pre-patch branch;
  - `roomAgentActionWorkflow`: the `room-background-action-failure-v1` failure path;
  - `memoryMaintenanceWorkflow`: it continues when the all-months refresh or session reconciliation fails, and it runs `memoryConsolidationWorkflow` as a child;
  - activity failures and retries for the turn and memory workflows.
- [ ] Everything asserted in `room-supervisor-continuation.test.ts` is also covered by a real-sandbox test. The mocked test may stay, but it is no longer the only coverage.
- [ ] Replay gate: a script (for example `npm run temporal:record-histories -w @space/worker`) records histories from the test runs into `apps/worker/tests/fixtures/workflow-histories/` (JSON, synthetic data only). It records at least one per workflow and one that takes the pre-patch supervisor branch. A test replays all of them with `Worker.runReplayHistories` against the current workflow code.
- [ ] A negative test proves the gate works: a test-only workflow variant with an extra timer or activity fails replay with `DeterminismViolationError`.
- [ ] The tests run in `npm test -w @space/worker`, so `npm run test:public` and the public CI run them too. They add less than 3 minutes on GitHub's `ubuntu-latest` runner.
- [ ] Workflow behavior does not change. If the tests find a real bug, describe it in the PR. Any fix to workflow code must be replay-safe (`patched()`) and come with its own history fixture.
- [ ] A short section in `CONTRIBUTING.md` (or a README in `apps/worker/tests/fixtures/workflow-histories/`) explains how to re-record histories. It also says when re-recording is allowed: only together with a `patched()` change, never to make a failing replay pass.

## How to test

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci
npm run check
npm test -w @space/worker
```

To see the gate fail, add `await sleep("1 second")` at the start of `dotGoalWorkflow` and run the tests again. The replay test must fail with a determinism error that names the workflow and the history file.

## Out of scope

- Killing worker or server processes against a real Temporal server (`apps/worker/tests/support/disposable-temporal.ts` covers that separately).
- Changes to workflow logic, timeouts, retry policies or the Temporal server version.
- Activity implementations. They stay stubbed here and keep their own unit tests.

## Pointers

- `apps/worker/src/workflows.ts`, `apps/worker/src/memory-maintenance-workflows.ts`, `apps/worker/src/memory-mutation-workflows.ts`
- `apps/worker/src/worker.ts` (how the real worker registers workflows, activities and interceptors)
- `apps/worker/tests/room-supervisor-continuation.test.ts`, `apps/worker/tests/room-continuation-fixture.ts` (the current mocked approach)
- `docs/quality/KNOWN_LIMITATIONS.md` (CORE-006), `docs/quality/failure-matrix.md`
- Temporal TypeScript SDK docs: "Testing" (time-skipping `TestWorkflowEnvironment`) and "Replay" (`Worker.runReplayHistories`)
- Before opening a PR, run the checks in [CONTRIBUTING.md](https://github.com/oll4com/spaceapp/blob/main/CONTRIBUTING.md#checks-before-a-commit).


---

## 💎 Bounty: $400 USD

This issue carries a cash bounty of **$400 USD**, paid by the SpaceApp maintainers.

**How it works**
1. Comment on this issue that you are working on it (optional, but it helps avoid duplicate work).
2. Open a pull request that closes this issue and meets every acceptance criterion above, with tests.
3. The bounty goes to the author of the first pull request that is merged as the solution. If several PRs arrive, we review them in the order they were opened.
4. We pay within 7 days of the merge, by PayPal, Wise or bank transfer; we agree the method with you in this issue.

**Terms**
- One bounty per issue; the amount is never lowered once posted.
- AI-assisted work is welcome when you have reviewed and tested it yourself. Untested or generated-only PRs are closed without review.
- Contributions are accepted under the repository's license (see [LICENSE](https://github.com/oll4com/spaceapp/blob/main/LICENSE)).
- The "Verify export provenance" CI step fails on outside pull requests by design (this repository is exported from the maintainers' source); reviewers ignore that step. Every other check must pass.
- You are responsible for any taxes on the payment. We cannot pay where sanctions forbid it.

If SpaceApp is useful to you, a ⭐ on the repository helps the project grow. It is not required for the bounty.



## Acceptance criteria

- [ ] Reproduces the stated problem
- [ ] Patch implements the requested behavior
- [ ] Tests added/updated and passing locally
- [ ] No unrelated changes

## Deliverable

Patch file: `./change.patch`  (git diff of the fix)

## Submit

Once a GitHub credential is available:
```
gh pr create --repo oll4com/spaceapp --title "fix #60: temporal-workflow-test" --body-file SUBMISSION.md
```
(Also comment `/claim` on the bounty listing first to lock it, if the platform requires it.)
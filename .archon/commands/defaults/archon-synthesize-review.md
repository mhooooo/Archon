---
description: Synthesize all review agent findings into consolidated report and post to GitHub
argument-hint: (none - reads from review artifacts)
---

# Synthesize Review

---

## Your Mission

Read all parallel review agent artifacts, synthesize findings into a consolidated report, create a master artifact, and post a comprehensive review comment to the GitHub PR.

**Output artifact**: `$ARTIFACTS_DIR/review/consolidated-review.md`
**GitHub action**: Post PR comment with full review

---

## Phase 1: LOAD - Gather All Findings

### 1.1 Get PR Number from Registry

```bash
PR_NUMBER=$(cat $ARTIFACTS_DIR/.pr-number)
```

### 1.2 Read Scope

```bash
cat $ARTIFACTS_DIR/review/scope.md
```

### 1.3 Read Visual-Audit Scope

```bash
cat $ARTIFACTS_DIR/review/visual-audit-scope.json 2>/dev/null || echo "No visual-audit scope artifact."
```

If `needs_visual_audit` is `"true"`, the consolidated review and PR comment must include `Visual audit:` evidence lines copied from code review, or must preserve the HIGH missing-evidence finding. This is a workflow-level merge-safety signal, separate from reviewer fanout size.

### 1.4 Read All Agent Artifacts

```bash
# Read each agent's findings
cat $ARTIFACTS_DIR/review/code-review-findings.md
cat $ARTIFACTS_DIR/review/error-handling-findings.md
cat $ARTIFACTS_DIR/review/test-coverage-findings.md
cat $ARTIFACTS_DIR/review/comment-quality-findings.md
cat $ARTIFACTS_DIR/review/docs-impact-findings.md
```

When `code-review-findings.md` contains a `## Visual Audit Evidence` section,
preserve its `Visual audit:` lines exactly in the consolidated review and PR
comment. These lines are machine-consumed by downstream harness gates to prove
UI PRs had screenshot/Playwright evidence. If the section says evidence was not
captured and `visual-audit-scope.json` says visual evidence is required, keep
the corresponding HIGH finding visible.

**PHASE_1_CHECKPOINT:**
- [ ] PR number identified
- [ ] Visual-audit scope checked
- [ ] Available agent artifacts read
- [ ] Findings extracted from each
- [ ] Visual audit evidence lines preserved when present

---

## Phase 2: SYNTHESIZE - Combine Findings

### 2.1 Aggregate by Severity

Combine all findings across agents:
- **CRITICAL**: Must fix before merge
- **HIGH**: Should fix before merge
- **MEDIUM**: Consider fixing (options provided)
- **LOW**: Nice to have (defer or create issue)

### 2.2 Deduplicate

Check for overlapping findings:
- Same issue reported by multiple agents
- Related issues that should be grouped
- Conflicting recommendations (resolve)

### 2.3 Prioritize

Rank findings by:
1. Severity (CRITICAL > HIGH > MEDIUM > LOW)
2. User impact
3. Ease of fix
4. Risk if not fixed

### 2.4 Compile Statistics

```
Total findings: {n}
- CRITICAL: {n}
- HIGH: {n}
- MEDIUM: {n}
- LOW: {n}

By agent:
- code-review: {n} findings
- error-handling: {n} findings
- test-coverage: {n} findings
- comment-quality: {n} findings
- docs-impact: {n} findings
```

**PHASE_2_CHECKPOINT:**
- [ ] Findings aggregated by severity
- [ ] Duplicates removed
- [ ] Priority order established
- [ ] Statistics compiled

---

## Phase 3: GENERATE - Create Consolidated Artifact

Write to `$ARTIFACTS_DIR/review/consolidated-review.md`:

```markdown
# Consolidated Review: PR #{number}

**Date**: {ISO timestamp}
**Agents**: code-review, error-handling, test-coverage, comment-quality, docs-impact
**Total Findings**: {count}

---

## Executive Summary

{3-5 sentence overview of PR quality and main concerns}

**Overall Verdict**: {APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION}

**Auto-fix Candidates**: {n} CRITICAL + HIGH issues can be auto-fixed
**Manual Review Needed**: {n} MEDIUM + LOW issues require decision

---

## Statistics

| Agent | CRITICAL | HIGH | MEDIUM | LOW | Total |
|-------|----------|------|--------|-----|-------|
| Code Review | {n} | {n} | {n} | {n} | {n} |
| Error Handling | {n} | {n} | {n} | {n} | {n} |
| Test Coverage | {n} | {n} | {n} | {n} | {n} |
| Comment Quality | {n} | {n} | {n} | {n} | {n} |
| Docs Impact | {n} | {n} | {n} | {n} | {n} |
| **Total** | **{n}** | **{n}** | **{n}** | **{n}** | **{n}** |

---

## CRITICAL Issues (Must Fix)

### Issue 1: {Title}

**Source Agent**: {agent-name}
**Location**: `{file}:{line}`
**Category**: {category}

**Problem**:
{description}

**Recommended Fix**:
```typescript
{fix code}
```

**Why Critical**:
{impact explanation}

---

### Issue 2: {Title}

{Same structure...}

---

## HIGH Issues (Should Fix)

### Issue 1: {Title}

{Same structure as CRITICAL...}

---

## MEDIUM Issues (Options for User)

### Issue 1: {Title}

**Source Agent**: {agent-name}
**Location**: `{file}:{line}`

**Problem**:
{description}

**Options**:

| Option | Approach | Effort | Risk if Skipped |
|--------|----------|--------|-----------------|
| Fix Now | {approach} | {LOW/MED/HIGH} | {risk} |
| Create Issue | Defer to separate PR | LOW | {risk} |
| Skip | Accept as-is | NONE | {risk} |

**Recommendation**: {which option and why}

---

## LOW Issues (For Consideration)

| Issue | Location | Agent | Suggestion |
|-------|----------|-------|------------|
| {title} | `file:line` | {agent} | {brief recommendation} |
| ... | ... | ... | ... |

---

## Positive Observations

{Aggregated good things from all agents:
- Well-structured code
- Good error handling in X
- Comprehensive tests for Y
- Clear documentation}

---

## Visual Audit Evidence

{If visual-audit-scope.json has `needs_visual_audit: "true"`, copy all `Visual audit:` lines from code-review-findings.md. Each line must include command + screenshot/trace/artifact evidence. If missing, state `No visual audit evidence captured` and ensure the HIGH missing-evidence finding remains in the report. If visual evidence is not required, state `Not required by visual-audit-scope.json`.}

---

## Suggested Follow-up Issues

If not addressing in this PR, create issues for:

| Issue Title | Priority | Related Finding |
|-------------|----------|-----------------|
| "{suggested issue title}" | {P1/P2/P3} | MEDIUM issue #{n} |
| ... | ... | ... |

---

## Next Steps

1. **Auto-fix step** will address {n} CRITICAL + HIGH issues
2. **Review** the MEDIUM issues and decide: fix now, create issue, or skip
3. **Consider** LOW issues for future improvements

---

## Agent Artifacts

| Agent | Artifact | Findings |
|-------|----------|----------|
| Code Review | `code-review-findings.md` | {n} |
| Error Handling | `error-handling-findings.md` | {n} |
| Test Coverage | `test-coverage-findings.md` | {n} |
| Comment Quality | `comment-quality-findings.md` | {n} |
| Docs Impact | `docs-impact-findings.md` | {n} |

---

## Metadata

- **Synthesized**: {ISO timestamp}
- **Artifact**: `$ARTIFACTS_DIR/review/consolidated-review.md`
```

**PHASE_3_CHECKPOINT:**
- [ ] Consolidated artifact created
- [ ] All findings included
- [ ] Severity ordering correct
- [ ] Options provided for MEDIUM/LOW

---

## Phase 4: POST - GitHub PR Comment

### 4.1 Format for GitHub

Create a GitHub-friendly version of the review:

```bash
gh pr comment {number} --body "$(cat <<'EOF'
# 🔍 Comprehensive PR Review

**PR**: #{number}
**Reviewed by**: 5 specialized agents
**Date**: {date}

---

## Summary

{executive summary}

**Verdict**: `{APPROVE | REQUEST_CHANGES}`

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | {n} |
| 🟠 HIGH | {n} |
| 🟡 MEDIUM | {n} |
| 🟢 LOW | {n} |

---

## 🔴 Critical Issues (Auto-fixing)

{For each CRITICAL issue:}

### {Title}
📍 `{file}:{line}`

{Brief description}

<details>
<summary>View fix</summary>

```typescript
{fix code}
```

</details>

---

## 🟠 High Issues (Auto-fixing)

{Same format as CRITICAL}

---

## 🟡 Medium Issues (Needs Decision)

{For each MEDIUM issue:}

### {Title}
📍 `{file}:{line}`

{Brief description}

**Options**: Fix now | Create issue | Skip

<details>
<summary>View details</summary>

{full details and options table}

</details>

---

## 🟢 Low Issues

<details>
<summary>View {n} low-priority suggestions</summary>

| Issue | Location | Suggestion |
|-------|----------|------------|
| {title} | `file:line` | {suggestion} |

</details>

---

## ✅ What's Good

{Positive observations}

---

## Visual Audit Evidence

{If visual-audit-scope.json has `needs_visual_audit: "true"`, include copied `Visual audit:` lines with command + screenshot/trace/artifact evidence. If missing, say `No visual audit evidence captured`; the HIGH missing-evidence finding above must remain visible. If not required, state `Not required by visual-audit-scope.json`.}

---

## 📋 Suggested Follow-up Issues

{If any MEDIUM/LOW issues should become issues}

---

## Next Steps

1. ⚡ Auto-fix step will address CRITICAL + HIGH issues
2. 📝 Review MEDIUM issues above
3. 🎯 Merge when ready

---

*Reviewed by Archon comprehensive-pr-review workflow*
*Artifacts: `$ARTIFACTS_DIR/review/`*
EOF
)"
```

**PHASE_4_CHECKPOINT:**
- [ ] GitHub comment posted
- [ ] Formatting renders correctly
- [ ] All severity levels included

---

## Phase 5: OUTPUT - Confirmation

Output only a brief confirmation (this will be posted as a comment):

```
✅ Review synthesis complete. Proceeding to auto-fix step...
```

---

## Success Criteria

- **ALL_ARTIFACTS_READ**: All 5 agent findings loaded
- **FINDINGS_SYNTHESIZED**: Combined, deduplicated, prioritized
- **CONSOLIDATED_CREATED**: Master artifact written
- **GITHUB_POSTED**: PR comment visible
- **VISUAL_AUDIT_PRESERVED**: UI visual evidence lines are present in the PR comment or missing evidence remains a HIGH finding

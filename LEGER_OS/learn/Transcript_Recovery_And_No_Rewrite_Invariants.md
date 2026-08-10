# Transcript Recovery & No Mid-Session Rewrite Invariants

Created: 2026-08-10
Tags: #invariant #recovery #workflow

---

## Rule: Transcript Recovery

When a file is reported lost or reverted to a wrong state:

1. Read `transcript_full.jsonl` from the relevant subagent or conversation log
2. Find the `write_to_file` step that wrote the correct version using Python grep
3. Extract `CodeContent` from that step's tool_calls args
4. Write it directly to the file path

**NEVER use:**
- `git stash` / `git stash pop` (destroys unsaved working state)
- `git checkout <file>` (reverts to last commit, losing session edits)
- Rewriting from memory or transcript diffs

## Rule: No Mid-Session Whole-File Rewrite

During an active editing session where incremental edits have been made:

- NEVER replace the entire file from a transcript step or backup
- ALWAYS apply surgical `replace_file_content` / `multi_replace_file_content` to the live file
- Exception: very first recovery of a completely wrong/missing file at session start

## Why This Matters

Session edits are NOT committed to git until explicitly done. Any whole-file replacement from a transcript step will silently discard all uncommitted session work. This caused significant user frustration in the 2026-08-10 session.

## Recovery Script Template

```python
import json

log = r'C:\Users\Quinha\.gemini\antigravity-cli\brain\<conv-id>\.system_generated\logs\transcript_full.jsonl'
TARGET_STEP = 201  # step index of correct write_to_file

with open(log, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('step_index') == TARGET_STEP:
            for c in data.get('tool_calls', []):
                if c.get('name') == 'write_to_file':
                    code = c['args']['CodeContent']
                    with open(r'path\to\file.tsx', 'w', encoding='utf-8') as out:
                        out.write(code)
```

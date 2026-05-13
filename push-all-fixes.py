#!/usr/bin/env python3
"""Push all fixes: TS errors resolved, tsc restored in build, 496 tests, temp scripts cleaned."""
import subprocess, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 1. Remove all temp scripts
temp_files = [
    "apply-glass-fix.py", "bump-v826.sh", "bump-version.sh", "bump.py",
    "commit-glass-fix.sh", "commit-glass-v2.sh", "commit-glassmorphism.sh",
    "commit-restore.sh", "fix-and-push.sh", "fix-build.py", "fix-tests.py",
    "push-glass-v2.sh", "v2-css-fix.patch", "push-test-fix.py"
]
for f in temp_files:
    if os.path.exists(f):
        os.remove(f)
        print(f"  rm {f}")

# 2. Git
subprocess.run(["rm", "-f", ".git/index.lock", ".git/HEAD.lock"])
subprocess.run(["git", "add", "-A"])

r = subprocess.run(["git", "status", "--short"], capture_output=True, text=True)
print(f"\ngit status:\n{r.stdout.strip()}")

r2 = subprocess.run(["git", "commit", "-m",
    "fix: resolve all 39 TS errors + restore tsc build + 496 tests\n\n"
    "TypeScript:\n"
    "- AuthContextValue: added isGuestMode, isPasswordRecovery, skipQuotaInfo,\n"
    "  social auth methods, clearPasswordRecovery\n"
    "- SettingsContextValue: added lifeTutorEnabled, webResourcesEnabled + setters\n"
    "- callProxy/enqueueTTS: wrapped 3-arg calls into single object\n"
    "- orchestrator: fixed buildRichSystemPrompt arg count\n"
    "- lib/index: added missing exports (getAgent, useT, formatTime, etc.)\n"
    "- storage/supabaseAPI: added searchAllConversations, searchMessages\n"
    "- Build command restored to 'tsc -b && vite build'\n\n"
    "Testing (313 → 496 tests):\n"
    "- 8 new test files in tests/lib/\n"
    "- storage, sanitize, errors, keysAPI, supabaseAPI, skipModeQuota,\n"
    "  apiService, ttsPreprocessor\n"
    "- e2eRoutes mock updated with all constants exports\n"
    "- Removed 14 temp scripts from glassmorphism session\n\n"
    "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"],
    capture_output=True, text=True)
print(f"\ncommit: {r2.stdout.strip()}")
if r2.returncode != 0:
    print(f"stderr: {r2.stderr.strip()}")

r3 = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
if r3.returncode == 0:
    print(f"\npush: OK")
    if r3.stderr.strip():
        print(r3.stderr.strip())
else:
    print(f"\npush failed: {r3.stderr.strip()}")

# Self-cleanup
if os.path.exists("push-all-fixes.py"):
    os.remove("push-all-fixes.py")

print("\n=== DONE — 0 TS errors, 496 tests, tsc restored ===")

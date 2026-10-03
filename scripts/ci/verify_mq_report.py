"""Require real, non-skipped UI evidence for retained original MQ intent."""

import json
import sys
from pathlib import Path

report = json.loads(Path(sys.argv[1]).read_text())
cases = [case for suite in report.get("testResults", []) for case in suite.get("assertionResults", [])]
required = {
    "persists start identity and intent before POST; 202 cannot clear it",
    "persists cancel identity and intent before POST; 202 cannot clear it",
    "retains timed out start across refresh even when a later run is visible",
    "retains timed out cancel across refresh even when a later run is visible",
    "distinguishes durable held from acceptance and preserves the frozen run",
    "distinguishes durable rejected from acceptance and preserves the frozen run",
    "keeps accepted command pending when wrong-resource cannot be reconciled",
    "keeps accepted command pending when unsafe-version cannot be reconciled",
    "keeps accepted command pending when wrong-frozen-config cannot be reconciled",
    "cannot confirm cancellation with the receipt of a different intent",
    "ignores a decision arriving after unmount and recovers by reading the same operation",
    "keeps the 202 intent until the original durable operation confirms it",
    "keeps a technically held operation across refresh without another write",
    "clears intent only for the matching persisted rejection",
    "stops at 60 seconds, bounds backoff and retains an undecided identity",
}
if (
    not report.get("success")
    or not cases
    or report.get("numPendingTests", 0)
    or report.get("numFailedTests", 0)
    or report.get("numRuntimeErrorTestSuites", 0)
    or any(case.get("status") != "passed" for case in cases)
    or not required.issubset({case.get("title") for case in cases})
):
    raise SystemExit("Required MQ UI report is empty, incomplete, failed or skipped")
print(json.dumps({"passed": len(cases), "failed": 0, "skipped": 0}))

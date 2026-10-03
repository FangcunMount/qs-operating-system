"""Loopback-only browser fixture; no production IAM/QS/model connections.

Exercises the real application and HTTP adapters, with labelled synthetic reads.
This is UI evidence, never service authorization or production business evidence.
"""

import argparse
import base64
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

RUN = "44444444-4444-4444-8444-444444444444"
KEYS = ["suite", "prompt", "profile", "input_schema", "output_schema", "generation_route",
        "semantic_prompt", "semantic_output_schema", "semantic_route", "execution_policy", "gate_policy"]
RELEASE = {key: {"id": key, "version": "v1", "fingerprint": "sha256:" + "a" * 64} for key in KEYS}


def state():
    return {
        "run_id": RUN, "status": "requested", "version": 1,
        "unresolved_result_unknown_count": 0, "resolutions": [], "reviews": [],
        "review_reopenings": [], "creation": {
            "schema_version": "qs-ai-evaluation-creation-receipt/v1", "run_id": RUN,
            "release": RELEASE, "release_fingerprint": "sha256:" + "b" * 64,
            "requested_by": "user:42", "request_reason": "隔离浏览器验收",
            "created_at": "2026-10-03T00:00:00+08:00",
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=59071)
    parser.add_argument("--evidence", required=True)
    parser.add_argument("--mode-file", required=True)
    args = parser.parse_args()
    target = Path(args.evidence)
    target.parent.mkdir(parents=True, exist_ok=True)
    mode_path = Path(args.mode_file)
    requests = []
    original = {}
    refreshed = False

    def tokens():
        encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
        token = ".".join((encode({"alg": "none"}), encode({"sub": "42", "user_id": "42", "iat": int(time.time()), "exp": int(time.time()) + 3600}), "fixture"))
        return {"access_token": token, "refresh_token": "fixture-refresh", "token_type": "Bearer", "expires_in": 3600}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, data, status=200):
            raw = json.dumps({"code": 0, "message": "isolated browser fixture", "data": data}).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def record(self, command=None):
            requests.append({"method": self.command, "path": urlparse(self.path).path,
                             "command_id": command, "time": time.time()})
            target.write_text(json.dumps({"level": "browser fixture only", "requests": requests,
                                          "original_command": original}, indent=2))

        def do_POST(self):
            nonlocal refreshed
            path = urlparse(self.path).path
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
            if path == "/api/v3/authn/login":
                if data.get("method_payload") != {"username": "mq-browser", "password": "disposable"}:
                    return self.reply({}, 403)
                self.record()
                return self.reply(tokens())
            if path == "/api/v3/authn/refresh_token":
                self.record()
                if data.get("refresh_token") != "fixture-refresh":
                    return self.reply({}, 403)
                refreshed = True
                return self.reply(tokens())
            if path == f"/internal/v2/interpretation/ai-workflow/evaluations/{RUN}/start":
                command = data.get("command_id")
                self.record(command)
                if original:
                    return self.reply({"error": "unexpected second write"}, 409)
                original.update(data)
                if mode_path.exists() and mode_path.read_text().strip() == "disconnect":
                    self.close_connection = True  # committed but response lost
                    return
                return self.reply({"operation_id": command, "command_id": command, "status": "submitted", "status_url": f"/internal/v2/interpretation/ai-workflow/operations/{command}"}, 202)
            self.record()
            self.reply({"error": "fixture write not allowed"}, 404)

        def do_GET(self):
            path = urlparse(self.path).path
            self.record()
            if path == "/api/v2/identity/me":
                return self.reply({"id": "42", "nickname": "隔离 MQ 浏览器验收", "status": "active", "contacts": [], "roles": ["qs:admin"], "permissions": []})
            base = "/internal/v2/interpretation/ai-workflow"
            if path == base + "/solutions":
                return self.reply({"items": [], "templates": [], "next_cursor": ""})
            if path == base + "/solutions/models":
                return self.reply({"models": [], "provider": "fixture", "credential_configured": False, "endpoint_configured": False, "max_output_tokens": {"min": 1, "max": 2}, "timeout_milliseconds": {"min": 1, "max": 2}, "reasoning_efforts": [], "unsupported_fields": []})
            if path == base + f"/evaluations/{RUN}":
                return self.reply(state())
            if path.startswith(base + "/operations/"):
                command = path.rsplit("/", 1)[1]
                if command != original.get("command_id"):
                    return self.reply({}, 404)
                mode = mode_path.read_text().strip() if mode_path.exists() else "held"
                if mode == "refresh" and not refreshed:
                    return self.reply({}, 401)
                operation = {"operation_id": command, "command_id": command, "resource_id": RUN,
                             "status": "submitted", "transport_status": "held" if mode == "held" else "awaiting_receipt"}
                if mode == "rejected":
                    operation.update(status="rejected", transport_status="confirmed", decision="rejected", code="evaluation_capacity_exceeded", receipt={"command_id": command, "command_body_sha256": "c" * 64, "decision": "REJECTED"})
                return self.reply(operation)
            self.reply({"error": "unconfigured fixture read"}, 404)

    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()

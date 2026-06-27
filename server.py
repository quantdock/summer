#!/usr/bin/env python3
"""静态页面 + 日程 JSON 读写 API"""
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCHEDULE_FILE = ROOT / "schedule-data.json"
PORT = int(os.environ.get("PORT", "8765"))


class ScheduleHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/schedule":
            self._read_schedule()
            return
        super().do_GET()

    def do_PUT(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/schedule":
            self._write_schedule()
            return
        self.send_error(404, "Not Found")

    def _read_schedule(self):
        if not SCHEDULE_FILE.is_file():
            self.send_error(404, "schedule-data.json not found")
            return
        data = SCHEDULE_FILE.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(data)

    def _write_schedule(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body.decode("utf-8"))
            if not isinstance(data, dict) or "activities" not in data:
                raise ValueError("invalid schedule format")
            if not isinstance(data["activities"], list):
                raise ValueError("activities must be an array")
            SCHEDULE_FILE.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        except (json.JSONDecodeError, ValueError) as exc:
            self.send_error(400, str(exc))
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, format, *args):
        if args and isinstance(args[0], str) and args[0].startswith("GET /api"):
            return
        super().log_message(format, *args)


def main():
    os.chdir(ROOT)
    server = HTTPServer(("0.0.0.0", PORT), ScheduleHandler)
    print(f"暑假日程服务: http://localhost:{PORT}")
    print(f"数据文件: {SCHEDULE_FILE}")
    server.serve_forever()


if __name__ == "__main__":
    main()

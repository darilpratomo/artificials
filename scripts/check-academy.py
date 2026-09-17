"""Execute the original standard-library examples and exercise the local API project."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from http.server import HTTPServer

root = Path(__file__).resolve().parents[1]
lessons = sorted((root / 'src/content/academy/lessons').glob('*.json'))
assert len(lessons) == 36
with tempfile.TemporaryDirectory(prefix='artificials-academy-') as directory:
    scratch = Path(directory)
    for path in lessons:
        lesson = json.loads(path.read_text())
        code_path = scratch / lesson['code']['filename']
        code_path.write_text(lesson['code']['source'])
        result = subprocess.run([sys.executable, '-I', str(code_path)], cwd=scratch,
                                capture_output=True, text=True, timeout=15)
        if result.returncode:
            raise AssertionError(f"{path.stem}: {result.stderr}")
        assert result.stdout.strip(), f'{path.stem}: no observable result'
    print(f'All {len(lessons)} Python examples ran successfully.')
    project = scratch / 'project-local-ai-api-and-database.py'
    spec = importlib.util.spec_from_file_location('academy_api', project)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    os.chdir(scratch)
    server = HTTPServer(('127.0.0.1', 0), module.Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_port}/predict'
    def request(payload, content_type='application/json', endpoint=url):
        body = json.dumps(payload).encode()
        req = urllib.request.Request(endpoint, data=body, headers={'Content-Type': content_type})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)
    try:
        status, response = request({'text': 'reset password'})
        assert status == 200 and response['label'] == 'account'
        assert request({'text': ''})[0] == 400
        assert request({'text': 'x', 'admin': True})[0] == 400
        assert request({'text': 'x'}, 'text/plain')[0] == 415
        assert request({'text': 'x' * 5000})[0] == 413
        assert request({'text': 'x'}, endpoint=url + '/missing')[0] == 404
        with sqlite3.connect(scratch / 'academy_predictions.sqlite3') as database:
            assert database.execute('SELECT COUNT(*) FROM predictions').fetchone()[0] == 1
        print('Local API: valid inference persisted; invalid requests rejected without database writes.')
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

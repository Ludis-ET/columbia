from contextlib import nullcontext
import ftplib
import json
from pathlib import Path
import tempfile
import unittest
from deploy_cpanel import deploy


class FakeFTP:
    def __init__(self):
        self.files = {}
        self.directories = {"."}
        self.events = []
        self.fail_upload = None
        self.fail_activation = False

    def retrbinary(self, command, callback):
        name = command.removeprefix("RETR ")
        if name not in self.files:
            raise ftplib.error_perm("550 Not found")
        callback(self.files[name])

    def storbinary(self, command, stream):
        name = command.removeprefix("STOR ")
        if self.fail_upload and name.endswith(self.fail_upload):
            raise ConnectionError("Upload interrupted")
        self.files[name] = stream.read()
        self.events.append(("upload", name))

    def rename(self, source, destination):
        if self.fail_activation and destination == "active-release.json":
            raise ftplib.error_perm("550 Rename denied")
        self.files[destination] = self.files.pop(source)
        self.events.append(("rename", destination))

    def mkd(self, name):
        if name in self.directories:
            raise ftplib.error_perm("550 Exists")
        self.directories.add(name)

    def pwd(self):
        return "."

    def cwd(self, name):
        if name not in self.directories:
            raise ftplib.error_perm("550 Missing directory")


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="columbia-ftp-test-")
        self.addCleanup(self.temporary.cleanup)
        self.bundle = Path(self.temporary.name)
        self.release = {"id": "new-release", "commit": "a" * 40, "buildId": "new-build"}
        self.old = {"id": "old-release", "commit": "b" * 40, "buildId": "old-build"}
        self.pointer = json.dumps(self.release).encode()
        (self.bundle / "active-release.json").write_bytes(self.pointer)
        directory = self.bundle / "releases" / self.release["id"] / ".next"
        directory.mkdir(parents=True)
        (directory / "prerender-manifest.json").write_text('{"preview":{}}')
        (directory / "BUILD_ID").write_text("new-build")
        for filename in ("server.js", "cpanel.cjs"):
            (self.bundle / filename).write_text("// bootstrap")
        self.client = FakeFTP()
        self.previous = json.dumps(self.old).encode()
        self.client.files["active-release.json"] = self.previous
        self.client.files[".env"] = b"KEEP_PRIVATE=secret"
        self.client.files[".htaccess"] = b"keep Passenger configuration"

    def test_upload_completes_before_activation_and_restart(self):
        verified = []
        deploy(self.client, self.bundle, "https://example.com", lambda url, release: verified.append(release))
        events = self.client.events
        release_uploads = [i for i, event in enumerate(events) if event[1].startswith("releases/")]
        activation = events.index(("rename", "active-release.json"))
        restart = events.index(("rename", "tmp/restart.txt"))
        self.assertLess(max(release_uploads), activation)
        self.assertLess(activation, restart)
        self.assertEqual(self.client.files["active-release.json"], self.pointer)
        self.assertEqual(self.client.files["previous-release.json"], self.previous)
        self.assertEqual(self.client.files[".env"], b"KEEP_PRIVATE=secret")
        self.assertEqual(self.client.files[".htaccess"], b"keep Passenger configuration")
        self.assertEqual(verified, [self.release])

    def test_interrupted_upload_does_not_activate_or_restart(self):
        self.client.fail_upload = "prerender-manifest.json"
        with self.assertRaises(ConnectionError):
            deploy(self.client, self.bundle, "https://example.com", lambda *_: self.fail("Must not verify"))
        self.assertEqual(self.client.files["active-release.json"], self.previous)
        self.assertNotIn("tmp/restart.txt", self.client.files)

    def test_failed_health_check_restores_previous_release_and_reports_failure(self):
        calls = []

        def verifier(url, release):
            calls.append(release)
            if release == self.release:
                raise RuntimeError("503")
            self.assertEqual(self.client.files["active-release.json"], self.previous)

        with self.assertRaisesRegex(RuntimeError, "503"):
            deploy(self.client, self.bundle, "https://example.com", verifier)
        self.assertEqual(calls, [self.release, self.old])
        self.assertEqual(self.client.files["active-release.json"], self.previous)
        self.assertEqual(self.client.events.count(("rename", "tmp/restart.txt")), 2)

    def test_rollback_reconnects_after_http_verification(self):
        connections = []
        calls = []

        def verifier(url, release):
            calls.append(release)
            if release == self.release:
                raise RuntimeError("503")

        def reconnect():
            connections.append("fresh FTP connection")
            return nullcontext(self.client)

        with self.assertRaisesRegex(RuntimeError, "503"):
            deploy(self.client, self.bundle, "https://example.com", verifier, reconnect)
        self.assertEqual(connections, ["fresh FTP connection"])
        self.assertEqual(calls, [self.release, self.old])
        self.assertEqual(self.client.files["active-release.json"], self.previous)

    def test_failed_atomic_rename_keeps_previous_pointer(self):
        self.client.fail_activation = True
        with self.assertRaises(ftplib.error_perm):
            deploy(self.client, self.bundle, "https://example.com", lambda *_: self.fail("Must not verify"))
        self.assertEqual(self.client.files["active-release.json"], self.previous)
        self.assertNotIn("tmp/restart.txt", self.client.files)

    def test_first_release_verification_failure_is_not_reported_as_success(self):
        del self.client.files["active-release.json"]
        with self.assertRaisesRegex(RuntimeError, "503"):
            deploy(self.client, self.bundle, "https://example.com",
                   lambda *_: (_ for _ in ()).throw(RuntimeError("503")))
        self.assertNotIn("previous-release.json", self.client.files)


if __name__ == "__main__":
    unittest.main()

from contextlib import nullcontext
import ftplib
import hashlib
import json
import ssl
from pathlib import Path
import tempfile
import tarfile
import unittest
from unittest.mock import Mock, patch
from deploy_cpanel import VerifiedFTP_TLS, connect, deploy, main


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

    def storbinary(self, command, stream, blocksize=8192, callback=None):
        name = command.removeprefix("STOR ")
        if self.fail_upload and name.endswith(self.fail_upload):
            raise ConnectionError("Upload interrupted")
        blocks = []
        while True:
            block = stream.read(blocksize)
            if not block:
                break
            blocks.append(block)
            if callback:
                callback(block)
        self.files[name] = b"".join(blocks)
        self.events.append(("upload", name))

    def close(self):
        pass

    def size(self, name):
        return len(self.files[name])

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
        self.archive = self.bundle / "cpanel-release.tar.gz"
        with tarfile.open(self.archive, "w:gz") as archive:
            for filename in ("releases", "server.js", "cpanel.cjs", "active-release.json"):
                archive.add(self.bundle / filename, arcname="./" + filename)
        self.release["archiveSha256"] = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.release["archiveBytes"] = self.archive.stat().st_size
        self.pointer = (json.dumps(self.release) + "\n").encode()
        self.client = FakeFTP()
        self.previous = json.dumps(self.old).encode()
        self.client.files["active-release.json"] = self.previous
        self.client.files[".env"] = b"KEEP_PRIVATE=secret"
        self.client.files[".htaccess"] = b"keep Passenger configuration"

    def run_deploy(self, url, verifier, reconnector=None):
        return deploy(self.client, self.bundle, url, verifier, reconnector, archive=self.archive)

    def test_upload_completes_before_activation_and_restart(self):
        verified = []
        self.run_deploy("https://example.com", lambda url, release: verified.append(release))
        events = self.client.events
        release_uploads = [i for i, event in enumerate(events) if event[1].startswith("archives/")]
        activation = events.index(("rename", "active-release.json"))
        restart = events.index(("rename", "tmp/restart.txt"))
        self.assertLess(max(release_uploads), activation)
        self.assertLess(activation, restart)
        self.assertEqual(self.client.files["active-release.json"], self.pointer)
        self.assertEqual(self.client.files["previous-release.json"], self.previous)
        self.assertEqual(self.client.files[".env"], b"KEEP_PRIVATE=secret")
        self.assertEqual(self.client.files[".htaccess"], b"keep Passenger configuration")
        self.assertEqual(verified, [self.release])
        archive_uploads = [event for event in events if event[0] == "upload" and event[1].startswith("archives/")]
        self.assertEqual(len(archive_uploads), 1)
        self.assertFalse(any(event[1].startswith("releases/") for event in events))

    def test_interrupted_upload_does_not_activate_or_restart(self):
        self.client.fail_upload = ".tar.gz.upload"
        with self.assertRaises(ConnectionError):
            self.run_deploy("https://example.com", lambda *_: self.fail("Must not verify"))
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
            self.run_deploy("https://example.com", verifier)
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
            self.run_deploy("https://example.com", verifier, reconnect)
        self.assertEqual(connections, ["fresh FTP connection"])
        self.assertEqual(calls, [self.release, self.old])
        self.assertEqual(self.client.files["active-release.json"], self.previous)

    def test_failed_atomic_rename_keeps_previous_pointer(self):
        self.client.fail_activation = True
        with self.assertRaises(ftplib.error_perm):
            self.run_deploy("https://example.com", lambda *_: self.fail("Must not verify"))
        self.assertEqual(self.client.files["active-release.json"], self.previous)
        self.assertNotIn("tmp/restart.txt", self.client.files)

    def test_first_release_verification_failure_is_not_reported_as_success(self):
        del self.client.files["active-release.json"]
        with self.assertRaisesRegex(RuntimeError, "503"):
            self.run_deploy("https://example.com",
                   lambda *_: (_ for _ in ()).throw(RuntimeError("503")))
        self.assertNotIn("previous-release.json", self.client.files)


    def test_truncated_archive_does_not_activate_or_restart(self):
        with patch.object(self.client, "size", return_value=self.release["archiveBytes"] - 1):
            with self.assertRaisesRegex(ValueError, "archive size differs"):
                self.run_deploy("https://example.com", lambda *_: self.fail("Must not verify"))
        self.assertEqual(self.client.files["active-release.json"], self.previous)
        self.assertNotIn("tmp/restart.txt", self.client.files)

    def test_missing_archive_never_changes_remote_files(self):
        self.archive.unlink()
        with self.assertRaisesRegex(ValueError, "Missing compressed release"):
            self.run_deploy("https://example.com", lambda *_: self.fail("Must not verify"))
        self.assertEqual(self.client.events, [])
        self.assertEqual(self.client.files["active-release.json"], self.previous)



class TLSConnectionTests(unittest.TestCase):
    def client(self, name="provider.example"):
        client = VerifiedFTP_TLS(
            tls_server_name=name, context=ssl.create_default_context(), timeout=10,
        )
        self.addCleanup(client.close)
        client.host = "ftp.customer.example"
        return client

    def test_control_tls_checks_provider_identity_and_preserves_target_host(self):
        client = self.client()
        raw_socket = Mock()
        secured_socket = Mock()
        client.sock = raw_socket
        client.voidcmd = Mock(return_value="234 TLS accepted")
        with patch.object(client.context, "wrap_socket", return_value=secured_socket) as wrap:
            self.assertEqual(client.auth(), "234 TLS accepted")
        wrap.assert_called_once_with(raw_socket, server_hostname="provider.example")
        self.assertEqual(client.host, "ftp.customer.example")
        self.assertTrue(client.context.check_hostname)
        self.assertEqual(client.context.verify_mode, ssl.CERT_REQUIRED)

    def test_data_tls_uses_the_same_verified_identity(self):
        client = self.client()
        client._prot_p = True
        connection, secured = Mock(), Mock()
        with patch("ftplib.FTP.ntransfercmd", return_value=(connection, 123)) as transfer:
            with patch.object(client.context, "wrap_socket", return_value=secured) as wrap:
                self.assertEqual(client.ntransfercmd("STOR releases/file.js"), (secured, 123))
        transfer.assert_called_once_with(client, "STOR releases/file.js", None)
        wrap.assert_called_once_with(connection, server_hostname="provider.example")
        self.assertEqual(client.host, "ftp.customer.example")

    def test_unset_certificate_identity_defaults_to_connection_host(self):
        client = self.client(name=None)
        raw_socket = Mock()
        client.sock = raw_socket
        client.voidcmd = Mock(return_value="234 TLS accepted")
        with patch.object(client.context, "wrap_socket", return_value=Mock()) as wrap:
            client.auth()
        wrap.assert_called_once_with(raw_socket, server_hostname="ftp.customer.example")

    def test_failed_data_tls_closes_connection_without_sending_plain_data(self):
        client = self.client()
        client._prot_p = True
        connection = Mock()
        with patch("ftplib.FTP.ntransfercmd", return_value=(connection, 123)):
            with patch.object(client.context, "wrap_socket", side_effect=ssl.SSLError("TLS failed")):
                with self.assertRaises(ssl.SSLError):
                    client.ntransfercmd("STOR releases/file.js")
        connection.close.assert_called_once()

    def test_connect_keeps_certificate_validation_enabled(self):
        environment = {
            "HOST": "ftp.customer.example", "FTP": "test-user", "PASS": "test-pass",
            "FTP_TLS_SERVER_NAME": "provider.example",
        }
        with patch.dict("os.environ", environment, clear=True):
            with patch("deploy_cpanel.VerifiedFTP_TLS") as constructor:
                result = connect("ftps", 21)
        context = constructor.call_args.kwargs["context"]
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertEqual(constructor.call_args.kwargs["tls_server_name"], "provider.example")
        result.connect.assert_called_once_with("ftp.customer.example", 21)
        result.login.assert_called_once_with("test-user", "test-pass")
        result.prot_p.assert_called_once()
        result.cwd.assert_called_once_with(".")

    def test_hostname_mismatch_has_actionable_error_and_never_retries_plain_ftp(self):
        error = ssl.SSLCertVerificationError(1, "Hostname mismatch")
        environment = {"HOST": "ftp.customer.example", "FTP": "test-user", "PASS": "test-pass"}
        with patch.dict("os.environ", environment, clear=True):
            with patch("deploy_cpanel.VerifiedFTP_TLS") as constructor:
                with patch("deploy_cpanel.ftplib.FTP") as plaintext:
                    constructor.return_value.login.side_effect = error
                    with self.assertRaisesRegex(RuntimeError, "FTP_TLS_SERVER_NAME"):
                        connect("ftps", 21)
                    plaintext.assert_not_called()
        constructor.return_value.close.assert_called_once()

    def test_connection_preflight_does_not_deploy_or_change_files(self):
        with patch("deploy_cpanel.sys.argv", ["deploy_cpanel.py", "--check-connection"]):
            with patch("deploy_cpanel.settings", return_value=("ftps", 21, "https://example.com")):
                with patch("deploy_cpanel.connect") as connection:
                    with patch("deploy_cpanel.deploy") as deployment:
                        main()
                    connection.assert_called_once_with("ftps", 21)
                    deployment.assert_not_called()


if __name__ == "__main__":
    unittest.main()

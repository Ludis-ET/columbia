"""Upload a complete FTP release, atomically activate it, and verify or roll back.

Only Python's standard library is needed. Credentials come from the environment;
runtime application credentials remain in cPanel, outside the release artifact.
"""
import argparse
from contextlib import nullcontext
import ftplib
import io
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import time
from urllib.parse import urlparse



class VerifiedFTP_TLS(ftplib.FTP_TLS):
    """Keep the FTP network address separate from the verified TLS identity."""

    def __init__(self, *, tls_server_name=None, **kwargs):
        super().__init__(**kwargs)
        self.tls_server_name = tls_server_name

    def auth(self):
        if isinstance(self.sock, ssl.SSLSocket):
            raise ValueError("Already using TLS")
        response = self.voidcmd("AUTH TLS")
        self.sock = self.context.wrap_socket(
            self.sock, server_hostname=self.tls_server_name or self.host,
        )
        self.file = self.sock.makefile(mode="r", encoding=self.encoding)
        return response

    def ntransfercmd(self, command, rest=None):
        # FTP chooses the data endpoint from the existing control connection.
        # Only SNI and certificate identity change; HOST is never rewritten.
        connection, size = ftplib.FTP.ntransfercmd(self, command, rest)
        if self._prot_p:
            try:
                connection = self.context.wrap_socket(
                    connection, server_hostname=self.tls_server_name or self.host,
                )
            except BaseException:
                connection.close()
                raise
        return connection, size


def settings():
    missing = [name for name in ("HOST", "FTP", "PASS") if not os.environ.get(name)]
    if missing:
        raise ValueError("Missing GitHub Actions secrets: " + ", ".join(missing))
    protocol = os.environ.get("FTP_PROTOCOL", "ftps")
    if protocol not in ("ftp", "ftps"):
        raise ValueError("FTP_PROTOCOL must be ftps (explicit TLS) or ftp")
    url = os.environ.get("SITE_URL", "https://columbiacareafh.com")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.path not in ("", "/"):
        raise ValueError("SITE_URL must be the public HTTPS origin, without a path")
    port = int(os.environ.get("FTP_PORT", "21"))
    if not 1 <= port <= 65535:
        raise ValueError("FTP_PORT must be between 1 and 65535")
    tls_name = os.environ.get("FTP_TLS_SERVER_NAME", "")
    if tls_name and not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9.-]*", tls_name):
        raise ValueError("FTP_TLS_SERVER_NAME must be a hostname, without a URL, port or wildcard")
    return protocol, port, url.rstrip("/")


def connect(protocol, port):
    if protocol == "ftps":
        client = VerifiedFTP_TLS(
            tls_server_name=os.environ.get("FTP_TLS_SERVER_NAME") or None,
            context=ssl.create_default_context(),
            timeout=60,
        )
    else:
        client = ftplib.FTP(timeout=60)
    try:
        client.connect(os.environ["HOST"], port)
        client.login(os.environ["FTP"], os.environ["PASS"])
        if protocol == "ftps":
            client.prot_p()
        client.cwd(os.environ.get("FTP_SERVER_DIR", "."))
    except ssl.SSLCertVerificationError as error:
        client.close()
        if getattr(error, "verify_code", None) in (62, 64) or "mismatch" in str(error).lower():
            raise RuntimeError(
                "FTPS certificate hostname mismatch. Keep HOST pointing at the correct FTP "
                "server and set the public FTP_TLS_SERVER_NAME repository variable to the "
                "certificate hostname confirmed by your hosting provider. The workflow "
                "defaults to vesper.hostns.io for this host. No new secret is needed. "
                "Certificate verification remains enabled."
            ) from error
        raise RuntimeError(
            "FTPS certificate verification failed. Ask the hosting provider to renew or "
            "repair its FTP certificate and certificate chain. Verification remains enabled."
        ) from error
    except BaseException:
        client.close()
        raise
    return client

def read_optional(client, name):
    data = io.BytesIO()
    try:
        client.retrbinary("RETR " + name, data.write)
    except ftplib.error_perm as error:
        if not str(error).startswith("550"):
            raise
        return None
    if data.tell() > 16384:
        raise ValueError("Unexpectedly large deployment control file: " + name)
    return data.getvalue()


def ensure_directory(client, name):
    # A failed MKD can mean the directory already exists. Confirm with CWD;
    # permission errors and disk failures must never be silently absorbed.
    current = client.pwd()
    try:
        client.mkd(name)
    except ftplib.error_perm:
        client.cwd(name)
        client.cwd(current)


def atomic_write(client, name, content, release_id):
    temporary = name + ".upload-" + release_id
    client.storbinary("STOR " + temporary, io.BytesIO(content))
    # RNFR/RNTO must replace in one server-side operation. Never delete the
    # active pointer first; failure leaves the existing release selected.
    client.rename(temporary, name)


def verify(url, release):
    subprocess.run(
        [
            "node", str(Path(__file__).with_name("verify-cpanel.mjs")),
            url, release["id"], release["commit"],
        ],
        check=True,
        timeout=300,
    )


def deploy(client, bundle, url, verifier=verify, reconnector=None):
    pointer = (bundle / "active-release.json").read_bytes()
    release = json.loads(pointer)
    release_id = release["id"]
    if not isinstance(release_id, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}", release_id):
        raise ValueError("Invalid release ID")
    directory = bundle / "releases" / release_id
    if not directory.is_dir():
        raise ValueError("Release directory is missing")
    previous = read_optional(client, "active-release.json")
    if previous:
        previous_release = json.loads(previous)
        if previous_release["id"] == release_id:
            raise ValueError("Release is already active; run a new workflow attempt")

    ensure_directory(client, "releases")
    # Each workflow run/attempt gets a unique directory. Existing releases are
    # never overwritten, so an interrupted upload cannot damage a running app.
    remote_root = "releases/" + release_id
    client.mkd(remote_root)
    files = sorted(directory.rglob("*"))
    uploaded = 0
    for local in files:
        if local.is_symlink():
            raise ValueError("Package must contain real files, not symlinks: " + str(local))
        relative = local.relative_to(directory).as_posix()
        remote = remote_root + "/" + relative
        if local.is_dir():
            client.mkd(remote)
        else:
            with local.open("rb") as stream:
                client.storbinary("STOR " + remote, stream)
            uploaded += 1
            if uploaded % 250 == 0:
                print("Uploaded", uploaded, "release files", flush=True)
    print("Uploaded complete release:", release_id, "(" + str(uploaded) + " files)", flush=True)

    # These are module-mode-neutral entry points. The root package.json,
    # node_modules symlink, .htaccess, .env files and logs are left alone.
    for filename in ("cpanel.cjs", "server.js"):
        atomic_write(client, filename, (bundle / filename).read_bytes(), release_id)
    if previous:
        atomic_write(client, "previous-release.json", previous, release_id)
    ensure_directory(client, "tmp")
    atomic_write(client, "active-release.json", pointer, release_id)
    try:
        # Restart only AFTER every release file and the pointer are in place.
        atomic_write(client, "tmp/restart.txt", (release_id + " " + str(time.time())).encode(), release_id)
        verifier(url, release)
    except Exception:
        if previous:
            print("New release failed verification. Restoring the previous release.", flush=True)
            # Verification can outlast the FTP server's idle timeout. Use a
            # fresh authenticated connection for recovery in production.
            with (reconnector() if reconnector else nullcontext(client)) as recovery:
                atomic_write(recovery, "active-release.json", previous, release_id)
                atomic_write(recovery, "tmp/restart.txt", ("rollback " + str(time.time())).encode(), release_id)
            verifier(url, previous_release)
            print("Previous release restored and verified.", flush=True)
        else:
            print("No previous managed release to restore. Check cPanel stderr.log and restart the app.", flush=True)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    checks = parser.add_mutually_exclusive_group()
    checks.add_argument("--check-config", action="store_true")
    checks.add_argument("--check-connection", action="store_true")
    parser.add_argument("--bundle", type=Path, default=Path("deploy-dist"))
    args = parser.parse_args()
    protocol, port, url = settings()
    if args.check_config:
        print("Deployment configuration is present.")
        return
    with connect(protocol, port) as client:
        if args.check_connection:
            print("FTP connection, login and application directory verified; no files changed.")
            return
        deploy(client, args.bundle, url, reconnector=lambda: connect(protocol, port))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Deployment FAILED:", str(error), file=sys.stderr)
        sys.exit(1)

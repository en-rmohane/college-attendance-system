"""
Resumable APK Downloader with automatic retries and byte-range resume
"""
import os
import time
import requests

URL = "https://expo.dev/artifacts/eas/ABkrqv2hmPB7rfdfVHEi1H-Q3Hxe6XndeIwPJhimk7c.apk"
DEST = "college_attendance.apk"

def download():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    # Get total size
    r_head = requests.head(URL, headers=headers, allow_redirects=True, timeout=30)
    total_size = int(r_head.headers.get('content-length', 0))
    print(f"Total APK Size: {total_size / (1024*1024):.2f} MB", flush=True)

    downloaded = 0
    if os.path.exists(DEST):
        downloaded = os.path.getsize(DEST)
        print(f"Existing partial file found: {downloaded / (1024*1024):.2f} MB", flush=True)

    while downloaded < total_size:
        req_headers = headers.copy()
        if downloaded > 0:
            req_headers['Range'] = f"bytes={downloaded}-"

        try:
            print(f"Resuming download from byte {downloaded} ({downloaded / (1024*1024):.2f} MB)...", flush=True)
            with requests.get(URL, headers=req_headers, stream=True, timeout=60) as res:
                if res.status_code not in (200, 206):
                    # If server doesn't support range, restart
                    print("Server does not support partial content, downloading from start...", flush=True)
                    downloaded = 0
                    mode = 'wb'
                else:
                    mode = 'ab' if downloaded > 0 else 'wb'

                with open(DEST, mode) as f:
                    for chunk in res.iter_content(chunk_size=512*1024):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            pct = (downloaded / total_size) * 100 if total_size else 0
                            print(f"Downloaded: {downloaded / (1024*1024):.2f} / {total_size / (1024*1024):.2f} MB ({pct:.1f}%)", flush=True)

        except Exception as e:
            print(f"Connection hiccup ({e}), retrying in 2 seconds...", flush=True)
            time.sleep(2)
            if os.path.exists(DEST):
                downloaded = os.path.getsize(DEST)

    print("=" * 60, flush=True)
    print("SUCCESS! college_attendance.apk is 100% fully downloaded on your PC!", flush=True)
    print(f"Location: {os.path.abspath(DEST)}", flush=True)
    print("=" * 60, flush=True)

if __name__ == '__main__':
    download()

"""获取真实 WorkBuddy 云 SDK 到本地（不入库，按需下载）。

SDK 是第三方打包产物，不放进仓库；测试前自动从 jsDelivr 取一份并与
index.html 里引用的地址保持一致。
"""
import urllib.request
from pathlib import Path

SDK_URL = "https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js"
HERE = Path(__file__).parent
SDK_PATH = HERE / "sdk.js"


def ensure_sdk(path: Path = SDK_PATH) -> str:
    if path.exists() and path.stat().st_size > 10000:
        return path.read_text(encoding="utf-8")
    with urllib.request.urlopen(SDK_URL, timeout=60) as resp:
        body = resp.read()
    path.write_bytes(body)
    return body.decode("utf-8")


if __name__ == "__main__":
    text = ensure_sdk()
    print(f"{SDK_PATH} ({len(text)} chars)")

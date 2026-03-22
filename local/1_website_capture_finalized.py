import os
import sys
import subprocess
import datetime
from playwright.sync_api import sync_playwright
from PIL import Image

# ========================
# 配置
# ========================

URL = "https://<YOUR_CLOUD_RUN_URL>/"

OUTPUT_DIR = r"<YOUR_LOCAL_OUTPUT_PATH>"
RAW_IMAGE = os.path.join(OUTPUT_DIR, "raw.png")
FINAL_IMAGE = os.path.join(OUTPUT_DIR, "latest.jpg")

VIEWPORT_WIDTH = 800
VIEWPORT_HEIGHT = 600

# ========================
# 日志
# ========================

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

# ========================
# 主流程
# ========================

def capture():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    try:
        log("Launching browser...")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, channel="chrome")
            page = browser.new_page(
                viewport={
                    "width": VIEWPORT_WIDTH,
                    "height": VIEWPORT_HEIGHT
                },
                device_scale_factor=1
            )

            log(f"Loading {URL}")
            page.goto(URL, wait_until="networkidle", timeout=60000)

            page.wait_for_timeout(1000)

            log("Taking screenshot (800x600)...")
            page.screenshot(
                path=RAW_IMAGE,
                clip={
                    "x": 0,
                    "y": 0,
                    "width": 800,
                    "height": 600
                }
            )

            browser.close()

        # ===== 旋转 =====
        log("Rotating image 90° CCW...")
        img = Image.open(RAW_IMAGE)
        rotated = img.rotate(90, expand=True)
        rotated.save(RAW_IMAGE)

        # ===== ImageMagick 强制清洗 =====
        log("Processing with ImageMagick...")

        cmd = [
            "magick",
            RAW_IMAGE,
            "-resize", "600x800!",
            "-colorspace", "Gray",
            "-type", "Grayscale",
            "-depth", "8",
            "-interlace", "none",
            "-strip",
            FINAL_IMAGE
        ]

        subprocess.run(cmd, check=True)

        log("Kindle-ready image generated successfully.")
        log(f"Output: {FINAL_IMAGE}")

    except Exception as e:
        log(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    capture()
"""
IntentCore Pixel Creator — Headed Selenium browser
Creates a new pixel on app.intentcore.io and extracts the pixel code.

Adapted from auto_pixel/server/src/lib/audienceLab.ts
"""

import os
import sys
import time
import logging
import tempfile
import shutil
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env from the same directory as this script
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

EMAIL = os.environ["INTENTCORE_EMAIL"]
PASSWORD = os.environ["INTENTCORE_PASSWORD"]
WORKSPACE_URL = os.environ["INTENTCORE_WORKSPACE_URL"]
LOGIN_URL = "https://app.intentcore.io/auth/sign-in"

# --- Timing helpers ---
_step_start = 0
_run_start = 0
_timings = []

def step_start(label):
    global _step_start
    _step_start = time.perf_counter()
    logger.info(f"⏳ [{label}] starting...")

def step_end(label):
    elapsed_ms = int((time.perf_counter() - _step_start) * 1000)
    _timings.append((label, elapsed_ms))
    logger.info(f"✅ [{label}] done — {elapsed_ms}ms")

def print_timing_summary():
    total = int((time.perf_counter() - _run_start) * 1000)
    logger.info("")
    logger.info("=" * 60)
    logger.info("  TIMING SUMMARY")
    logger.info("=" * 60)
    for label, ms in _timings:
        bar = "█" * max(1, ms // 100)
        logger.info(f"  {ms:>6}ms  {bar}  {label}")
    logger.info(f"  {'─' * 50}")
    logger.info(f"  {total:>6}ms  TOTAL")
    logger.info("=" * 60)


def create_pixel(website_name: str, website_url: str):
    """Create a pixel on IntentCore and return the pixel code snippet."""
    global _run_start
    _run_start = time.perf_counter()

    # Setup Chrome (headed)
    user_data_dir = tempfile.mkdtemp()
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument(f"--user-data-dir={user_data_dir}")

    step_start("Chrome launch")
    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options
    )
    wait = WebDriverWait(driver, 30)
    step_end("Chrome launch")

    try:
        # === Step 1: Navigate to login ===
        step_start("Navigate to login page")
        driver.get(LOGIN_URL)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
        step_end("Navigate to login page")

        # === Step 2: Enter credentials ===
        step_start("Enter credentials")
        email_input = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
        email_input.clear()
        email_input.send_keys(EMAIL)
        email_input.send_keys(Keys.ENTER)

        pass_input = wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "input[type='password']")
        ))
        pass_input.clear()
        pass_input.send_keys(PASSWORD)
        pass_input.send_keys(Keys.ENTER)
        step_end("Enter credentials")

        # === Step 3: Wait for login to complete ===
        step_start("Wait for login")
        wait.until(lambda d: "/auth/" not in d.current_url)
        step_end("Wait for login")

        # === Step 4: Navigate directly to Pixels page (skip workspace landing) ===
        step_start("Navigate to Pixels page")
        driver.get(f"{WORKSPACE_URL}/pixel")
        # Wait for page to actually load (Create button present)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(normalize-space(.),'Create')]")
        ))
        step_end("Navigate to Pixels page")

        # === Step 6: Install network interceptor ===
        step_start("Install network interceptor")
        driver.execute_script("""(function(){
            try {
                if (window.__PIXEL_CAPTURED__) return;
                window.__PIXEL_CAPTURED__ = { pixel: '' };
                var origFetch = window.fetch;
                if (origFetch) {
                    window.fetch = async function(){
                        var res = await origFetch.apply(this, arguments);
                        try {
                            var clone = res.clone();
                            var text = await clone.text();
                            if (/identitypxl\\.app\\/pixels\\//i.test(text)) {
                                window.__PIXEL_CAPTURED__.pixel = text;
                            }
                        } catch(e) {}
                        return res;
                    };
                }
            } catch(e) {}
        })();""")
        step_end("Install network interceptor")

        # === Step 7: Click Create button ===
        step_start("Find & click Create button")
        create_btn = None
        create_selectors = [
            (By.XPATH, "//button[contains(normalize-space(.),'Create') and not(ancestor::div[@role='dialog'])]"),
            (By.CSS_SELECTOR, "button.bg-primary"),
            (By.XPATH, "//button[contains(@class,'primary') and contains(normalize-space(.),'Create')]"),
        ]
        for by, selector in create_selectors:
            try:
                el = wait.until(EC.element_to_be_clickable((by, selector)))
                if el.is_displayed():
                    create_btn = el
                    break
            except Exception:
                continue

        if not create_btn:
            buttons = driver.find_elements(By.XPATH, "//button[contains(normalize-space(.),'Create')]")
            for btn in buttons:
                if btn.is_displayed():
                    create_btn = btn
                    break

        if not create_btn:
            raise Exception("Create button not found on Pixels page")

        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", create_btn)
        time.sleep(0.3)
        create_btn.click()
        step_end("Find & click Create button")

        # === Step 8: Wait for modal ===
        step_start("Wait for modal")
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='dialog']")))
        time.sleep(0.5)
        step_end("Wait for modal")

        # === Step 9: Fill Website Name ===
        step_start("Fill website name")
        name_field = None
        name_selectors = [
            (By.CSS_SELECTOR, "input[name='websiteName']"),
            (By.CSS_SELECTOR, "input[name*='name']:not([placeholder*='Search'])"),
            (By.CSS_SELECTOR, "form input[type='text']:not([placeholder*='Search'])"),
        ]
        for by, selector in name_selectors:
            try:
                el = driver.find_element(by, selector)
                if el.is_displayed():
                    name_field = el
                    break
            except Exception:
                continue

        if not name_field:
            inputs = driver.find_elements(By.CSS_SELECTOR, "form input[type='text'], div[role='dialog'] input[type='text']")
            for inp in inputs:
                placeholder = inp.get_attribute("placeholder") or ""
                if "search" not in placeholder.lower():
                    name_field = inp
                    break

        if not name_field:
            raise Exception("Website name field not found")

        name_field.clear()
        time.sleep(0.2)
        name_field.send_keys(website_name)
        step_end("Fill website name")

        # === Step 10: Fill Website URL ===
        step_start("Fill website URL")
        url_field = None
        url_selectors = [
            (By.CSS_SELECTOR, 'input[placeholder="https://example.com"]'),
            (By.CSS_SELECTOR, 'input[placeholder*="http"]'),
            (By.CSS_SELECTOR, 'input[name*="url"]'),
            (By.CSS_SELECTOR, 'input[type="url"]'),
        ]
        for by, selector in url_selectors:
            try:
                el = driver.find_element(by, selector)
                if el.is_displayed():
                    url_field = el
                    break
            except Exception:
                continue

        if not url_field:
            inputs = driver.find_elements(By.CSS_SELECTOR, "form input, div[role='dialog'] input")
            if len(inputs) >= 2:
                url_field = inputs[1]

        if not url_field:
            raise Exception("Website URL field not found")

        url_field.clear()
        time.sleep(0.2)
        url_field.send_keys(website_url)
        step_end("Fill website URL")

        # === Step 11: Click Next ===
        step_start("Click Next")
        next_btn = None
        next_selectors = [
            (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.),'Next')]"),
            (By.XPATH, "//form//button[contains(normalize-space(.),'Next')]"),
            (By.CSS_SELECTOR, "div[role='dialog'] button[type='submit']"),
            (By.CSS_SELECTOR, "form button[type='submit']"),
        ]
        for by, selector in next_selectors:
            try:
                el = driver.find_element(by, selector)
                if el.is_displayed():
                    next_btn = el
                    break
            except Exception:
                continue

        if not next_btn:
            raise Exception("Next button not found")

        next_btn.click()
        step_end("Click Next")

        # === Step 12: Wait after Next ===
        step_start("Wait after Next")
        time.sleep(1)
        step_end("Wait after Next")

        # === Step 13: Click final Create ===
        step_start("Find & click final Create")
        time.sleep(1)

        final_create = None
        final_selectors = [
            (By.CSS_SELECTOR, "div[role='dialog'] button[type='submit']"),
            (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.),'Create')]"),
            (By.XPATH, "//div[@role='dialog']//form//button[contains(normalize-space(.),'Create')]"),
        ]
        for by, selector in final_selectors:
            try:
                el = driver.find_element(by, selector)
                if el.is_displayed():
                    final_create = el
                    break
            except Exception:
                continue

        if not final_create:
            buttons = driver.find_elements(By.CSS_SELECTOR, "div[role='dialog'] form button")
            if buttons:
                final_create = buttons[-1]

        if not final_create:
            raise Exception("Final Create button not found in modal")

        for _ in range(30):
            if final_create.is_enabled():
                break
            time.sleep(0.5)

        try:
            final_create.click()
        except Exception:
            driver.execute_script("arguments[0].click();", final_create)
        step_end("Find & click final Create")

        # === Step 14: Wait on webhook page ===
        step_start("Wait on webhook page")
        time.sleep(0.3)
        step_end("Wait on webhook page")

        # === Step 15: Click Install tab ===
        step_start("Click Install tab")
        try:
            install_tab = driver.find_element(By.XPATH, "//button[contains(normalize-space(.),'Install')]")
            driver.execute_script("arguments[0].click();", install_tab)
        except Exception:
            pass
        step_end("Click Install tab")

        # === Step 16: Click Basic Install ===
        step_start("Click Basic Install")
        time.sleep(1)
        try:
            basic_btn = driver.find_element(By.XPATH, "//button[contains(normalize-space(.),'Basic Install')]")
            driver.execute_script("arguments[0].click();", basic_btn)
        except Exception:
            pass
        step_end("Click Basic Install")

        # === Step 17: Extract pixel code ===
        step_start("Extract pixel code")
        time.sleep(1)
        pixel_code = ""

        # Strategy 1: <pre> in dialog
        try:
            pre = driver.find_element(By.CSS_SELECTOR, "div[role='dialog'] pre")
            pixel_code = pre.text.strip()
        except Exception:
            pass

        # Strategy 2: Any <pre> with identitypxl content
        if not pixel_code or "identitypxl" not in pixel_code:
            try:
                pres = driver.find_elements(By.TAG_NAME, "pre")
                for pre in pres:
                    text = pre.text.strip()
                    if "identitypxl" in text:
                        pixel_code = text
                        break
            except Exception:
                pass

        # Strategy 3: Network interceptor capture
        if not pixel_code or "identitypxl" not in pixel_code:
            try:
                captured = driver.execute_script("return (window.__PIXEL_CAPTURED__ && window.__PIXEL_CAPTURED__.pixel) || '';")
                if captured and "identitypxl" in captured:
                    import re
                    match = re.search(r'https?://[^\s"\']*identitypxl\.app/pixels/[^\s"\']*/p\.js', captured)
                    if match:
                        pixel_code = f'<script src="{match.group(0)}" async></script>'
            except Exception:
                pass

        # Strategy 4: Full page scan
        if not pixel_code or "identitypxl" not in pixel_code:
            try:
                result = driver.execute_script("""
                    var all = document.querySelectorAll('pre, code, textarea, div');
                    for (var i = 0; i < all.length; i++) {
                        var t = (all[i].textContent || '').trim();
                        if (t && /identitypxl\\.app\\/pixels\\//i.test(t) && /<script/i.test(t)) {
                            return t;
                        }
                    }
                    return '';
                """)
                if result:
                    pixel_code = result.strip()
            except Exception:
                pass

        step_end("Extract pixel code")

        # === Report ===
        if pixel_code and "identitypxl" in pixel_code:
            logger.info("")
            logger.info("=== PIXEL CODE EXTRACTED SUCCESSFULLY ===")
            logger.info(pixel_code)
        else:
            logger.warning("=== PIXEL CODE NOT FOUND ===")
            logger.info(f"Best text: {pixel_code[:200] if pixel_code else '(empty)'}")

        # Print timing summary
        print_timing_summary()

        # Keep browser open for inspection
        logger.info("")
        logger.info("Browser staying open for inspection. Press Ctrl+C to close.")
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("User closed.")
    except Exception as e:
        logger.error(f"Error: {e}")
        print_timing_summary()
        try:
            driver.save_screenshot("/tmp/intentcore_create_pixel_fail.png")
            logger.info("Screenshot saved to /tmp/intentcore_create_pixel_fail.png")
        except Exception:
            pass
        logger.info("Browser staying open for debugging. Press Ctrl+C to close.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        driver.quit()
        shutil.rmtree(user_data_dir, ignore_errors=True)


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "test"
    url = sys.argv[2] if len(sys.argv) > 2 else "http://www.test.com"
    create_pixel(name, url)

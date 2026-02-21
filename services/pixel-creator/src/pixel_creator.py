"""
IntentCore pixel creation via Selenium.

Split into two phases for pre-warming:
  1. warm_session()  — launches Chrome, logs in, opens Create modal, selects V4
  2. fill_and_create() — fills name/url, clicks Create, extracts pixel code
"""

import os
import re
import time
import logging
import tempfile
import shutil

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from .config import settings

logger = logging.getLogger(__name__)

LOGIN_URL = "https://app.intentcore.io/auth/sign-in"


def _get_chromedriver_service() -> ChromeService:
    """Use system chromedriver if available, fall back to webdriver-manager."""
    for path in ["/opt/homebrew/bin/chromedriver", "/usr/local/bin/chromedriver"]:
        if os.path.isfile(path):
            logger.info(f"Using system chromedriver: {path}")
            return ChromeService(path)
    logger.info("Using webdriver-manager chromedriver")
    return ChromeService(ChromeDriverManager().install())


def _find_clickable(driver, wait, selectors):
    """Try multiple selectors, return the first visible clickable element."""
    for by, selector in selectors:
        try:
            el = wait.until(EC.element_to_be_clickable((by, selector)))
            if el.is_displayed():
                return el
        except Exception:
            continue
    return None


def _find_visible(driver, selectors):
    """Try multiple selectors without waiting, return first visible element."""
    for by, selector in selectors:
        try:
            el = driver.find_element(by, selector)
            if el.is_displayed():
                return el
        except Exception:
            continue
    return None


class WarmSession:
    """Holds a pre-warmed Chrome driver with the Create modal open and V4 selected."""

    def __init__(self, driver, user_data_dir, created_at):
        self.driver = driver
        self.user_data_dir = user_data_dir
        self.created_at = created_at

    def close(self):
        try:
            self.driver.quit()
        except Exception:
            pass
        shutil.rmtree(self.user_data_dir, ignore_errors=True)


def warm_session() -> WarmSession:
    """
    Launch Chrome, log in to IntentCore, navigate to /pixel,
    click Create, select V4, and return a WarmSession with the modal open.
    """
    user_data_dir = tempfile.mkdtemp()
    options = Options()
    if settings.chrome_headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument(f"--user-data-dir={user_data_dir}")

    t0 = time.perf_counter()
    driver = webdriver.Chrome(
        service=_get_chromedriver_service(),
        options=options,
    )
    wait = WebDriverWait(driver, 30)
    logger.info(f"Chrome launched in {int((time.perf_counter()-t0)*1000)}ms")

    try:
        # Login
        driver.get(LOGIN_URL)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))

        email_input = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
        email_input.clear()
        email_input.send_keys(settings.intentcore_email)
        email_input.send_keys(Keys.ENTER)

        pass_input = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='password']"))
        )
        pass_input.clear()
        pass_input.send_keys(settings.intentcore_password)
        pass_input.send_keys(Keys.ENTER)

        wait.until(lambda d: "/auth/" not in d.current_url)
        logger.info("Logged in")

        # Navigate to Pixels page
        driver.get(f"{settings.intentcore_workspace_url}/pixel")
        wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[contains(normalize-space(.),'Create')]")
            )
        )
        logger.info("On Pixels page")

        # Install network interceptor for pixel code capture
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
                            if (/<script[^>]*src=/.test(text)) {
                                window.__PIXEL_CAPTURED__.pixel = text;
                            }
                        } catch(e) {}
                        return res;
                    };
                }
            } catch(e) {}
        })();""")

        # Click Create button (on the page, not in a dialog)
        create_btn = _find_clickable(driver, wait, [
            (By.XPATH, "//button[contains(normalize-space(.),'Create') and not(ancestor::div[@role='dialog'])]"),
            (By.CSS_SELECTOR, "button.bg-primary"),
            (By.XPATH, "//button[contains(@class,'primary') and contains(normalize-space(.),'Create')]"),
        ])
        if not create_btn:
            buttons = driver.find_elements(
                By.XPATH, "//button[contains(normalize-space(.),'Create')]"
            )
            for btn in buttons:
                if btn.is_displayed():
                    create_btn = btn
                    break
        if not create_btn:
            raise RuntimeError("Create button not found on Pixels page")

        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", create_btn)
        time.sleep(0.3)
        create_btn.click()

        # Wait for modal
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='dialog']")))
        time.sleep(0.5)

        # Select V4 (Beta)
        v4_btn = _find_visible(driver, [
            (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.),'V4')]"),
            (By.XPATH, "//div[@role='dialog']//*[contains(normalize-space(.),'V4 (Beta)') and (self::button or self::div)]"),
            (By.XPATH, "//button[contains(normalize-space(.),'V4')]"),
        ])
        if v4_btn:
            try:
                v4_btn.click()
            except Exception:
                driver.execute_script("arguments[0].click();", v4_btn)
            time.sleep(0.3)
            logger.info("V4 (Beta) selected")
        else:
            logger.warning("V4 button not found — may already be default")

        elapsed = int((time.perf_counter() - t0) * 1000)
        logger.info(f"Session warmed in {elapsed}ms")
        return WarmSession(driver, user_data_dir, created_at=time.time())

    except Exception:
        driver.quit()
        shutil.rmtree(user_data_dir, ignore_errors=True)
        raise


def fill_and_create(session: WarmSession, name: str, url: str) -> tuple[str, str]:
    """
    Fill in the pixel name/url on an already-warmed session, click Create,
    and extract the pixel code.

    Returns (pixel_code, pixel_id). Closes the session when done.
    """
    driver = session.driver
    wait = WebDriverWait(driver, 30)
    t0 = time.perf_counter()

    try:
        # Fill Website Name
        name_field = _find_visible(driver, [
            (By.CSS_SELECTOR, "input[name='websiteName']"),
            (By.CSS_SELECTOR, "input[name*='name']:not([placeholder*='Search'])"),
            (By.CSS_SELECTOR, "form input[type='text']:not([placeholder*='Search'])"),
        ])
        if not name_field:
            inputs = driver.find_elements(
                By.CSS_SELECTOR,
                "form input[type='text'], div[role='dialog'] input[type='text']",
            )
            for inp in inputs:
                placeholder = inp.get_attribute("placeholder") or ""
                if "search" not in placeholder.lower():
                    name_field = inp
                    break
        if not name_field:
            raise RuntimeError("Website name field not found")

        name_field.clear()
        time.sleep(0.2)
        name_field.send_keys(name)

        # Fill Website URL
        url_field = _find_visible(driver, [
            (By.CSS_SELECTOR, 'input[placeholder="https://example.com"]'),
            (By.CSS_SELECTOR, 'input[placeholder*="http"]'),
            (By.CSS_SELECTOR, 'input[name*="url"]'),
            (By.CSS_SELECTOR, 'input[type="url"]'),
        ])
        if not url_field:
            inputs = driver.find_elements(
                By.CSS_SELECTOR, "form input, div[role='dialog'] input"
            )
            if len(inputs) >= 2:
                url_field = inputs[1]
        if not url_field:
            raise RuntimeError("Website URL field not found")

        url_field.clear()
        time.sleep(0.2)
        url_field.send_keys(url)

        # Click Next
        next_btn = _find_visible(driver, [
            (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.),'Next')]"),
            (By.XPATH, "//form//button[contains(normalize-space(.),'Next')]"),
            (By.CSS_SELECTOR, "div[role='dialog'] button[type='submit']"),
            (By.CSS_SELECTOR, "form button[type='submit']"),
        ])
        if not next_btn:
            raise RuntimeError("Next button not found")
        next_btn.click()
        time.sleep(1)

        # Click final Create
        time.sleep(1)
        final_create = _find_visible(driver, [
            (By.CSS_SELECTOR, "div[role='dialog'] button[type='submit']"),
            (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.),'Create')]"),
            (By.XPATH, "//div[@role='dialog']//form//button[contains(normalize-space(.),'Create')]"),
        ])
        if not final_create:
            buttons = driver.find_elements(
                By.CSS_SELECTOR, "div[role='dialog'] form button"
            )
            if buttons:
                final_create = buttons[-1]
        if not final_create:
            raise RuntimeError("Final Create button not found in modal")

        # Wait for button to be enabled
        for _ in range(30):
            if final_create.is_enabled():
                break
            time.sleep(0.5)

        try:
            final_create.click()
        except Exception:
            driver.execute_script("arguments[0].click();", final_create)

        # Navigate to Install tab
        time.sleep(0.3)
        try:
            install_tab = driver.find_element(
                By.XPATH, "//button[contains(normalize-space(.),'Install')]"
            )
            driver.execute_script("arguments[0].click();", install_tab)
        except Exception:
            pass

        # Click Basic Install
        time.sleep(1)
        try:
            basic_btn = driver.find_element(
                By.XPATH, "//button[contains(normalize-space(.),'Basic Install')]"
            )
            driver.execute_script("arguments[0].click();", basic_btn)
        except Exception:
            pass

        # Extract pixel code
        time.sleep(1)
        pixel_code = _extract_pixel_code(driver)

        elapsed = int((time.perf_counter() - t0) * 1000)
        logger.info(f"fill_and_create completed in {elapsed}ms")

        if not pixel_code or "<script" not in pixel_code.lower():
            raise RuntimeError(
                f"Pixel code not found after creation. Got: {pixel_code[:200] if pixel_code else '(empty)'}"
            )

        # Extract pixel ID from the code
        pixel_id = _extract_pixel_id(pixel_code)

        return pixel_code, pixel_id

    finally:
        session.close()


def _extract_pixel_code(driver) -> str:
    """Try multiple strategies to extract the pixel <script> tag from the page."""
    # Strategy 1: <pre> or <code> in dialog containing a <script> tag
    try:
        for selector in ["div[role='dialog'] pre", "div[role='dialog'] code"]:
            for el in driver.find_elements(By.CSS_SELECTOR, selector):
                text = el.text.strip()
                if text and "<script" in text.lower():
                    logger.info(f"Extracted pixel code via dialog element: {text[:100]}")
                    return text
    except Exception:
        pass

    # Strategy 2: Any <pre> or <code> with a <script> tag
    try:
        for tag in ["pre", "code"]:
            for el in driver.find_elements(By.TAG_NAME, tag):
                text = el.text.strip()
                if text and "<script" in text.lower() and "src=" in text.lower():
                    logger.info(f"Extracted pixel code via {tag}: {text[:100]}")
                    return text
    except Exception:
        pass

    # Strategy 3: textarea containing script tag
    try:
        for ta in driver.find_elements(By.TAG_NAME, "textarea"):
            text = ta.get_attribute("value") or ta.text
            text = text.strip()
            if text and "<script" in text.lower() and "src=" in text.lower():
                logger.info(f"Extracted pixel code via textarea: {text[:100]}")
                return text
    except Exception:
        pass

    # Strategy 4: Full page scan for elements containing script tags
    try:
        result = driver.execute_script("""
            var all = document.querySelectorAll('pre, code, textarea, [class*="snippet"], [class*="code"]');
            for (var i = 0; i < all.length; i++) {
                var t = (all[i].textContent || all[i].value || '').trim();
                if (t && /<script[^>]+src=/i.test(t)) {
                    return t;
                }
            }
            return '';
        """)
        if result:
            logger.info(f"Extracted pixel code via page scan: {result.strip()[:100]}")
            return result.strip()
    except Exception:
        pass

    # Strategy 5: Network interceptor capture — extract the <script> tag from response
    try:
        captured = driver.execute_script(
            "return (window.__PIXEL_CAPTURED__ && window.__PIXEL_CAPTURED__.pixel) || '';"
        )
        if captured:
            match = re.search(r'<script[^>]+src=["\'][^"\']+["\'][^>]*>\s*</script>', captured, re.IGNORECASE)
            if match:
                logger.info(f"Extracted pixel code via network capture: {match.group(0)[:100]}")
                return match.group(0)
    except Exception:
        pass

    return ""


def _extract_pixel_id(pixel_code: str) -> str:
    """Extract a pixel identifier from the pixel code snippet.

    Handles multiple URL formats:
      - .../pixels/<uuid>/p.js          (identitypxl format)
      - .../idp-analytics-<hex>.min.js  (idpixel format)
      - Falls back to extracting the src URL as the ID
    """
    # Format: /pixels/<uuid>/p.js
    match = re.search(r"/pixels/([^/]+)/p\.js", pixel_code)
    if match:
        return match.group(1)
    # Format: idp-analytics-<hex>.min.js
    match = re.search(r"idp-analytics-([a-f0-9]+)\.min\.js", pixel_code)
    if match:
        return match.group(1)
    # Fallback: extract the src URL itself
    match = re.search(r'src=["\']([^"\']+)["\']', pixel_code)
    if match:
        return match.group(1).split("/")[-1].replace(".min.js", "").replace(".js", "")
    return ""

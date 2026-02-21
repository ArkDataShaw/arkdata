"""
IntentCore Pixel Deleter — Headed Selenium browser
Searches for pixels by name and deletes them.
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
PIXELS_URL = f"{WORKSPACE_URL}/pixel"


def delete_pixels(names_to_delete: list[str]):
    """Search for each pixel by name and delete it."""
    user_data_dir = tempfile.mkdtemp()
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument(f"--user-data-dir={user_data_dir}")

    logger.info("Launching Chrome...")
    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options
    )
    wait = WebDriverWait(driver, 30)

    try:
        # === Login ===
        logger.info("Navigating to login...")
        driver.get(LOGIN_URL)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))

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

        wait.until(lambda d: "/auth/" not in d.current_url)
        logger.info("Logged in successfully.")

        # === Navigate to Pixels page ===
        logger.info("Navigating to Pixels page...")
        driver.get(PIXELS_URL)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(normalize-space(.),'Create')]")
        ))
        logger.info("On Pixels page.")

        deleted = []
        not_found = []

        for name in names_to_delete:
            logger.info(f"--- Searching for pixel: '{name}' ---")

            # Find the search input
            search_input = None
            search_selectors = [
                (By.CSS_SELECTOR, "input[placeholder*='Search']"),
                (By.CSS_SELECTOR, "input[placeholder*='search']"),
                (By.CSS_SELECTOR, "input[type='search']"),
                (By.CSS_SELECTOR, "input[name='search']"),
            ]
            for by, selector in search_selectors:
                try:
                    el = driver.find_element(by, selector)
                    if el.is_displayed():
                        search_input = el
                        break
                except Exception:
                    continue

            if not search_input:
                logger.warning("Search input not found, trying to find pixel in table directly.")
            else:
                # Clear and type the pixel name
                search_input.clear()
                time.sleep(0.2)
                search_input.send_keys(name)
                time.sleep(1)  # Wait for search results to filter

            # Look for the pixel row with a matching name
            # Try to find a row/card that contains this exact name
            pixel_found = False
            try:
                # Look for a three-dot menu or delete button on the matching row
                # First find the row containing the pixel name
                rows = driver.find_elements(By.XPATH,
                    f"//tr[.//td[contains(normalize-space(.), '{name}')]] | "
                    f"//div[contains(@class, 'card') and .//text()[contains(., '{name}')]]"
                )

                if not rows:
                    # Try broader search - any element containing the name
                    rows = driver.find_elements(By.XPATH,
                        f"//*[contains(normalize-space(text()), '{name}')]/ancestor::tr"
                    )

                if rows:
                    row = rows[0]
                    pixel_found = True
                    logger.info(f"Found pixel '{name}' in table.")

                    # Look for three-dot menu / kebab menu / actions button in this row
                    action_btn = None
                    action_selectors = [
                        (By.CSS_SELECTOR, "button[aria-label*='action']"),
                        (By.CSS_SELECTOR, "button[aria-label*='menu']"),
                        (By.CSS_SELECTOR, "button[aria-label*='more']"),
                        (By.XPATH, ".//button[contains(@class, 'icon') or contains(@class, 'menu') or contains(@class, 'action')]"),
                        (By.XPATH, ".//button[.//svg]"),
                    ]
                    for by, selector in action_selectors:
                        try:
                            els = row.find_elements(by, selector)
                            for el in els:
                                if el.is_displayed():
                                    action_btn = el
                                    break
                            if action_btn:
                                break
                        except Exception:
                            continue

                    if not action_btn:
                        # Try finding any button in the row
                        btns = row.find_elements(By.TAG_NAME, "button")
                        for btn in btns:
                            if btn.is_displayed():
                                action_btn = btn
                                break

                    if action_btn:
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", action_btn)
                        time.sleep(0.3)
                        action_btn.click()
                        time.sleep(0.5)

                        # Look for Delete option in dropdown menu
                        delete_option = None
                        delete_selectors = [
                            (By.XPATH, "//div[contains(@role, 'menu')]//div[contains(normalize-space(.), 'Delete')]"),
                            (By.XPATH, "//button[contains(normalize-space(.), 'Delete')]"),
                            (By.XPATH, "//*[contains(@role, 'menuitem') and contains(normalize-space(.), 'Delete')]"),
                            (By.XPATH, "//a[contains(normalize-space(.), 'Delete')]"),
                            (By.XPATH, "//*[contains(normalize-space(text()), 'Delete')]"),
                        ]
                        for by, selector in delete_selectors:
                            try:
                                els = driver.find_elements(by, selector)
                                for el in els:
                                    if el.is_displayed():
                                        delete_option = el
                                        break
                                if delete_option:
                                    break
                            except Exception:
                                continue

                        if delete_option:
                            delete_option.click()
                            time.sleep(0.5)

                            # Confirm deletion if there's a confirmation dialog
                            confirm_selectors = [
                                (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.), 'Delete')]"),
                                (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.), 'Confirm')]"),
                                (By.XPATH, "//div[@role='dialog']//button[contains(normalize-space(.), 'Yes')]"),
                                (By.XPATH, "//div[@role='alertdialog']//button[contains(normalize-space(.), 'Delete')]"),
                            ]
                            for by, selector in confirm_selectors:
                                try:
                                    el = driver.find_element(by, selector)
                                    if el.is_displayed():
                                        el.click()
                                        logger.info(f"Confirmed deletion of '{name}'.")
                                        break
                                except Exception:
                                    continue

                            deleted.append(name)
                            logger.info(f"Deleted pixel '{name}'.")
                            time.sleep(1)
                        else:
                            logger.warning(f"Delete option not found for '{name}'.")
                            not_found.append(name)
                    else:
                        logger.warning(f"No action button found for pixel '{name}'.")
                        not_found.append(name)
                else:
                    logger.warning(f"Pixel '{name}' not found in search results.")
                    not_found.append(name)

            except Exception as e:
                logger.error(f"Error processing pixel '{name}': {e}")
                not_found.append(name)

            # Clear search for next iteration
            if search_input:
                try:
                    search_input.clear()
                    time.sleep(0.3)
                except Exception:
                    pass

        # === Summary ===
        logger.info("")
        logger.info("=" * 60)
        logger.info("  DELETION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"  Deleted: {deleted if deleted else '(none)'}")
        logger.info(f"  Not found/failed: {not_found if not_found else '(none)'}")
        logger.info("=" * 60)

        logger.info("")
        logger.info("Browser staying open for inspection. Press Ctrl+C to close.")
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("User closed.")
    except Exception as e:
        logger.error(f"Error: {e}")
        driver.save_screenshot("/tmp/intentcore_delete_fail.png")
        logger.info("Screenshot saved to /tmp/intentcore_delete_fail.png")
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
    # Default test pixel names to delete
    if len(sys.argv) > 1:
        names = sys.argv[1:]
    else:
        names = ["test", "test2", "test3", "test4", "test5"]

    logger.info(f"Will attempt to delete pixels: {names}")
    delete_pixels(names)

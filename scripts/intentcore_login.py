"""
IntentCore Login — Headed Selenium browser for app.intentcore.io
"""

import os
import time
import logging
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


def login():
    options = Options()
    # Headed mode — no --headless flag
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")

    logger.info("Launching Chrome (headed)...")
    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options
    )
    wait = WebDriverWait(driver, 30)

    try:
        logger.info(f"Navigating to {LOGIN_URL}...")
        driver.get(LOGIN_URL)

        # Enter email
        logger.info("Entering email...")
        email_input = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[type='email']")
        ))
        email_input.clear()
        email_input.send_keys(EMAIL)
        email_input.send_keys(Keys.ENTER)

        # Enter password
        logger.info("Entering password...")
        pass_input = wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "input[type='password']")
        ))
        pass_input.clear()
        pass_input.send_keys(PASSWORD)
        pass_input.send_keys(Keys.ENTER)

        # Wait for login to complete
        time.sleep(3)
        logger.info(f"Current URL after login: {driver.current_url}")

        # Navigate directly to the Ark Data workspace
        logger.info(f"Navigating to workspace: {WORKSPACE_URL}")
        driver.get(WORKSPACE_URL)
        time.sleep(3)
        logger.info(f"Landed on: {driver.current_url}")

        logger.info("Browser is open. Inspect the page manually.")
        logger.info("Press Ctrl+C in the terminal when you're done.")

        # Keep browser open until user kills the script
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("User closed. Shutting down...")
    except Exception as e:
        logger.error(f"Login failed: {e}")
        driver.save_screenshot("/tmp/intentcore_login_fail.png")
        logger.info("Screenshot saved to /tmp/intentcore_login_fail.png")
        # Keep browser open anyway so user can inspect
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        driver.quit()


if __name__ == "__main__":
    login()

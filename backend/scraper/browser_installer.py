"""
Browser installation utilities for Playwright.
"""

import subprocess
import sys
import logging
from pathlib import Path
from typing import Optional


logger = logging.getLogger(__name__)


class BrowserInstaller:
    """Handles Playwright browser installation."""
    
    @staticmethod
    def is_browser_installed(browser_type: str = "chromium") -> bool:
        """Check if the specified browser is installed."""
        try:
            from playwright.sync_api import sync_playwright
            
            with sync_playwright() as p:
                browser_launcher = getattr(p, browser_type, None)
                if browser_launcher is None:
                    return False
                
                # Try to get the executable path
                try:
                    browser_launcher.executable_path
                    return True
                except Exception:
                    return False
                    
        except Exception as e:
            logger.warning(f"Error checking browser installation: {e}")
            return False
    
    @staticmethod
    def install_browser(browser_type: str = "chromium") -> bool:
        """Install the specified browser."""
        try:
            logger.info(f"Installing Playwright {browser_type} browser...")
            
            # Run playwright install command
            result = subprocess.run(
                [sys.executable, "-m", "playwright", "install", browser_type],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.returncode == 0:
                logger.info(f"Successfully installed {browser_type} browser")
                return True
            else:
                logger.error(f"Failed to install {browser_type}: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"Browser installation timed out after 5 minutes")
            return False
        except Exception as e:
            logger.error(f"Error installing browser: {e}")
            return False
    
    @staticmethod
    def ensure_browser_installed(browser_type: str = "chromium") -> bool:
        """Ensure the browser is installed, install if necessary."""
        if BrowserInstaller.is_browser_installed(browser_type):
            logger.info(f"{browser_type} browser is already installed")
            return True
        
        logger.info(f"{browser_type} browser not found, attempting to install...")
        return BrowserInstaller.install_browser(browser_type)
    
    @staticmethod
    def get_installation_status() -> dict:
        """Get installation status for all supported browsers."""
        browsers = ["chromium", "firefox", "webkit"]
        status = {}
        
        for browser in browsers:
            status[browser] = BrowserInstaller.is_browser_installed(browser)
        
        return status
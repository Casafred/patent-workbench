"""
Browser installation manager for Playwright.

This module handles automatic browser installation and detection.
"""

import subprocess
import sys
import os
import logging
from typing import Optional, List


logger = logging.getLogger(__name__)


class BrowserInstaller:
    """Manages Playwright browser installation."""
    
    def __init__(self):
        self.supported_browsers = ["chromium", "firefox", "webkit"]
    
    def is_browser_installed(self, browser: str = "chromium") -> bool:
        """
        Check if a specific browser is installed.
        
        Args:
            browser: Browser name (chromium, firefox, webkit)
            
        Returns:
            True if browser is installed, False otherwise
        """
        try:
            # Try to import playwright and check browser
            from playwright.sync_api import sync_playwright
            
            with sync_playwright() as p:
                if browser == "chromium":
                    browser_type = p.chromium
                elif browser == "firefox":
                    browser_type = p.firefox
                elif browser == "webkit":
                    browser_type = p.webkit
                else:
                    return False
                
                # Try to launch browser to check if it's installed
                try:
                    browser_instance = browser_type.launch(headless=True)
                    browser_instance.close()
                    return True
                except Exception:
                    return False
                    
        except Exception as e:
            logger.warning(f"Could not check browser installation: {e}")
            return False
    
    def install_browser(self, browser: str = "chromium") -> bool:
        """
        Install a specific browser.
        
        Args:
            browser: Browser name to install
            
        Returns:
            True if installation successful, False otherwise
        """
        if browser not in self.supported_browsers:
            logger.error(f"Unsupported browser: {browser}")
            return False
        
        try:
            logger.info(f"Installing {browser} browser...")
            
            result = subprocess.run([
                sys.executable, "-m", "playwright", "install", browser
            ], capture_output=True, text=True, timeout=300)  # 5 minute timeout
            
            if result.returncode == 0:
                logger.info(f"Successfully installed {browser}")
                return True
            else:
                logger.error(f"Failed to install {browser}: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"Browser installation timed out for {browser}")
            return False
        except Exception as e:
            logger.error(f"Error installing {browser}: {e}")
            return False
    
    def install_all_browsers(self) -> bool:
        """
        Install all supported browsers.
        
        Returns:
            True if all installations successful, False otherwise
        """
        try:
            logger.info("Installing all Playwright browsers...")
            
            result = subprocess.run([
                sys.executable, "-m", "playwright", "install"
            ], capture_output=True, text=True, timeout=600)  # 10 minute timeout
            
            if result.returncode == 0:
                logger.info("Successfully installed all browsers")
                return True
            else:
                logger.error(f"Failed to install browsers: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("Browser installation timed out")
            return False
        except Exception as e:
            logger.error(f"Error installing browsers: {e}")
            return False
    
    def ensure_browser_available(self, browser: str = "chromium") -> bool:
        """
        Ensure a browser is available, install if necessary.
        
        Args:
            browser: Browser name to ensure is available
            
        Returns:
            True if browser is available, False otherwise
        """
        if self.is_browser_installed(browser):
            logger.info(f"{browser} is already installed")
            return True
        
        logger.info(f"{browser} not found, attempting to install...")
        return self.install_browser(browser)
    
    def get_installed_browsers(self) -> List[str]:
        """
        Get list of installed browsers.
        
        Returns:
            List of installed browser names
        """
        installed = []
        for browser in self.supported_browsers:
            if self.is_browser_installed(browser):
                installed.append(browser)
        return installed
    
    def get_installation_status(self) -> dict:
        """
        Get detailed installation status for all browsers.
        
        Returns:
            Dictionary with browser names as keys and installation status as values
        """
        status = {}
        for browser in self.supported_browsers:
            status[browser] = self.is_browser_installed(browser)
        return status


# Global installer instance
browser_installer = BrowserInstaller()


def ensure_chromium_available() -> bool:
    """
    Convenience function to ensure Chromium is available.
    
    Returns:
        True if Chromium is available, False otherwise
    """
    return browser_installer.ensure_browser_available("chromium")


def check_playwright_installation() -> bool:
    """
    Check if Playwright and at least one browser is properly installed.
    
    Returns:
        True if Playwright is ready to use, False otherwise
    """
    try:
        # Check if playwright is importable
        import playwright
        
        # Check if at least one browser is installed
        installed_browsers = browser_installer.get_installed_browsers()
        if installed_browsers:
            logger.info(f"Playwright ready with browsers: {installed_browsers}")
            return True
        else:
            logger.warning("Playwright installed but no browsers found")
            return False
            
    except ImportError:
        logger.error("Playwright not installed")
        return False
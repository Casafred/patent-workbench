#!/usr/bin/env python3
"""
Playwright browser installation script.

Run this script to install Playwright browsers:
python install_browsers.py
"""

import sys
import logging
from backend.scraper.browser_installer import BrowserInstaller

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main installation function."""
    print("=== Playwright Browser Installation ===")
    print()
    
    # Check current status
    print("Checking current browser installation status...")
    status = BrowserInstaller.get_installation_status()
    
    for browser, installed in status.items():
        status_text = "✓ Installed" if installed else "✗ Not installed"
        print(f"  {browser}: {status_text}")
    
    print()
    
    # Install missing browsers
    browsers_to_install = [browser for browser, installed in status.items() if not installed]
    
    if not browsers_to_install:
        print("All browsers are already installed!")
        return True
    
    print(f"Installing missing browsers: {', '.join(browsers_to_install)}")
    print()
    
    success = True
    for browser in browsers_to_install:
        print(f"Installing {browser}...")
        if BrowserInstaller.install_browser(browser):
            print(f"✓ {browser} installed successfully")
        else:
            print(f"✗ Failed to install {browser}")
            success = False
        print()
    
    if success:
        print("🎉 All browsers installed successfully!")
    else:
        print("⚠️  Some browsers failed to install. Check the logs above.")
    
    return success


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nInstallation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Installation failed: {e}")
        sys.exit(1)
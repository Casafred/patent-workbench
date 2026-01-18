"""
Anti-detection manager for enhanced patent scraping.

This module implements various anti-detection techniques to avoid bot detection.
"""

import random
import asyncio
import logging
from typing import Dict, List, Any, Optional
from fake_useragent import UserAgent

from .config import ScrapingConfig
from .constants import USER_AGENTS, VIEWPORT_SIZES

logger = logging.getLogger(__name__)


class AntiDetectionManager:
    """Manages anti-detection strategies for web scraping."""
    
    def __init__(self, config: ScrapingConfig):
        self.config = config
        self.user_agents = USER_AGENTS.copy()
        self.viewport_sizes = VIEWPORT_SIZES.copy()
        self._ua_generator = None
        self._current_user_agent = None
        self._current_viewport = None
        
        # Initialize fake user agent generator
        try:
            self._ua_generator = UserAgent()
            logger.info("Fake UserAgent generator initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize fake UserAgent: {e}")
            self._ua_generator = None
    
    def get_random_user_agent(self) -> str:
        """Get a random User-Agent string."""
        if not self.config.user_agent_rotation:
            return self.user_agents[0]
        
        # Try to use fake_useragent first for more variety
        if self._ua_generator:
            try:
                # Get a random Chrome user agent
                ua = self._ua_generator.chrome
                if ua and len(ua) > 50:  # Basic validation
                    self._current_user_agent = ua
                    return ua
            except Exception as e:
                logger.warning(f"Failed to get fake user agent: {e}")
        
        # Fallback to predefined list
        ua = random.choice(self.user_agents)
        self._current_user_agent = ua
        return ua
    
    def get_random_viewport(self) -> Dict[str, int]:
        """Get a random viewport size."""
        if not self.config.viewport_randomization:
            return self.viewport_sizes[0]
        
        viewport = random.choice(self.viewport_sizes)
        self._current_viewport = viewport
        return viewport
    
    def get_random_screen_resolution(self) -> Dict[str, int]:
        """Get a random screen resolution that matches the viewport."""
        viewport = self._current_viewport or self.get_random_viewport()
        
        # Generate screen resolution larger than viewport
        width_multiplier = random.uniform(1.0, 1.5)
        height_multiplier = random.uniform(1.0, 1.3)
        
        return {
            "width": int(viewport["width"] * width_multiplier),
            "height": int(viewport["height"] * height_multiplier)
        }
    
    def get_stealth_headers(self) -> Dict[str, str]:
        """Get HTTP headers that mimic a real browser."""
        headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": random.choice([
                "en-US,en;q=0.9",
                "en-US,en;q=0.8,zh-CN;q=0.7,zh;q=0.6",
                "en-GB,en;q=0.9,en-US;q=0.8"
            ]),
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0"
        }
        
        # Add DNT header randomly
        if random.random() < 0.3:
            headers["DNT"] = "1"
        
        return headers
    
    async def apply_stealth_settings(self, page) -> None:
        """Apply comprehensive stealth settings to a page."""
        try:
            # Remove webdriver property
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            """)
            
            # Override plugins
            await page.add_init_script("""
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
                            description: "Portable Document Format",
                            filename: "internal-pdf-viewer",
                            length: 1,
                            name: "Chrome PDF Plugin"
                        },
                        {
                            0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
                            description: "",
                            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                            length: 1,
                            name: "Chrome PDF Viewer"
                        }
                    ],
                });
            """)
            
            # Override languages
            await page.add_init_script("""
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
            """)
            
            # Override permissions
            await page.add_init_script("""
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            """)
            
            # Override chrome runtime
            await page.add_init_script("""
                if (window.chrome) {
                    Object.defineProperty(window.chrome, 'runtime', {
                        get: () => ({
                            onConnect: undefined,
                            onMessage: undefined,
                            connect: undefined,
                            sendMessage: undefined,
                        }),
                    });
                }
            """)
            
            # Mock hardware concurrency
            await page.add_init_script(f"""
                Object.defineProperty(navigator, 'hardwareConcurrency', {{
                    get: () => {random.choice([2, 4, 8, 12, 16])},
                }});
            """)
            
            # Mock device memory
            await page.add_init_script(f"""
                Object.defineProperty(navigator, 'deviceMemory', {{
                    get: () => {random.choice([2, 4, 8, 16])},
                }});
            """)
            
            # Override screen properties
            screen_res = self.get_random_screen_resolution()
            viewport = self._current_viewport or self.get_random_viewport()
            
            await page.add_init_script(f"""
                Object.defineProperty(screen, 'width', {{
                    get: () => {screen_res['width']},
                }});
                Object.defineProperty(screen, 'height', {{
                    get: () => {screen_res['height']},
                }});
                Object.defineProperty(screen, 'availWidth', {{
                    get: () => {screen_res['width']},
                }});
                Object.defineProperty(screen, 'availHeight', {{
                    get: () => {screen_res['height'] - 40},
                }});
            """)
            
            logger.info("Stealth settings applied successfully")
            
        except Exception as e:
            logger.error(f"Failed to apply stealth settings: {e}")
    
    async def simulate_human_behavior(self, page) -> None:
        """Simulate human-like behavior patterns."""
        try:
            # Random mouse movements
            await self._simulate_mouse_movements(page)
            
            # Random scrolling
            await self._simulate_scrolling(page)
            
            # Random delays
            await self._add_random_delay()
            
            logger.info("Human behavior simulation completed")
            
        except Exception as e:
            logger.error(f"Failed to simulate human behavior: {e}")
    
    async def _simulate_mouse_movements(self, page) -> None:
        """Simulate random mouse movements."""
        try:
            viewport = self._current_viewport or self.get_random_viewport()
            
            # Generate random mouse positions
            positions = []
            for _ in range(random.randint(2, 5)):
                x = random.randint(50, viewport["width"] - 50)
                y = random.randint(50, viewport["height"] - 50)
                positions.append((x, y))
            
            # Move mouse to random positions
            for x, y in positions:
                await page.mouse.move(x, y)
                await asyncio.sleep(random.uniform(0.1, 0.3))
                
        except Exception as e:
            logger.warning(f"Mouse movement simulation failed: {e}")
    
    async def _simulate_scrolling(self, page) -> None:
        """Simulate random scrolling behavior."""
        try:
            # Random scroll actions
            scroll_actions = random.randint(1, 3)
            
            for _ in range(scroll_actions):
                # Random scroll distance
                scroll_y = random.randint(100, 500)
                
                await page.evaluate(f"window.scrollBy(0, {scroll_y})")
                await asyncio.sleep(random.uniform(0.5, 1.5))
                
                # Sometimes scroll back up
                if random.random() < 0.3:
                    await page.evaluate(f"window.scrollBy(0, -{scroll_y // 2})")
                    await asyncio.sleep(random.uniform(0.3, 0.8))
                    
        except Exception as e:
            logger.warning(f"Scrolling simulation failed: {e}")
    
    async def _add_random_delay(self) -> None:
        """Add random delay to mimic human thinking time."""
        delay = random.uniform(0.5, 2.0)
        await asyncio.sleep(delay)
    
    def get_browser_launch_args(self) -> List[str]:
        """Get browser launch arguments for anti-detection."""
        args = [
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=VizDisplayCompositor",
            "--disable-web-security",
            "--disable-features=TranslateUI",
            "--disable-ipc-flooding-protection",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--disable-client-side-phishing-detection",
            "--disable-sync",
            "--disable-default-apps",
            "--disable-extensions",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-dev-shm-usage",
            "--disable-gpu-sandbox",
            "--disable-software-rasterizer"
        ]
        
        # Add random window size
        viewport = self.get_random_viewport()
        args.append(f"--window-size={viewport['width']},{viewport['height']}")
        
        return args
    
    def get_context_options(self) -> Dict[str, Any]:
        """Get browser context options with anti-detection settings."""
        user_agent = self.get_random_user_agent()
        viewport = self.get_random_viewport()
        headers = self.get_stealth_headers()
        
        options = {
            "user_agent": user_agent,
            "viewport": viewport,
            "extra_http_headers": headers,
            "java_script_enabled": self.config.javascript_enabled,
            "ignore_https_errors": True,
            "bypass_csp": True,
            "locale": "en-US",
            "timezone_id": "America/New_York"
        }
        
        logger.info(f"Context options prepared with UA: {user_agent[:50]}...")
        return options
    
    def should_rotate_identity(self, request_count: int) -> bool:
        """Determine if identity should be rotated based on request count."""
        # Rotate identity every 10-20 requests
        rotation_threshold = random.randint(10, 20)
        return request_count > 0 and request_count % rotation_threshold == 0
    
    def get_current_identity(self) -> Dict[str, Any]:
        """Get current browser identity information."""
        return {
            "user_agent": self._current_user_agent,
            "viewport": self._current_viewport,
            "screen_resolution": self.get_random_screen_resolution() if self._current_viewport else None
        }
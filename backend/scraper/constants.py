"""
Constants and configuration data for the enhanced patent scraper.
"""

# User agents for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
]

# Viewport sizes for randomization
VIEWPORT_SIZES = [
    {"width": 1920, "height": 1080},
    {"width": 1366, "height": 768},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1280, "height": 720},
    {"width": 1600, "height": 900},
    {"width": 1024, "height": 768}
]

# Google Patents URL patterns
GOOGLE_PATENTS_BASE_URL = "https://patents.google.com"
GOOGLE_PATENTS_PATENT_URL = "https://patents.google.com/patent/{patent_id}"
GOOGLE_PATENTS_XHR_URL = "https://patents.google.com/xhr/result?id={patent_id}/en"

# CSS selectors for data extraction
SELECTORS = {
    "title": "h1, [data-proto='title']",
    "abstract": "#abstract, [data-proto='abstract'], .abstract",
    "inventors": "[data-proto='inventor'] span, #inventor span",
    "assignees": "[data-proto='assignee'] span, #assignee span",
    "claims": "#claims .claim, #claims p, [data-proto='claims'] .claim",
    "description": "#description p, [data-proto='description'] p",
    "application_date": "[data-proto='application_date'], .application-date",
    "publication_date": "[data-proto='publication_date'], .publication-date"
}

# Error messages
ERROR_MESSAGES = {
    "patent_not_found": "Patent not found or does not exist",
    "network_error": "Network error occurred while fetching patent data",
    "parsing_error": "Error parsing patent data from page",
    "timeout_error": "Request timed out while loading patent page",
    "anti_detection_error": "Anti-bot detection triggered",
    "rate_limit_error": "Rate limit exceeded, please try again later",
    "browser_error": "Browser initialization or operation failed"
}

# HTTP status codes that should trigger retries
RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

# HTTP status codes that indicate the patent doesn't exist
NOT_FOUND_STATUS_CODES = [404, 410]
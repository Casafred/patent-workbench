---
name: "performance-optimizer"
description: "Analyzes and optimizes code performance, identifies bottlenecks, and improves efficiency. Invoke when user reports slow performance or wants optimization."
---

# Performance Optimizer Skill

This skill helps you analyze and optimize code performance, identify bottlenecks, and improve efficiency.

## When to Invoke

- User reports slow performance
- User wants to optimize code
- Page load or API response is slow
- Memory usage is high
- User wants to improve user experience

## Performance Analysis Workflow

### 1. Measure First
```javascript
// Frontend timing
console.time('operation');
// ... code to measure
console.timeEnd('operation');

// Performance API
performance.mark('start');
// ... code
performance.mark('end');
performance.measure('operation', 'start', 'end');
```

```python
# Backend timing
import time
start = time.time()
# ... code
elapsed = time.time() - start
print(f"Operation took {elapsed:.2f}s")
```

### 2. Identify Bottlenecks
- Network requests (slow APIs)
- Database queries (N+1 problems)
- Large data processing
- DOM manipulation (frontend)
- Memory leaks

### 3. Optimize
- Cache frequently used data
- Lazy load components
- Batch operations
- Use pagination
- Optimize algorithms

## Common Optimizations

### Frontend

#### Debounce/Throttle
```javascript
// Debounce: Wait until user stops
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Throttle: Limit rate
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage
input.addEventListener('input', debounce(search, 300));
```

#### Lazy Loading
```javascript
// Intersection Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadImage(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

#### Virtual Scrolling
```javascript
// Only render visible items
class VirtualList {
  constructor(container, itemHeight) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleStart = 0;
    this.visibleEnd = Math.ceil(containerHeight / itemHeight);
  }
  
  render(items) {
    const visible = items.slice(this.visibleStart, this.visibleEnd);
    // Render only visible items
  }
}
```

### Backend

#### Database Optimization
```python
# Bad: N+1 queries
for patent in patents:
    claims = db.query(f"SELECT * FROM claims WHERE patent_id = {patent.id}")

# Good: Single query with join
patents_with_claims = db.query("""
    SELECT p.*, c.* 
    FROM patents p 
    LEFT JOIN claims c ON p.id = c.patent_id
""")

# Use indexes
# CREATE INDEX idx_patent_id ON claims(patent_id);
```

#### Caching
```python
from functools import lru_cache
from flask_caching import Cache

# Simple cache
@lru_cache(maxsize=128)
def expensive_function(param):
    # Expensive computation
    return result

# Flask cache
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})

@cache.cached(timeout=300)
def get_patent_data(patent_id):
    # Cached for 5 minutes
    return fetch_patent(patent_id)
```

#### Async Processing
```python
# Bad: Blocking
def process_batch(items):
    results = []
    for item in items:
        results.append(process(item))  # Blocks
    return results

# Good: Async
import asyncio

async def process_batch(items):
    tasks = [process_async(item) for item in items]
    return await asyncio.gather(*tasks)
```

## Performance Metrics

### Frontend
| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.8s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.8s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

### Backend
| Metric | Target | Tool |
|--------|--------|------|
| API Response Time | < 200ms | Logging |
| Database Query | < 50ms | EXPLAIN |
| Memory Usage | < 80% | Monitoring |

## Optimization Checklist

- [ ] Measured baseline performance
- [ ] Identified bottlenecks
- [ ] Applied targeted optimizations
- [ ] Measured improvement
- [ ] Tested for regressions
- [ ] Documented changes

## Quick Wins

1. **Enable compression** (gzip/brotli)
2. **Use CDN** for static assets
3. **Minimize HTTP requests**
4. **Optimize images** (WebP, lazy load)
5. **Cache API responses**
6. **Use connection pooling**
7. **Add database indexes**

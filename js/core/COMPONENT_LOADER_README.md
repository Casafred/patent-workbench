# Component Loader Module

## Overview

The Component Loader module (`js/core/component-loader.js`) provides functionality for dynamically loading HTML components into the page. It supports both asynchronous and synchronous loading with built-in error handling and retry logic.

## Features

- ✅ Async component loading with `fetch` API
- ✅ Sync component loading with XMLHttpRequest
- ✅ Automatic retry with exponential backoff
- ✅ Error handling for missing files and network failures
- ✅ User-friendly error messages displayed in UI
- ✅ Batch loading support
- ✅ Comprehensive logging for debugging

## API Reference

### `loadComponent(componentPath, targetElementId, retryCount = 3)`

Asynchronously loads an HTML component and injects it into the target element.

**Parameters:**
- `componentPath` (string): Relative path to the component file
- `targetElementId` (string): ID of the target DOM element
- `retryCount` (number, optional): Number of retry attempts (default: 3)

**Returns:** `Promise<boolean>` - `true` on success, `false` on failure

**Example:**
```javascript
// Load a component
const success = await loadComponent('frontend/components/header.html', 'header-component');
if (success) {
    console.log('Header loaded successfully');
}
```

### `loadComponentSync(componentPath, targetElementId)`

Synchronously loads an HTML component. Use only when necessary; async loading is recommended.

**Parameters:**
- `componentPath` (string): Relative path to the component file
- `targetElementId` (string): ID of the target DOM element

**Returns:** `boolean` - `true` on success, `false` on failure

**Example:**
```javascript
// Synchronous loading (blocks execution)
const success = loadComponentSync('frontend/components/navigation.html', 'nav-component');
```

### `loadComponents(components)`

Loads multiple components in parallel.

**Parameters:**
- `components` (Array): Array of component configurations
  - Each item: `{ path: string, targetId: string }`

**Returns:** `Promise<Object>` - Statistics object with `total`, `success`, and `failed` counts

**Example:**
```javascript
const components = [
    { path: 'frontend/components/header.html', targetId: 'header' },
    { path: 'frontend/components/footer.html', targetId: 'footer' }
];

const stats = await loadComponents(components);
console.log(`Loaded ${stats.success}/${stats.total} components`);
```

## Error Handling

### Missing Target Element
If the target element doesn't exist, the function logs an error and returns `false`.

```javascript
const result = await loadComponent('component.html', 'nonexistent-id');
// Console: [Component Loader] 目标元素未找到: nonexistent-id
// Returns: false
```

### Missing Component File
If the component file doesn't exist (404), the loader will:
1. Retry up to 3 times with exponential backoff
2. Display an error message in the target element
3. Return `false`

### Network Failures
Network errors trigger the retry logic:
- **Attempt 1 fails**: Wait 200ms, retry
- **Attempt 2 fails**: Wait 400ms, retry
- **Attempt 3 fails**: Display error, return `false`

## Retry Logic

The retry mechanism uses exponential backoff:

```javascript
delay = Math.pow(2, attempt) * 100
```

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1       | 0ms (immediate)   |
| 2       | 200ms             |
| 3       | 400ms             |

## Testing

A comprehensive test suite is available at `tests/test_component_loader.html`.

**To run tests:**
1. Open `tests/test_component_loader.html` in a browser
2. Click the test buttons to verify functionality
3. Check the console log for detailed output

**Test Coverage:**
- ✅ Async loading (success case)
- ✅ Async loading (missing file)
- ✅ Sync loading
- ✅ Missing target element
- ✅ Batch loading

## Usage in Main Application

```javascript
// In main.js or initialization code
document.addEventListener('DOMContentLoaded', async () => {
    // Load core components
    await loadComponent('frontend/components/header.html', 'header-component');
    await loadComponent('frontend/components/tab-navigation.html', 'tab-navigation-component');
    
    // Initialize the rest of the application
    initializeApp();
});
```

## Requirements Validation

This module satisfies the following requirements:

- **Requirement 1.2**: Dynamic component loading and assembly
- **Requirement 5.1**: Module loading strategy implementation
- **Requirement 5.5**: Clear error messages for missing dependencies
- **Requirement 7.2**: Preserves UI interactions and behaviors

## File Size

Current implementation: ~140 lines (well under the 500-line limit)

## Dependencies

None - This is a core module with no external dependencies.

## Browser Compatibility

- Modern browsers with `fetch` API support
- Fallback to XMLHttpRequest for sync loading
- IE11+ (with polyfills for fetch if needed)

## Best Practices

1. **Prefer async loading**: Use `loadComponent` over `loadComponentSync`
2. **Handle failures gracefully**: Always check return values
3. **Use batch loading**: For multiple components, use `loadComponents` for better performance
4. **Provide user feedback**: The module automatically displays error messages in the UI

## Troubleshooting

**Component not loading?**
- Check the component path is correct (relative to project root)
- Verify the target element ID exists in the DOM
- Check browser console for detailed error messages
- Ensure the component file exists and is accessible

**Slow loading?**
- Check network conditions
- Verify server is responding correctly
- Consider using batch loading for multiple components

## Future Enhancements

Potential improvements for future versions:
- Component caching to avoid redundant loads
- Dependency resolution for component chains
- Template variable substitution
- Component lifecycle hooks (onLoad, onError)

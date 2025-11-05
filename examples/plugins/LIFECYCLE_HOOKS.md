# Plugin Lifecycle Hooks Guide

This guide explains how to use lifecycle hooks in GenAIScript plugins to execute code at specific points during script execution.

## Overview

Lifecycle hooks allow plugins to:
- Initialize resources before script execution (beforeRun)
- Clean up resources after script execution (afterRun)
- Handle errors during script execution (onError)

## Available Hooks

### beforeRun Hook

Called before a script execution starts. Use this for:
- Loading configuration
- Setting up database connections
- Initializing external services
- Starting timers

```javascript
export default {
    name: 'my-plugin',
    setup(extend, hooks) {
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push(async (context) => {
            console.log(`Starting script: ${context.scriptName}`)
            // Initialize resources
            context.startTime = Date.now()
        })
    }
}
```

**Important**: If a beforeRun hook throws an error, script execution stops immediately.

### afterRun Hook

Called after a script execution completes. Use this for:
- Closing database connections
- Flushing logs
- Cleaning up temporary files
- Sending analytics

```javascript
export default {
    name: 'my-plugin',
    setup(extend, hooks) {
        hooks.afterRun = hooks.afterRun || []
        hooks.afterRun.push(async (context) => {
            const duration = Date.now() - context.startTime
            console.log(`Script completed in ${duration}ms`)
            // Clean up resources
        })
    }
}
```

**Important**: afterRun hooks are resilient - errors are logged but don't stop execution.

### onError Hook

Called when an error occurs during script execution. Use this for:
- Logging errors to external services
- Sending error notifications
- Creating bug reports
- Performing recovery actions

```javascript
export default {
    name: 'my-plugin',
    setup(extend, hooks) {
        hooks.onError = hooks.onError || []
        hooks.onError.push(async (context) => {
            console.error(`Error: ${context.error.message}`)
            // Log to error tracking service
        })
    }
}
```

**Important**: onError hooks are resilient - errors are logged but don't stop execution.

## Lifecycle Context

The context object passed to lifecycle hooks contains:

```typescript
interface PluginLifecycleContext {
    scriptName?: string      // Name of the script being executed
    [key: string]: any       // Additional context data
}

interface PluginErrorContext extends PluginLifecycleContext {
    error: Error            // The error that occurred
}
```

You can add your own properties to the context:

```javascript
hooks.beforeRun.push((context) => {
    context.customData = { foo: 'bar' }
    context.startTime = Date.now()
})

hooks.afterRun.push((context) => {
    // Access custom data from beforeRun
    console.log(context.customData)
})
```

## Multiple Hooks

Plugins can register multiple lifecycle hooks:

```javascript
export default {
    name: 'multi-hook-plugin',
    setup(extend, hooks) {
        // First beforeRun hook
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log('First beforeRun')
        })
        
        // Second beforeRun hook
        hooks.beforeRun.push((context) => {
            console.log('Second beforeRun')
        })
        
        // Both will execute in order
    }
}
```

## Hook Execution Order

When multiple plugins register hooks, they execute in **plugin priority order**:

```javascript
// Plugin with priority 100 (runs first)
export const highPriorityPlugin = {
    name: 'high-priority',
    priority: 100,
    setup(extend, hooks) {
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push(() => console.log('First'))
    }
}

// Plugin with priority 10 (runs later)
export const lowPriorityPlugin = {
    name: 'low-priority',
    priority: 10,
    setup(extend, hooks) {
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push(() => console.log('Second'))
    }
}
```

Output:
```
First
Second
```

## Async Hooks

All lifecycle hooks support async operations:

```javascript
hooks.beforeRun.push(async (context) => {
    // Wait for database connection
    context.db = await connectToDatabase()
})

hooks.afterRun.push(async (context) => {
    // Close database connection
    await context.db.close()
})
```

## Error Handling

### beforeRun Errors

If a beforeRun hook throws an error, execution stops:

```javascript
hooks.beforeRun.push(() => {
    throw new Error('Initialization failed')
})
// Script execution will not start
```

### afterRun/onError Errors

If afterRun or onError hooks throw errors, they are logged but don't stop other hooks:

```javascript
hooks.afterRun.push(() => {
    throw new Error('Cleanup failed')
})
// Error is logged, but other afterRun hooks still execute
```

## Best Practices

1. **Keep hooks fast**: Slow hooks delay script execution
2. **Handle errors gracefully**: Especially in afterRun and onError hooks
3. **Use context for state**: Share data between hooks via context
4. **Clean up resources**: Use afterRun to prevent resource leaks
5. **Be defensive**: Check for undefined values before using them

## Examples

See these example plugins:

- `lifecycle-example-plugin.js` - Complete lifecycle hook examples
- `priority-dependency-example.js` - Hook execution order examples

## Testing Lifecycle Hooks

When testing plugins with lifecycle hooks:

```javascript
import { loadPlugin, executeBeforeRunHooks, executeAfterRunHooks } from 'genaiscript/plugin'

// Load plugin
const plugin = await loadPlugin('./my-plugin.js', projectRoot)

// Test beforeRun
const context = { scriptName: 'test-script' }
await executeBeforeRunHooks([plugin], context)

// Test afterRun
await executeAfterRunHooks([plugin], context)

// Test onError
const errorContext = { ...context, error: new Error('Test error') }
await executeErrorHooks([plugin], errorContext)
```

## API Reference

### executeBeforeRunHooks

```typescript
async function executeBeforeRunHooks(
    plugins: LoadedPlugin[],
    context: PluginLifecycleContext
): Promise<void>
```

Executes all beforeRun hooks from the given plugins.

### executeAfterRunHooks

```typescript
async function executeAfterRunHooks(
    plugins: LoadedPlugin[],
    context: PluginLifecycleContext
): Promise<void>
```

Executes all afterRun hooks from the given plugins.

### executeErrorHooks

```typescript
async function executeErrorHooks(
    plugins: LoadedPlugin[],
    context: PluginErrorContext
): Promise<void>
```

Executes all onError hooks from the given plugins.

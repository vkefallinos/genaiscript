# Plugin Conflict Resolution Guide

This guide explains how to handle conflicts when multiple plugins extend the same context properties.

## Overview

When multiple plugins try to extend the same property (e.g., `context.global.myFunction`), the plugin system needs to decide what to do. GenAIScript provides four conflict resolution strategies.

## Conflict Resolution Strategies

### 1. WARN_OVERRIDE (Default)

Warns when a conflict occurs but allows the override. The last plugin wins.

```javascript
export default {
    name: 'my-plugin',
    conflictResolution: 'warn_override', // This is the default
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.myFunction = () => 'my implementation'
        })
    }
}
```

**When to use:**
- During development when you want to be notified of conflicts
- When you expect conflicts and want the newest plugin to win
- Default behavior - safe for most cases

**Output:**
```
[Plugin Warning] Plugin 'plugin2' is overriding 'global.myFunction' previously set by plugin 'plugin1'
```

### 2. ERROR

Throws an error when a conflict is detected. Stops plugin loading.

```javascript
export default {
    name: 'critical-plugin',
    conflictResolution: 'error',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.criticalFunction = () => 'cannot be overridden'
        })
    }
}
```

**When to use:**
- For critical functionality that must not be overridden
- When you want to enforce strict plugin compatibility
- In production when conflicts indicate a configuration error

**Output:**
```
Error: Plugin 'plugin2' is overriding 'global.criticalFunction' previously set by plugin 'critical-plugin'
```

### 3. MERGE

Deep merges compatible types (objects and arrays).

```javascript
export default {
    name: 'merge-plugin',
    conflictResolution: 'merge',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            
            // This object will be merged with other plugins
            context.global.config = {
                option1: true,
                nested: {
                    value: 'from merge-plugin'
                }
            }
        })
    }
}
```

**Merge Behavior:**

**Objects:**
```javascript
// Plugin 1
{ option1: true, shared: 'plugin1' }

// Plugin 2 (merge strategy)
{ option2: false, shared: 'plugin2' }

// Result
{ option1: true, option2: false, shared: 'plugin2' }
// Note: Last value wins for overlapping properties
```

**Arrays:**
```javascript
// Plugin 1
['item1', 'item2']

// Plugin 2 (merge strategy)
['item3', 'item4']

// Result
['item1', 'item2', 'item3', 'item4']
```

**When to use:**
- For configuration objects that should be combined
- For arrays of validators, handlers, or plugins
- When you want additive behavior rather than replacement

### 4. PRIORITY

Higher priority plugins override lower priority plugins.

```javascript
export default {
    name: 'high-priority-plugin',
    priority: 100,
    conflictResolution: 'priority',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.myFunction = () => 'high priority implementation'
        })
    }
}
```

**When to use:**
- When you want explicit control over which plugin wins
- For framework plugins that should override user plugins
- When combined with dependency management

## Conflict Detection

The system tracks which plugin set each property:

```javascript
// Plugin 1 sets global.myFunction
// Plugin 2 tries to set global.myFunction
// → Conflict detected at 'global.myFunction'
```

Conflicts are detected for:
- `context.global` properties
- `context.host` properties
- `context.workspace` properties
- `context.parsers` properties

## Avoiding Conflicts

### 1. Use Namespacing

Prefix your properties with your plugin name:

```javascript
export default {
    name: 'my-plugin',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            
            // Good: Namespaced
            context.global.myPluginUtils = {
                format: () => {},
                parse: () => {}
            }
            
            // Risky: Generic name
            // context.global.utils = {}
        })
    }
}
```

### 2. Check Before Setting

Check if a property exists before setting it:

```javascript
extend((context) => {
    if (!context.global) context.global = {}
    
    if (context.global.logger) {
        // Property already exists, don't override
        console.log('Logger already provided by another plugin')
    } else {
        context.global.logger = myLogger
    }
})
```

### 3. Use Plugin Dependencies

Declare dependencies to ensure load order:

```javascript
export default {
    name: 'my-plugin',
    dependencies: ['base-plugin'],
    setup(extend, hooks) {
        extend((context) => {
            // base-plugin loaded first, safe to use its properties
            const baseUtils = context.global.baseUtils
            
            // Extend rather than replace
            context.global.baseUtils = {
                ...baseUtils,
                additionalMethod: () => {}
            }
        })
    }
}
```

## Strategy Selection Guide

Choose your strategy based on your needs:

| Strategy | Use Case | Risk | Best For |
|----------|----------|------|----------|
| WARN_OVERRIDE | Development, prototyping | Low | Default choice |
| ERROR | Production, critical code | High | Framework plugins |
| MERGE | Combining configs | Medium | Configuration objects |
| PRIORITY | Controlled override | Low | Multi-environment |

## Examples

### Example 1: Configuration Merging

```javascript
// Base configuration plugin
export const baseConfigPlugin = {
    name: 'base-config',
    priority: 100,
    conflictResolution: 'merge',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.config = {
                timeout: 5000,
                retries: 3,
                features: {
                    logging: true
                }
            }
        })
    }
}

// Environment-specific plugin
export const devConfigPlugin = {
    name: 'dev-config',
    priority: 50,
    conflictResolution: 'merge',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.config = {
                timeout: 30000, // Override timeout for dev
                features: {
                    debugging: true // Add debugging feature
                }
            }
        })
    }
}

// Result: Merged configuration
// {
//     timeout: 30000,
//     retries: 3,
//     features: {
//         logging: true,
//         debugging: true
//     }
// }
```

### Example 2: Priority-Based Override

```javascript
// Framework plugin (high priority)
export const frameworkPlugin = {
    name: 'framework',
    priority: 1000,
    conflictResolution: 'priority',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.request = frameworkRequest
        })
    }
}

// User plugin (low priority, will be overridden)
export const userPlugin = {
    name: 'user-plugin',
    priority: 10,
    conflictResolution: 'priority',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.request = userRequest // Will be overridden
        })
    }
}
```

### Example 3: Error on Critical Conflicts

```javascript
export const authPlugin = {
    name: 'auth-plugin',
    conflictResolution: 'error',
    setup(extend, hooks) {
        extend((context) => {
            if (!context.global) context.global = {}
            // This must not be overridden
            context.global.authenticate = secureAuthFunction
        })
    }
}
```

## Testing Conflict Resolution

Test your plugin's conflict behavior:

```javascript
import { loadPlugins, applyPluginExtensions } from 'genaiscript/plugin'

// Test with conflicting plugins
const plugins = await loadPlugins([
    './plugin1.js',
    './plugin2.js' // Sets same property as plugin1
], projectRoot)

const context = {}
try {
    applyPluginExtensions(plugins, context)
    console.log('No conflict or conflict resolved')
} catch (error) {
    console.error('Conflict error:', error.message)
}
```

## API Reference

### ConflictResolutionStrategy Enum

```typescript
enum ConflictResolutionStrategy {
    WARN_OVERRIDE = "warn_override",
    ERROR = "error",
    MERGE = "merge",
    PRIORITY = "priority"
}
```

## See Also

- `conflict-resolution-example.js` - Complete examples of all strategies
- `priority-dependency-example.js` - Priority-based resolution examples
- `LIFECYCLE_HOOKS.md` - Lifecycle hooks guide

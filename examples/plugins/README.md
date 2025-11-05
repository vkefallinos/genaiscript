# GenAIScript Plugin Examples

This directory contains example plugins demonstrating how to extend GenAIScript's functionality.

## Plugin System Overview

The GenAIScript plugin system allows you to extend core contexts (global, host, workspace, parsers) through a simple API.

## Creating a Plugin

A plugin is a JavaScript/TypeScript module that exports a plugin definition:

```javascript
export default {
    name: 'my-plugin',
    setup(extend, hooks, options) {
        // Add extensions
        extend((context) => {
            context.global.myFunction = () => { /* ... */ }
        })
        
        // Register lifecycle hooks (optional)
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log('Plugin initializing...')
        })
    }
}
```

## Using Plugins

Add plugins to your `genaiscript.config.json`:

```json
{
    "plugins": [
        "./plugins/my-plugin.js",
        "genaiscript-plugin-database"
    ]
}
```

### Local Plugins

Local plugins are specified using relative paths:
- `./plugins/my-plugin.js`
- `../shared/plugin.mjs`

### npm Plugins

npm plugins are specified by package name:
- `genaiscript-plugin-database`
- `@scope/genaiscript-plugin`

## Plugin API

### Plugin Definition

```typescript
interface PluginDefinition {
    name: string
    setup: (extend, hooks, options?) => void | Promise<void>
    priority?: number  // Higher priority plugins load first (default: 0)
    conflictResolution?: 'warn_override' | 'error' | 'merge' | 'priority'
    dependencies?: string[]  // Names of plugins that must load first
}
```

### Extension Context

The context object passed to extension callbacks contains:

- `context.global` - Global context extensions
- `context.host` - Host context extensions
- `context.workspace` - Workspace context extensions
- `context.parsers` - Parser context extensions

### Example Plugin

See `example-plugin.mjs` for a complete example that demonstrates:
- Adding custom global functions
- Registering custom file parsers
- Extending workspace functionality
- Adding host services

## Running the Example

1. Add the plugin to your configuration:
   ```json
   {
       "plugins": ["./examples/plugins/example-plugin.mjs"]
   }
   ```

2. The plugin will be loaded automatically when GenAIScript starts.

3. Your custom extensions will be available in your scripts.

## Plugin Examples

### Basic Examples
- `example-plugin.mjs` - Complete example showing all extension points
- `global-utils-plugin.js` - Utility functions for global context
- `custom-parser-plugin.js` - Custom file format parser
- `host-capabilities-plugin.js` - Host service extensions

### Advanced Examples
- `lifecycle-example-plugin.js` - Demonstrates lifecycle hooks (beforeRun, afterRun, onError)
- `conflict-resolution-example.js` - Shows all conflict resolution strategies
- `priority-dependency-example.js` - Plugin ordering and dependencies

## Guides

- [LIFECYCLE_HOOKS.md](./LIFECYCLE_HOOKS.md) - Complete guide to lifecycle hooks
- [CONFLICT_RESOLUTION.md](./CONFLICT_RESOLUTION.md) - Handling property conflicts

## Best Practices

1. **Naming**: Use descriptive, unique names for your plugins
2. **Namespacing**: Prefix properties to avoid conflicts (e.g., `myPluginUtils`)
3. **Error Handling**: Handle errors gracefully in your plugin code
4. **Documentation**: Document your plugin's API for users
5. **Testing**: Write tests for your plugin functionality
6. **Type Safety**: Provide TypeScript definitions when possible
7. **Async Setup**: Use async setup if you need to perform I/O operations
8. **Lifecycle Hooks**: Use beforeRun for initialization, afterRun for cleanup
9. **Conflict Strategy**: Choose appropriate conflict resolution strategy
10. **Dependencies**: Declare dependencies to ensure proper load order

## Publishing Plugins

To share your plugin with others:

1. Create an npm package with name like `genaiscript-plugin-{name}`
2. Export your plugin definition as the default export
3. Include TypeScript definitions if available
4. Document usage in your README
5. Publish to npm

Example package.json:

```json
{
    "name": "genaiscript-plugin-database",
    "version": "1.0.0",
    "main": "index.js",
    "exports": {
        ".": "./index.js"
    }
}
```

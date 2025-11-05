# GenAIScript Plugin Examples

This directory contains example plugins demonstrating how to extend GenAIScript's functionality.

## Plugin System Overview

The GenAIScript plugin system allows you to extend core contexts (global, host, workspace, parsers) through a simple API.

## Creating a Plugin

A plugin is a JavaScript/TypeScript module that exports a plugin definition:

```javascript
export default {
    name: 'my-plugin',
    setup(extend, options) {
        extend((context) => {
            // Add your extensions here
            context.global.myFunction = () => { /* ... */ }
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
    setup: (extend, options?) => void | Promise<void>
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

## Best Practices

1. **Naming**: Use descriptive, unique names for your plugins
2. **Error Handling**: Handle errors gracefully in your plugin code
3. **Documentation**: Document your plugin's API for users
4. **Testing**: Write tests for your plugin functionality
5. **Type Safety**: Provide TypeScript definitions when possible
6. **Async Setup**: Use async setup if you need to perform I/O operations

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

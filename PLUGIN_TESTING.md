# Testing the Plugin System

This guide explains how to test and validate the plugin system implementation.

## Running Unit Tests

Once dependencies are installed, run the test suite:

```bash
# Run all core tests
cd packages/core
npm test

# Run only plugin tests
node --import tsx --test src/plugin.test.ts
node --import tsx --test src/pluginloader.test.ts
node --import tsx --test src/config.plugin.test.ts
```

## Test Coverage

### Plugin Core Tests (`plugin.test.ts`)
- ✅ Plugin definition creation
- ✅ Setup function execution (sync and async)
- ✅ Multiple extension registration
- ✅ Options passing to setup
- ✅ Context extension (global, host, workspace, parsers)

### Plugin Loader Tests (`pluginloader.test.ts`)
- ✅ Loading from local files (relative and absolute paths)
- ✅ Extension auto-detection (.js, .mjs, .cjs, .ts, etc.)
- ✅ Named vs default exports
- ✅ npm package loading
- ✅ Multiple plugin loading
- ✅ Extension application
- ✅ Error handling and validation
- ✅ Setup failure handling

### Configuration Tests (`config.plugin.test.ts`)
- ✅ Schema validation for plugins array
- ✅ JSON and YAML config parsing
- ✅ Plugin path format recognition
- ✅ Mixed local and npm plugins
- ✅ Invalid configuration rejection

## Manual Testing

### 1. Create a Test Plugin

Create a file `test-plugin.mjs`:

```javascript
export default {
    name: 'test-plugin',
    setup(extend) {
        console.log('Test plugin loaded!')
        
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.testFunction = () => {
                return 'Plugin works!'
            }
            console.log('Test extension applied')
        })
    }
}
```

### 2. Configure Plugin

Add to `genaiscript.config.json`:

```json
{
    "plugins": ["./test-plugin.mjs"]
}
```

### 3. Load and Test

The plugin will be loaded when GenAIScript initializes. You can verify:

```javascript
// In your GenAIScript code
if (global.testFunction) {
    console.log(global.testFunction()) // Should print: "Plugin works!"
}
```

## Testing Different Plugin Sources

### Local File Plugins

```json
{
    "plugins": [
        "./plugins/local-plugin.js",
        "../shared/plugin.mjs",
        "/absolute/path/to/plugin.js"
    ]
}
```

### npm Package Plugins

```json
{
    "plugins": [
        "genaiscript-plugin-example",
        "@myorg/genaiscript-plugin"
    ]
}
```

## Testing Error Handling

### Invalid Plugin (Missing Name)

Create `invalid-plugin.mjs`:

```javascript
export default {
    setup(extend) {}
}
```

Expected error: `Plugin from './invalid-plugin.mjs' must have a 'name' property of type string`

### Invalid Plugin (Missing Setup)

```javascript
export default {
    name: 'broken-plugin'
}
```

Expected error: `Plugin from './broken-plugin.mjs' must have a 'setup' property of type function`

### Plugin Setup Failure

```javascript
export default {
    name: 'failing-plugin',
    setup(extend) {
        throw new Error('Setup failed!')
    }
}
```

Expected error: `Plugin 'failing-plugin' setup failed: Setup failed!`

## Validation Checklist

Before considering the implementation complete, verify:

- [ ] Plugin definitions are created correctly
- [ ] Plugins load from local files
- [ ] Plugins load from npm packages
- [ ] Path resolution works (relative, absolute, extensions)
- [ ] Both default and named exports work
- [ ] Multiple plugins can be loaded
- [ ] Extensions are applied to context
- [ ] Multiple extensions from one plugin work
- [ ] Async setup functions work
- [ ] Configuration schema validates correctly
- [ ] Error messages are helpful
- [ ] Invalid plugins are rejected
- [ ] Plugin setup failures are caught
- [ ] Extension application failures are caught

## Integration Testing

To test the full integration:

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Build the project:
   ```bash
   yarn compile
   ```

3. Create a test configuration with the example plugin:
   ```json
   {
       "plugins": ["./examples/plugins/example-plugin.mjs"]
   }
   ```

4. Run a GenAIScript command and verify the plugin loads

5. Check console output for plugin log messages

## Debugging Tips

### Enable Debug Logging

```bash
DEBUG=genaiscript:pluginloader node your-script.js
```

This will show:
- Plugin loading attempts
- Path resolution steps
- Validation results
- Extension registration

### Common Issues

**Plugin not found:**
- Check the path is correct relative to project root
- Verify file extension
- Check file permissions

**Plugin validation fails:**
- Ensure default export exists
- Verify name and setup properties
- Check setup function signature

**Extension not applied:**
- Verify context creation includes plugin extensions
- Check for errors in plugin setup
- Ensure extend callback is called

## Performance Testing

Test with multiple plugins:

```json
{
    "plugins": [
        "./plugin1.js",
        "./plugin2.js",
        "./plugin3.js",
        "./plugin4.js",
        "./plugin5.js"
    ]
}
```

Verify:
- All plugins load successfully
- Loading is reasonably fast
- Extensions are applied in order
- No memory leaks

## Next Steps

After validating the foundational system:

1. **Lifecycle Hooks**: Add beforeRun, afterRun hooks
2. **Conflict Resolution**: Handle overlapping extensions
3. **Plugin Marketplace**: Create plugin discovery system
4. **Hot Reloading**: Support plugin reload in development
5. **Plugin API Versioning**: Handle API changes

## Feedback

If you find issues or have suggestions, please:
1. Check existing tests for similar scenarios
2. Create a minimal reproduction case
3. File an issue with details
4. Consider contributing a fix!

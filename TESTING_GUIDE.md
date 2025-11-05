# Plugin System Testing Guide

This guide explains how to test the plugin system implementation.

## Prerequisites

Before running tests, ensure dependencies are installed:

```bash
cd /home/runner/work/genaiscript/genaiscript
yarn install
```

## Running Tests

### 1. Run Plugin Unit Tests

Test the core plugin functionality:

```bash
cd packages/core
yarn test src/plugin.test.ts
```

Expected: 14 tests should pass, covering:
- Plugin registration
- Context extension (global, host, workspace, parsers)
- Multiple plugins
- Async plugin setup
- Plugin metadata
- Registry clearing

### 2. Run Plugin Integration Tests

Test plugin integration with promptcontext:

```bash
cd packages/core
yarn test src/plugin-integration.test.ts
```

Expected: 6 tests should pass, covering:
- Global extensions in context
- Host extensions in context
- Workspace extensions in context
- Parser extensions in context
- Multiple plugins working together
- Backward compatibility

### 3. Run End-to-End Tests

Test complete workflows:

```bash
cd packages/core
yarn test src/plugin-e2e.test.ts
```

Expected: 6 tests should pass, covering:
- Custom parser workflow
- Global utilities workflow
- Host capabilities workflow
- Multiple plugins in workflow
- Singleton loading behavior

### 4. Run All Plugin Tests Together

```bash
cd packages/core
yarn test src/plugin*.test.ts
```

Expected: All 26 tests should pass.

### 5. Run Full Test Suite

Verify no regressions in existing functionality:

```bash
cd /home/runner/work/genaiscript/genaiscript
yarn test:core
```

Expected: All existing tests should still pass.

## Manual Testing

### Testing Example Plugins

1. **Custom Parser Plugin**

Create a test script:

```javascript
// test-custom-parser.js
const { globalPluginRegistry } = require('./packages/core/src/plugin')
const customParserPlugin = require('./examples/plugins/custom-parser-plugin')

globalPluginRegistry.register(customParserPlugin)

// Then create a prompt context and use the parser
// const parsed = await parsers.PROTO(content)
```

2. **Global Utils Plugin**

```javascript
// test-global-utils.js
const { globalPluginRegistry } = require('./packages/core/src/plugin')
const globalUtilsPlugin = require('./examples/plugins/global-utils-plugin')

globalPluginRegistry.register(globalUtilsPlugin)

// Then use in context
// const slug = slugify("Hello World")
// const chunks = chunkArray([1,2,3,4], 2)
```

3. **Host Capabilities Plugin**

```javascript
// test-host-capabilities.js
const { globalPluginRegistry } = require('./packages/core/src/plugin')
const hostCapabilitiesPlugin = require('./examples/plugins/host-capabilities-plugin')

globalPluginRegistry.register(hostCapabilitiesPlugin)

// Then use in context
// const db = await host.database("connection-string")
// const api = host.apiClient("https://api.example.com")
```

## Type Checking

Verify TypeScript types compile correctly:

```bash
cd packages/core
yarn typecheck
```

Or check specific files:

```bash
tsc --noEmit src/plugin.ts src/plugin-verification.ts
```

## Verification Checklist

- [ ] All 26 plugin tests pass
- [ ] Existing core tests pass (no regressions)
- [ ] TypeScript compilation succeeds
- [ ] Example plugins have valid syntax
- [ ] Integration with promptcontext works
- [ ] Singleton loading prevents duplicates
- [ ] Extensions are available in all four contexts
- [ ] Multiple plugins can be registered
- [ ] Async plugin setup works

## Testing with GenAIScript CLI

To test plugins in a real GenAIScript environment:

1. **Build the CLI**:
```bash
yarn compile:cli
```

2. **Create a test script** that uses plugins:

```javascript
// genaisrc/test-plugins.genai.js
import { globalPluginRegistry } from "genaiscript/core"

// Register your plugins here
globalPluginRegistry.register({
    id: "test",
    name: "Test Plugin",
    setup(extend) {
        extend({
            global: {
                test() { return "Hello from plugin!" }
            }
        })
    }
})

$`Using plugin function: ${test()}`
```

3. **Run the script**:
```bash
node packages/cli/built/genaiscript.cjs run test-plugins
```

## Debugging

If tests fail:

1. **Check plugin registration**:
```javascript
const plugins = globalPluginRegistry.getPlugins()
console.log(`Registered plugins: ${plugins.length}`)
```

2. **Check extensions**:
```javascript
const extensions = globalPluginRegistry.getAllExtensions()
console.log('Global extensions:', Object.keys(extensions.global))
console.log('Host extensions:', Object.keys(extensions.host))
console.log('Workspace extensions:', Object.keys(extensions.workspace))
console.log('Parser extensions:', Object.keys(extensions.parsers))
```

3. **Enable trace logging**:
```javascript
const trace = new MarkdownTrace({ verbose: true })
await globalPluginRegistry.load({ trace })
```

4. **Check for frozen object issues**:
```javascript
console.log('Parsers frozen:', Object.isFrozen(parsers))
```

## Common Issues

### Issue: "Plugin already registered"
**Solution**: Call `globalPluginRegistry.clear()` before registering in tests

### Issue: Extensions not available in context
**Solution**: Ensure plugins are registered before context creation

### Issue: Parsers extension not working
**Solution**: Check that parsers object is properly spread (not mutated)

### Issue: Plugin setup called multiple times
**Solution**: Verify singleton loading pattern is working

## Performance Testing

Check that plugins don't impact performance:

```bash
# Measure context creation time without plugins
time node packages/cli/built/genaiscript.cjs run test-script

# Measure with plugins
# Should have minimal overhead (< 10ms difference)
```

## Code Coverage

If code coverage tools are available:

```bash
yarn test --coverage src/plugin*.test.ts
```

Expected coverage:
- plugin.ts: > 90%
- promptcontext.ts (plugin integration): > 80%

## Integration Test Scenarios

### Scenario 1: Basic Plugin Usage
1. Register a plugin
2. Create context
3. Verify extension is available
4. Use the extension

### Scenario 2: Multiple Plugins
1. Register 3+ plugins
2. Create context
3. Verify all extensions are available
4. Verify no conflicts

### Scenario 3: Custom Parser
1. Register parser plugin
2. Create context
3. Parse a file
4. Verify parsed data structure

### Scenario 4: Error Handling
1. Register plugin with setup error
2. Verify error is caught and reported
3. Verify other plugins still work

## Continuous Integration

Add to CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Test Plugin System
  run: |
    cd packages/core
    yarn test src/plugin*.test.ts
```

## Documentation Testing

Verify documentation examples work:

1. Test examples from README.md
2. Test examples from example-usage.md
3. Verify all code snippets are syntactically valid

## Success Criteria

✅ All 26 tests pass
✅ No regressions in existing tests
✅ TypeScript compilation succeeds
✅ Example plugins work as documented
✅ No memory leaks from plugin loading
✅ Performance impact < 10ms per context creation
✅ All four extension points functional
✅ Backward compatibility maintained

## Next Steps After Testing

1. Update main documentation
2. Add plugin examples to samples
3. Create plugin template/generator
4. Add plugin marketplace/registry
5. Performance optimization if needed
6. Add more example plugins

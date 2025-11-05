/**
 * Public API for GenAIScript plugins
 * Import from 'genaiscript/plugin'
 */

export {
    plugin,
    type PluginDefinition,
    type PluginSetupFunction,
    type PluginExtensionContext,
    type PluginModule,
    type LoadedPlugin,
    type PluginLifecycleContext,
    type PluginErrorContext,
    type PluginLifecycleHooks,
    type LifecycleHook,
    ConflictResolutionStrategy,
} from "./plugin"

export {
    loadPlugin,
    loadPlugins,
    applyPluginExtensions,
    executeBeforeRunHooks,
    executeAfterRunHooks,
    executeErrorHooks,
} from "./pluginloader"

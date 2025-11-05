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
} from "./plugin"

export {
    loadPlugin,
    loadPlugins,
    applyPluginExtensions,
    type LoadedPlugin,
} from "./pluginloader"

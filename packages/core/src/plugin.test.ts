import { describe, test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { PluginRegistry, Plugin, ExtendContext } from "./plugin"
import { MarkdownTrace } from "./trace"

describe("plugin", async () => {
    let registry: PluginRegistry
    let trace: MarkdownTrace

    beforeEach(() => {
        registry = new PluginRegistry()
        trace = new MarkdownTrace({})
    })

    test("register plugin", () => {
        const plugin: Plugin = {
            id: "test-plugin",
            name: "Test Plugin",
            setup(extend) {
                extend({ global: { test: () => "hello" } })
            },
        }

        registry.register(plugin)
        const plugins = registry.getPlugins()
        assert.equal(plugins.length, 1)
        assert.equal(plugins[0].id, "test-plugin")
    })

    test("prevent duplicate plugin registration", () => {
        const plugin: Plugin = {
            id: "test-plugin",
            name: "Test Plugin",
            setup() {},
        }

        registry.register(plugin)
        assert.throws(() => {
            registry.register(plugin)
        }, /already registered/)
    })

    test("register multiple plugins", () => {
        const plugins: Plugin[] = [
            {
                id: "plugin1",
                name: "Plugin 1",
                setup() {},
            },
            {
                id: "plugin2",
                name: "Plugin 2",
                setup() {},
            },
        ]

        registry.registerAll(plugins)
        assert.equal(registry.getPlugins().length, 2)
    })

    test("extend global context", async () => {
        const plugin: Plugin = {
            id: "global-test",
            name: "Global Test Plugin",
            setup(extend) {
                extend({
                    global: {
                        testFunction() {
                            return "test result"
                        },
                        testValue: 42,
                    },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const extensions = registry.getExtensions("global")
        assert.equal(typeof extensions.testFunction, "function")
        assert.equal(extensions.testFunction(), "test result")
        assert.equal(extensions.testValue, 42)
    })

    test("extend host context", async () => {
        const plugin: Plugin = {
            id: "host-test",
            name: "Host Test Plugin",
            setup(extend) {
                extend({
                    host: {
                        customOperation() {
                            return "custom operation result"
                        },
                    },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const extensions = registry.getExtensions("host")
        assert.equal(typeof extensions.customOperation, "function")
        assert.equal(extensions.customOperation(), "custom operation result")
    })

    test("extend workspace context", async () => {
        const plugin: Plugin = {
            id: "workspace-test",
            name: "Workspace Test Plugin",
            setup(extend) {
                extend({
                    workspace: {
                        customWorkspaceOp() {
                            return "workspace result"
                        },
                    },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const extensions = registry.getExtensions("workspace")
        assert.equal(typeof extensions.customWorkspaceOp, "function")
        assert.equal(extensions.customWorkspaceOp(), "workspace result")
    })

    test("extend parsers context", async () => {
        const plugin: Plugin = {
            id: "parser-test",
            name: "Parser Test Plugin",
            setup(extend) {
                extend({
                    parsers: {
                        CUSTOM(content: string) {
                            return { parsed: content.toUpperCase() }
                        },
                    },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const extensions = registry.getExtensions("parsers")
        assert.equal(typeof extensions.CUSTOM, "function")
        assert.deepEqual(extensions.CUSTOM("hello"), { parsed: "HELLO" })
    })

    test("multiple plugins extending same context", async () => {
        const plugin1: Plugin = {
            id: "plugin1",
            name: "Plugin 1",
            setup(extend) {
                extend({
                    global: {
                        function1() {
                            return "from plugin 1"
                        },
                    },
                })
            },
        }

        const plugin2: Plugin = {
            id: "plugin2",
            name: "Plugin 2",
            setup(extend) {
                extend({
                    global: {
                        function2() {
                            return "from plugin 2"
                        },
                    },
                })
            },
        }

        registry.registerAll([plugin1, plugin2])
        await registry.load({ trace })

        const extensions = registry.getExtensions("global")
        assert.equal(typeof extensions.function1, "function")
        assert.equal(typeof extensions.function2, "function")
        assert.equal(extensions.function1(), "from plugin 1")
        assert.equal(extensions.function2(), "from plugin 2")
    })

    test("async plugin setup", async () => {
        const plugin: Plugin = {
            id: "async-plugin",
            name: "Async Plugin",
            async setup(extend) {
                // Simulate async initialization
                await new Promise((resolve) => setTimeout(resolve, 10))
                extend({
                    global: {
                        asyncValue: "initialized",
                    },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const extensions = registry.getExtensions("global")
        assert.equal(extensions.asyncValue, "initialized")
    })

    test("get all extensions", async () => {
        const plugin: Plugin = {
            id: "multi-extend",
            name: "Multi Extend Plugin",
            setup(extend) {
                extend({
                    global: { globalFunc: () => "global" },
                    host: { hostFunc: () => "host" },
                    workspace: { workspaceFunc: () => "workspace" },
                    parsers: { PARSER: () => "parser" },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const allExtensions = registry.getAllExtensions()
        assert.equal(typeof allExtensions.global.globalFunc, "function")
        assert.equal(typeof allExtensions.host.hostFunc, "function")
        assert.equal(typeof allExtensions.workspace.workspaceFunc, "function")
        assert.equal(typeof allExtensions.parsers.PARSER, "function")
    })

    test("clear registry", async () => {
        const plugin: Plugin = {
            id: "test-plugin",
            name: "Test Plugin",
            setup(extend) {
                extend({ global: { test: () => "hello" } })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        assert.equal(registry.getPlugins().length, 1)
        assert.ok(Object.keys(registry.getExtensions("global")).length > 0)

        registry.clear()

        assert.equal(registry.getPlugins().length, 0)
        assert.equal(Object.keys(registry.getExtensions("global")).length, 0)
    })

    test("plugin setup receives options", async () => {
        let receivedOptions: any = null

        const plugin: Plugin = {
            id: "options-test",
            name: "Options Test Plugin",
            setup(extend, options) {
                receivedOptions = options
                extend({ global: {} })
            },
        }

        const model = "test-model"
        const cancellationToken = new AbortController().signal

        registry.register(plugin)
        await registry.load({ trace, model, cancellationToken })

        assert.ok(receivedOptions)
        assert.equal(receivedOptions.trace, trace)
        assert.equal(receivedOptions.model, model)
        assert.equal(receivedOptions.cancellationToken, cancellationToken)
    })

    test("plugin extending multiple contexts", async () => {
        const plugin: Plugin = {
            id: "multi-context",
            name: "Multi Context Plugin",
            setup(extend) {
                extend({
                    global: {
                        utility() {
                            return "utility function"
                        },
                    },
                    parsers: {
                        CUSTOM(content: string) {
                            return { data: content }
                        },
                    },
                })
            },
        }

        registry.register(plugin)
        await registry.load({ trace })

        const globalExt = registry.getExtensions("global")
        const parsersExt = registry.getExtensions("parsers")

        assert.equal(typeof globalExt.utility, "function")
        assert.equal(globalExt.utility(), "utility function")
        assert.equal(typeof parsersExt.CUSTOM, "function")
        assert.deepEqual(parsersExt.CUSTOM("test"), { data: "test" })
    })

    test("plugin with metadata", () => {
        const plugin: Plugin = {
            id: "metadata-plugin",
            name: "Metadata Plugin",
            description: "A plugin with metadata",
            version: "1.2.3",
            setup() {},
        }

        registry.register(plugin)
        const plugins = registry.getPlugins()

        assert.equal(plugins[0].id, "metadata-plugin")
        assert.equal(plugins[0].name, "Metadata Plugin")
        assert.equal(plugins[0].description, "A plugin with metadata")
        assert.equal(plugins[0].version, "1.2.3")
    })
})

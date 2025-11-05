import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { globalPluginRegistry, Plugin } from "./plugin"
import { createPromptContext } from "./promptcontext"
import { MarkdownTrace } from "./trace"
import { TestHost } from "./testhost"
import { Project } from "./server/messages"

describe("plugin integration with promptcontext", async () => {
    beforeEach(() => {
        TestHost.install()
        globalPluginRegistry.clear()
    })

    afterEach(() => {
        globalPluginRegistry.clear()
    })

    test("global extensions are available in context", async () => {
        const plugin: Plugin = {
            id: "global-integration",
            name: "Global Integration Plugin",
            setup(extend) {
                extend({
                    global: {
                        testUtility() {
                            return "global utility result"
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(plugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Check that the global extension is available
        assert.equal(typeof (ctx as any).testUtility, "function")
        assert.equal((ctx as any).testUtility(), "global utility result")
    })

    test("host extensions are available in context", async () => {
        const plugin: Plugin = {
            id: "host-integration",
            name: "Host Integration Plugin",
            setup(extend) {
                extend({
                    host: {
                        customHostFunction() {
                            return "host function result"
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(plugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Check that the host extension is available
        assert.equal(typeof (ctx.host as any).customHostFunction, "function")
        assert.equal((ctx.host as any).customHostFunction(), "host function result")
    })

    test("workspace extensions are available in context", async () => {
        const plugin: Plugin = {
            id: "workspace-integration",
            name: "Workspace Integration Plugin",
            setup(extend) {
                extend({
                    workspace: {
                        customWorkspaceOp() {
                            return "workspace op result"
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(plugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Check that the workspace extension is available
        assert.equal(typeof (ctx.workspace as any).customWorkspaceOp, "function")
        assert.equal((ctx.workspace as any).customWorkspaceOp(), "workspace op result")
    })

    test("parser extensions are available in context", async () => {
        const plugin: Plugin = {
            id: "parser-integration",
            name: "Parser Integration Plugin",
            setup(extend) {
                extend({
                    parsers: {
                        CUSTOM(content: string) {
                            return { parsed: content.split("").reverse().join("") }
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(plugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Check that the parser extension is available
        assert.equal(typeof (ctx.parsers as any).CUSTOM, "function")
        const result = (ctx.parsers as any).CUSTOM("hello")
        assert.deepEqual(result, { parsed: "olleh" })
    })

    test("multiple plugins work together", async () => {
        const plugin1: Plugin = {
            id: "plugin1",
            name: "Plugin 1",
            setup(extend) {
                extend({
                    global: {
                        plugin1Func() {
                            return "plugin1"
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
                    host: {
                        plugin2Func() {
                            return "plugin2"
                        },
                    },
                })
            },
        }

        const plugin3: Plugin = {
            id: "plugin3",
            name: "Plugin 3",
            setup(extend) {
                extend({
                    parsers: {
                        PLUGIN3(content: string) {
                            return { data: "plugin3: " + content }
                        },
                    },
                })
            },
        }

        globalPluginRegistry.registerAll([plugin1, plugin2, plugin3])

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Check all extensions are available
        assert.equal(typeof (ctx as any).plugin1Func, "function")
        assert.equal((ctx as any).plugin1Func(), "plugin1")

        assert.equal(typeof (ctx.host as any).plugin2Func, "function")
        assert.equal((ctx.host as any).plugin2Func(), "plugin2")

        assert.equal(typeof (ctx.parsers as any).PLUGIN3, "function")
        const result = (ctx.parsers as any).PLUGIN3("test")
        assert.deepEqual(result, { data: "plugin3: test" })
    })

    test("existing context functionality is preserved", async () => {
        const plugin: Plugin = {
            id: "preserve-test",
            name: "Preserve Test Plugin",
            setup(extend) {
                extend({
                    global: {
                        newFunction() {
                            return "new"
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(plugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Check existing context properties still work
        assert.ok(ctx.path)
        assert.ok(ctx.workspace)
        assert.ok(ctx.parsers)
        assert.ok(ctx.host)
        assert.ok(ctx.retrieval)

        // Check parsers have existing methods
        assert.equal(typeof ctx.parsers.JSON5, "function")
        assert.equal(typeof ctx.parsers.YAML, "function")

        // Check new extension is also available
        assert.equal(typeof (ctx as any).newFunction, "function")
        assert.equal((ctx as any).newFunction(), "new")
    })
})

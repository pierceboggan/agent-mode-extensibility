"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunInTerminalTool = exports.FindFilesTool = exports.TabCountTool = void 0;
exports.registerChatTools = registerChatTools;
const vscode = __importStar(require("vscode"));
function registerChatTools(context) {
    context.subscriptions.push(vscode.lm.registerTool('chat-tools-sample_tabCount', new TabCountTool()));
    context.subscriptions.push(vscode.lm.registerTool('chat-tools-sample_findFiles', new FindFilesTool()));
    context.subscriptions.push(vscode.lm.registerTool('chat-tools-sample_runInTerminal', new RunInTerminalTool()));
}
class TabCountTool {
    async invoke(options, _token) {
        const params = options.input;
        if (typeof params.tabGroup === 'number') {
            const group = vscode.window.tabGroups.all[Math.max(params.tabGroup - 1, 0)];
            const nth = params.tabGroup === 1
                ? '1st'
                : params.tabGroup === 2
                    ? '2nd'
                    : params.tabGroup === 3
                        ? '3rd'
                        : `${params.tabGroup}th`;
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`There are ${group.tabs.length} tabs open in the ${nth} tab group.`)]);
        }
        else {
            const group = vscode.window.tabGroups.activeTabGroup;
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`There are ${group.tabs.length} tabs open.`)]);
        }
    }
    async prepareInvocation(options, _token) {
        const confirmationMessages = {
            title: 'Count the number of open tabs',
            message: new vscode.MarkdownString(`Count the number of open tabs?` +
                (options.input.tabGroup !== undefined
                    ? ` in tab group ${options.input.tabGroup}`
                    : '')),
        };
        return {
            invocationMessage: 'Counting the number of tabs',
            confirmationMessages,
        };
    }
}
exports.TabCountTool = TabCountTool;
class FindFilesTool {
    async invoke(options, token) {
        const params = options.input;
        const files = await vscode.workspace.findFiles(params.pattern, '**/node_modules/**', undefined, token);
        const strFiles = files.map((f) => f.fsPath).join('\n');
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Found ${files.length} files matching "${params.pattern}":\n${strFiles}`)]);
    }
    async prepareInvocation(options, _token) {
        return {
            invocationMessage: `Searching workspace for "${options.input.pattern}"`,
        };
    }
}
exports.FindFilesTool = FindFilesTool;
async function waitForShellIntegration(terminal, timeout) {
    let resolve;
    let reject;
    const p = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    const timer = setTimeout(() => reject(new Error('Could not run terminal command: shell integration is not enabled')), timeout);
    const listener = vscode.window.onDidChangeTerminalShellIntegration((e) => {
        if (e.terminal === terminal) {
            clearTimeout(timer);
            listener.dispose();
            resolve();
        }
    });
    await p;
}
class RunInTerminalTool {
    async invoke(options, _token) {
        const params = options.input;
        const terminal = vscode.window.createTerminal('Language Model Tool User');
        terminal.show();
        try {
            await waitForShellIntegration(terminal, 5000);
        }
        catch (e) {
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(e.message)]);
        }
        const execution = terminal.shellIntegration.executeCommand(params.command);
        const terminalStream = execution.read();
        let terminalResult = '';
        for await (const chunk of terminalStream) {
            terminalResult += chunk;
        }
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(terminalResult)]);
    }
    async prepareInvocation(options, _token) {
        const confirmationMessages = {
            title: 'Run command in terminal',
            message: new vscode.MarkdownString(`Run this command in a terminal?` +
                `\n\n\`\`\`\n${options.input.command}\n\`\`\`\n`),
        };
        return {
            invocationMessage: `Running command in terminal`,
            confirmationMessages,
        };
    }
}
exports.RunInTerminalTool = RunInTerminalTool;
//# sourceMappingURL=tools.js.map
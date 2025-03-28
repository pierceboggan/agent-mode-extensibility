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
exports.isTsxToolUserMetadata = isTsxToolUserMetadata;
exports.registerToolUserChatParticipant = registerToolUserChatParticipant;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode = __importStar(require("vscode"));
const toolsPrompt_1 = require("./toolsPrompt");
function isTsxToolUserMetadata(obj) {
    // If you change the metadata format, you would have to make this stricter or handle old objects in old ChatRequest metadata
    return !!obj &&
        !!obj.toolCallsMetadata &&
        Array.isArray(obj.toolCallsMetadata.toolCallRounds);
}
function registerToolUserChatParticipant(context) {
    const handler = async (request, chatContext, stream, token) => {
        if (request.command === 'list') {
            stream.markdown(`Available tools: ${vscode.lm.tools.map(tool => tool.name).join(', ')}\n\n`);
            return;
        }
        let model = request.model;
        if (model.vendor === 'copilot' && model.family.startsWith('o1')) {
            // The o1 models do not currently support tools
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });
            model = models[0];
        }
        // Use all tools, or tools with the tags that are relevant.
        const tools = request.command === 'all' ?
            vscode.lm.tools :
            vscode.lm.tools.filter(tool => tool.tags.includes('chat-tools-sample'));
        const options = {
            justification: 'To make a request to @toolsTSX',
        };
        // Render the initial prompt
        const result = await (0, prompt_tsx_1.renderPrompt)(toolsPrompt_1.ToolUserPrompt, {
            context: chatContext,
            request,
            toolCallRounds: [],
            toolCallResults: {}
        }, { modelMaxPromptTokens: model.maxInputTokens }, model);
        let messages = result.messages;
        result.references.forEach(ref => {
            if (ref.anchor instanceof vscode.Uri || ref.anchor instanceof vscode.Location) {
                stream.reference(ref.anchor);
            }
        });
        const toolReferences = [...request.toolReferences];
        const accumulatedToolResults = {};
        const toolCallRounds = [];
        const runWithTools = async () => {
            // If a toolReference is present, force the model to call that tool
            const requestedTool = toolReferences.shift();
            if (requestedTool) {
                options.toolMode = vscode.LanguageModelChatToolMode.Required;
                options.tools = vscode.lm.tools.filter(tool => tool.name === requestedTool.name);
            }
            else {
                options.toolMode = undefined;
                options.tools = [...tools];
            }
            // Send the request to the LanguageModelChat
            const response = await model.sendRequest(messages, options, token);
            // Stream text output and collect tool calls from the response
            const toolCalls = [];
            let responseStr = '';
            for await (const part of response.stream) {
                if (part instanceof vscode.LanguageModelTextPart) {
                    stream.markdown(part.value);
                    responseStr += part.value;
                }
                else if (part instanceof vscode.LanguageModelToolCallPart) {
                    toolCalls.push(part);
                }
            }
            if (toolCalls.length) {
                // If the model called any tools, then we do another round- render the prompt with those tool calls (rendering the PromptElements will invoke the tools)
                // and include the tool results in the prompt for the next request.
                toolCallRounds.push({
                    response: responseStr,
                    toolCalls
                });
                const result = (await (0, prompt_tsx_1.renderPrompt)(toolsPrompt_1.ToolUserPrompt, {
                    context: chatContext,
                    request,
                    toolCallRounds,
                    toolCallResults: accumulatedToolResults
                }, { modelMaxPromptTokens: model.maxInputTokens }, model));
                messages = result.messages;
                const toolResultMetadata = result.metadatas.getAll(toolsPrompt_1.ToolResultMetadata);
                if (toolResultMetadata?.length) {
                    // Cache tool results for later, so they can be incorporated into later prompts without calling the tool again
                    toolResultMetadata.forEach(meta => accumulatedToolResults[meta.toolCallId] = meta.result);
                }
                // This loops until the model doesn't want to call any more tools, then the request is done.
                return runWithTools();
            }
        };
        await runWithTools();
        return {
            metadata: {
                // Return tool call metadata so it can be used in prompt history on the next request
                toolCallsMetadata: {
                    toolCallResults: accumulatedToolResults,
                    toolCallRounds
                }
            },
        };
    };
    const toolUser = vscode.chat.createChatParticipant('chat-tools-sample.tools', handler);
    toolUser.iconPath = new vscode.ThemeIcon('tools');
    context.subscriptions.push(toolUser);
}
//# sourceMappingURL=toolParticipant.js.map
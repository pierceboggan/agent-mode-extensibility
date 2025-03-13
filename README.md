# Agent Mode Extensibility

Agent mode includes tools contributed by VS Code including editing files, codebase search, terminal execution, and error checking (from both language server and terminal).

You can contribute your own tools to Copilot's agent mode with an extension built with VS Code's API.

![image](https://github.com/user-attachments/assets/105489e3-1c65-4622-8a54-e45b6b06e5f2)
![image](https://github.com/user-attachments/assets/f7e9a7ce-41d5-4cf4-b2a4-77e498edc978)


Steps:

1. Implement a `LanguageModelTool`. This defines the tool behavior. This repository shows an example for counting open tabs in VS Code in [/src/tools.ts]. Check out the VS Code [tutorial on tools](https://code.visualstudio.com/api/extension-guides/tools) for more information.
2. Register that tool in `package.json` for the extension in `languageModelTools`. You must include the `vscode_editing` tag for agent mode to pick up your tool (private API).

```
"languageModelTools": [
			{
				"name": "chat-tools-sample_tabCount",
				"tags": [
					"editors",
					"chat-tools-sample",
					"vscode_editing"
				],
				"toolReferenceName": "tabCount",
				"displayName": "Tab Count",
				"modelDescription": "The number of active tabs in a tab group",
				"icon": "$(files)",
				"inputSchema": {
					"type": "object",
					"properties": {
						"tabGroup": {
							"type": "number",
							"description": "The index of the tab group to check. This is optional- if not specified, the active tab group will be checked.",
							"default": 0
						}
					}
				}
			}
]
```

3. Add the following to your package.json to enable the proposed API that allows agent mode to use your tool:
```
	"enabledApiProposals": ["languageModelToolsForAgent"],
```

## Running the Sample

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window
	- Open Copilot Edits, switch to agent mode, and ask how many tabs are open.

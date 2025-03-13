"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const chatUtilsSample_1 = require("./chatUtilsSample");
const simple_1 = require("./simple");
const toolParticipant_1 = require("./toolParticipant");
const tools_1 = require("./tools");
function activate(context) {
    (0, simple_1.registerSimpleParticipant)(context);
    (0, toolParticipant_1.registerToolUserChatParticipant)(context);
    (0, chatUtilsSample_1.registerChatLibChatParticipant)(context);
    (0, tools_1.registerChatTools)(context);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map
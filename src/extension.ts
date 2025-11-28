// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Paster } from "./paster";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('"vscode-paste-image" is now active!');
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-paste-image.pasteImage", () => {
      Paster.pasteImageOnEditor();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-paste-image.pasteBase64Image",
      () => {
        Paster.pasteBase64ImageOnEditor();
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-paste-image.createImage",
      (uri: vscode.Uri) => {
        Paster.pasteImageOnWorkspace(uri);
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

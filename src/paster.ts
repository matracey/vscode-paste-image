"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { PasterConfig, PredefinedVars } from "./config";
import { getShellScript, Base64TextScript } from "./shellscript";

/**
 * Encodes the relative path from the document to the pasted image, forcing `/` separators.
 */
function getRelativePath(
  docPath: vscode.Uri,
  imageFilePath: vscode.Uri
): string {
  return encodeURI(
    path.relative(docPath.fsPath, imageFilePath.fsPath).replace(/\\/g, "/")
  );
}

/**
 * High-level helper that routes the clipboard image data into files and editor text.
 */
class Paster {
  public static async pasteImageOnWorkspace(output: vscode.Uri) {
    /**
     * Saves the clipboard image directly into the provided workspace URI.
     */
    const script = (await Base64TextScript.getScript()) || getShellScript();
    try {
      const stat = await vscode.workspace.fs.stat(output);
      const predefinedVars = new PredefinedVars(output);
      if (2 !== stat.type) {
        output = vscode.Uri.joinPath(output, "../");
      }
      let filename: string = PasterConfig.getImageFileName("");
      filename = predefinedVars.replace(filename);
      const saveFile: vscode.Uri = vscode.Uri.joinPath(output, filename);
      const imageData = await script.getBase64Image();
      await this.saveImage(saveFile, imageData);
      console.debug("save image: " + saveFile);
    } catch (err) {
      vscode.window.showErrorMessage("" + err);
    }
  }

  /**
   * Pastes the clipboard image into the active editor as a link/markup snippet.
   */
  public static async pasteImageOnEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const target = new PasteTarget(editor);
    const script = (await Base64TextScript.getScript()) || getShellScript();

    try {
      let imageUri = target.getImagePath();
      if (PasterConfig.useFilePathConfirm()) {
        const newPath = await this.confirmImagePath(imageUri);
        if (!newPath) {
          return;
        }
        imageUri = newPath;
      }
      const imageData = await script.getBase64Image();
      await this.saveImage(imageUri, imageData);
      const context = target.getPasteImageText(imageUri);
      target.pasteText(context);
      console.debug("save image: " + imageUri);
    } catch (err) {
      vscode.window.showErrorMessage("" + err);
    }
  }

  /**
   * Inserts the clipboard image as Base64 text into the active editor.
   */
  public static async pasteBase64ImageOnEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const target = new PasteTarget(editor);
    const script = (await Base64TextScript.getScript()) || getShellScript();

    try {
      const filename = target.getGeneratedImageFileName();
      const imageData = await script.getBase64Image();
      const context = target.getPasteBase64ImageTextByFilename(filename, imageData);
      await target.pasteText(context[0]);
      target.pasteEnd(context[1]);
      console.debug("paste base64 image");
    } catch (err) {
      vscode.window.showErrorMessage("" + err);
    }
  }

  /**
   * Shows an input box so the user can override the file path before saving the image.
   */
  private static async confirmImagePath(
    imageUri: vscode.Uri
  ): Promise<vscode.Uri | undefined> {
    const imagePath: string = imageUri.fsPath;
    const filename: string = path.basename(imagePath);
    const options: vscode.InputBoxOptions = {
      prompt:
        "You can change the filename. The existing file will be overwritten!.",
      value: imagePath,
      placeHolder: "(e.g:../test/myimage.png)",
      valueSelection: [
        imagePath.length - filename.length,
        imagePath.length - 4,
      ],
    };
    const inputVal = await vscode.window.showInputBox(options);
    return inputVal ? vscode.Uri.file(inputVal) : undefined;
  }

  /**
   * Decodes the Base64 blob and writes it to disk via the VS Code FileSystem API.
   */
  private static async saveImage(saveFile: vscode.Uri, base64: string) {
    try {
      const buff: Uint8Array = Buffer.from(base64, "base64");
      await vscode.workspace.fs.writeFile(saveFile, buff);
    } catch (err) {
      throw new Error("faild save image of clipboard");
    }
  }
}

/**
 * Encapsulates the editing context for generating image paths/text and updating selections.
 */
class PasteTarget {
  private editor: vscode.TextEditor;

  constructor(editor: vscode.TextEditor) {
    this.editor = editor;
  }

  /**
   * Returns the configured snippet (markdown/asciidoc/etc.) for embedding the saved image.
   */
  public getPasteImageText(imageUri: vscode.Uri): string {
    const baseUri = this.getBaseUri();
    const lang = this.editor.document.languageId;
    const tpl = PasterConfig.getPasteTemplate(lang);

    const filePath: string = getRelativePath(baseUri, imageUri);
    const predefinedVars = new PredefinedVars(this.editor.document.uri);
    predefinedVars.set("relativePath", filePath);

    return predefinedVars.replace(tpl);
  }

  /**
   * Renders the configured Base64 paste template for the active language.
   */
  public getPasteBase64ImageText(
    imageUri: vscode.Uri,
    base64: string
  ): string[] {
    // const baseUri = this.getBaseUri();
    const lang = this.editor.document.languageId;
    const tpls = PasterConfig.getPasteBase64Template(lang);

    const filePath: string = path.basename(imageUri.fsPath);
    const predefinedVars = new PredefinedVars(this.editor.document.uri);
    predefinedVars.set("relativePath", filePath);
    predefinedVars.set("base64", base64);

    return tpls.map((t) => predefinedVars.replace(t));
  }

  /**
   * Renders the configured Base64 paste template using just a filename (no saved file required).
   */
  public getPasteBase64ImageTextByFilename(
    filename: string,
    base64: string
  ): string[] {
    const lang = this.editor.document.languageId;
    const tpls = PasterConfig.getPasteBase64Template(lang);

    const predefinedVars = new PredefinedVars(this.editor.document.uri);
    predefinedVars.set("relativePath", filename);
    predefinedVars.set("base64", base64);

    return tpls.map((t) => predefinedVars.replace(t));
  }

  /**
   * Resolves the target Uri for the new image file based on selection and config.
   */
  public getImagePath(): vscode.Uri {
    let baseUri = this.getBaseUri();
    baseUri = PasterConfig.getBasePath(this.editor.document.uri);

    const content = this.getSelectText();
    const predefinedVars = new PredefinedVars(this.editor.document.uri);
    let filename = PasterConfig.getImageFileName(content);
    filename = predefinedVars.replace(filename);

    return vscode.Uri.joinPath(baseUri, filename);
  }

  /**
   * Ensures the active document has been saved and returns its parent directory Uri.
   */
  public getBaseUri(): vscode.Uri {
    const baseUri = this.editor.document.uri;
    if (!baseUri || baseUri.scheme === "untitled") {
      throw new Error(
        "Before pasting an image, you need to save the current edited file first."
      );
    }
    return vscode.Uri.joinPath(baseUri, "../");
  }

  /**
   * Validates and returns the current selection so it can be used as a filename.
   */
  public getSelectText(): string {
    const selection = this.editor.selection;
    const selectText = this.editor.document.getText(selection);

    if (selectText && !/^[^\\/:\*\?""<>|]{1,120}$/.test(selectText)) {
      throw new Error("Your selection is not a valid file name!");
    }
    return selectText;
  }
  /**
   * Returns a generated filename for Base64 pasting (doesn't require the file to be saved).
   */
  public getGeneratedImageFileName(): string {
    const content = this.getSelectText();
    const predefinedVars = new PredefinedVars(this.editor.document.uri);
    let filename = PasterConfig.getImageFileName(content);
    filename = predefinedVars.replace(filename);
    return filename;
  }
  /**
   * Inserts or replaces the current selection with the given text context.
   */
  public pasteText(context: string) {
    context = decodeURI(context);
    return this.editor.edit((edit) => {
      const current = this.editor.selection;

      if (current.isEmpty) {
        edit.insert(current.start, context);
      } else {
        edit.replace(current, context);
      }
    });
  }

  /**
   * Appends the provided text at the end of the document.
   */
  public pasteEnd(context: string) {
    return this.editor.edit((edit) => {
      const pt = new vscode.Position(this.editor.document.lineCount, 0);
      edit.insert(pt, context);
    });
  }
}

export { Paster };

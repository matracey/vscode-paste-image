"use strict";
import * as path from "path";
import moment from "moment";
import * as vscode from "vscode";

/**
 * Reads extension configuration values that control naming, paths, and templates.
 */
class PasterConfig {
  /**
   * Returns whether the user wants to confirm the saved file path before pasting.
   */
  public static useFilePathConfirm(): boolean {
    return vscode.workspace.getConfiguration("pasteImage")
      .showFilePathConfirmInputBox;
  }

  /**
   * Creates the file name for the pasted image using either the selection or the configured pattern.
   */
  public static getImageFileName(
    selectText: string,
    extension: string = ".png"
  ): string {
    if (!selectText) {
      let defaultName =
        vscode.workspace.getConfiguration("pasteImage").defaultName;
      return moment().format(defaultName) + extension;
    }
    return selectText + extension;
  }

  /**
   * Resolves the destination directory that stores pasted images.
   */
  public static getBasePath(uri: vscode.Uri): vscode.Uri {
    let savefolder = vscode.workspace.getConfiguration("pasteImage").path;
    savefolder = new PredefinedVars(uri).replace(savefolder).trim();
    if (path.isAbsolute(savefolder)) {
      return vscode.Uri.file(savefolder);
    }
    return vscode.Uri.joinPath(uri, "../", savefolder);
  }

  /**
   * Returns the template used when inserting an image link for the current language.
   */
  public static getPasteTemplate(languageId: string): string {
    let tpls: Map<string, string> = new Map();
    tpls.set("markdown", "![](${relativePath})");
    tpls.set("asciidoc", "image::${relativePath}[]");

    let tpl: string | undefined;
    tpls.forEach((val, key) => {
      if (key === languageId) {
        tpl = val;
      }
    });
    return tpl ? tpl : "${relativePath}";
  }

  /**
   * Returns the template lines used when inserting Base64 inline images.
   */
  public static getPasteBase64Template(languageId: string): string[] {
    let tpls: Map<string, string[]> = new Map();
    tpls.set("markdown", [
      "![][${relativePath}]",
      "\n[${relativePath}]:data:image/png;base64,${base64}\n",
    ]);
    tpls.set("asciidoc", ["image::data:image/png;base64,${base64}[]", ""]);

    let tpl: string[] | undefined;
    tpls.forEach((val, key) => {
      if (key === languageId) {
        tpl = val;
      }
    });
    return tpl || ["data:image/png;base64,${base64}", ""];
  }
}

/**
 * Tracks replacement variables derived from the current document/selection.
 */
class PredefinedVars {
  private replaceMap: Map<string, string> = new Map();

  /**
   * Captures metadata for the provided URI (workspace roots, directories, filenames).
   */
  public constructor(current: vscode.Uri) {
    this.replaceMap = new Map();
    if (
      undefined !== vscode.workspace.workspaceFolders &&
      0 < vscode.workspace.workspaceFolders.length
    ) {
      const rootDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
      this.set("workspaceRoot", rootDir);
      this.set("projectRoot", rootDir);
    }

    const currPath = current && current.fsPath;

    if (currPath) {
      this.set("currentFileDir", currPath);
      this.set("fileExtname", path.extname(currPath));
      this.set(
        "fileBasenameNoExtension",
        path.basename(currPath, this.replaceMap.get("${fileExtname}"))
      );
      this.set("fileBasename", path.basename(currPath));
      this.set("fileDirname", path.dirname(currPath));
    }
  }

  /**
   * Applies all captured variables to the input string and normalizes slashes.
   */
  public replace(str: String) {
    this.replaceMap.forEach((val, key) => {
      str = str.replace(key, val);
    });
    // User may be input a path with backward slashes (\), so need to replace all '\' to '/'.
    return str.replace(/\\/g, "/");
  }

  /**
   * Stores a replacement mapping keyed by `${key}` to be used by `replace`.
   */
  public set(key: string, val: string) {
    this.replaceMap.set("${" + key + "}", val);
  }
}

export { PasterConfig, PredefinedVars };

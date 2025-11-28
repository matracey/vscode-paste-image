"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";

/**
 * Runs the specified shell with the provided args and returns the combined stdout.
 * Rejects if the process exits with a non-zero code or emits stderr data.
 */
function executeCommand(shell: string, options: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let process: ChildProcess = spawn(shell, options);
    if (null !== process.stdout) {
      process.stdout.on("data", (contents) => {
        stdout += contents;
      });
    }
    if (null !== process.stderr) {
      process.stderr.on("data", (contents) => {
        stderr += contents;
      });
    }
    process.on("error", reject).on("close", function (code) {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr));
      }
    });
  });
}

/**
 * Picks the correct platform-specific clipboard script runner.
 * Defaults to the Linux implementation when the platform is unrecognized.
 */
function getShellScript(): ScriptRunner {
  switch (process.platform) {
    case "win32":
      return new Win32Script();
    case "darwin":
      return new MacScript();
    case "linux":
      return new LinuxScript();
  }
  return new LinuxScript();
}

/**
 * Defines how clipboard helpers expose Base64 payloads and a way to invoke their scripts.
 */
interface ScriptRunner {
  getBase64Image(): Promise<string>;
  runScript(script: string, parameters: string[]): Promise<string>;
}

/**
 * Uses the bundled PowerShell script to copy the clipboard image into Base64 on Windows.
 */
class Win32Script implements ScriptRunner {
  public async getBase64Image() {
    const script = "win32.ps1";
    let stdout;
    try {
      stdout = await this.runScript(script, []);
    } catch (err) {
      throw new Error("faild save image of clipboard");
    }

    const data = stdout.trim();

    if (!data) {
      throw new Error("faild genrate image from clipboard");
    }

    if (data === "no image") {
      throw new Error("image of clipboard is empty");
    }
    return data;
  }

  public runScript(script: string, parameters: string[]): Promise<string> {
    const scriptPath = path.join(__dirname, "../res/" + script);
    const shell = "powershell";
    const command = [
      "-noprofile",
      "-noninteractive",
      "-nologo",
      "-sta",
      "-executionpolicy",
      "unrestricted",
      "-windowstyle",
      "hidden",
      "-file",
      scriptPath,
    ].concat(parameters);
    return executeCommand(shell, command);
  }
}

/**
 * Runs the linux.sh helper to capture clipboard images via xclip on Linux.
 */
class LinuxScript implements ScriptRunner {
  public async getBase64Image() {
    const script = "linux.sh";
    let stdout;
    try {
      stdout = await this.runScript(script, []);
    } catch (err) {
      throw new Error("faild save image of clipboard");
    }

    const data = stdout.trim();

    if (!data) {
      throw new Error("faild genrate image from clipboard");
    }

    if (data === "no xclip") {
      throw new Error("You need to install xclip command first.");
    }

    if (data === "no image") {
      throw new Error("image of clipboard is empty");
    }
    return data;
  }

  public runScript(script: string, parameters: string[]): Promise<string> {
    const scriptPath = path.join(__dirname, "../res/" + script);
    const shell = "sh";
    const command = [scriptPath].concat(parameters);
    return executeCommand(shell, command);
  }
}

/**
 * Runs the mac.sh helper to capture clipboard images via pngpaste on macOS.
 */
class MacScript implements ScriptRunner {
  public async getBase64Image() {
    const script = "mac.sh";
    let stdout;
    try {
      stdout = await this.runScript(script, []);
    } catch (err) {
      throw new Error("faild save image of clipboard");
    }

    const data = stdout.trim();

    if (!data) {
      throw new Error("faild genrate image from clipboard");
    }

    if (data === "no pngpaste") {
      throw new Error("You need to install pngpaste command first.");
    }

    if (data === "no image") {
      throw new Error("image of clipboard is empty");
    }
    return data;
  }

  public runScript(script: string, parameters: string[]): Promise<string> {
    const scriptPath = path.join(__dirname, "../res/" + script);
    const shell = "sh";
    const command = [scriptPath].concat(parameters);
    return executeCommand(shell, command);
  }
}

/**
 * Handles clipboard contents that already contain a Base64-encoded image string.
 * Falls back before shell-specific scripts so the lightweight path can be reused for paste-from-text flows.
 */
class Base64TextScript implements ScriptRunner {
  public static async getScript() {
    return !!(await vscode.env.clipboard.readText())
      ? new Base64TextScript()
      : undefined;
  }

  public async getBase64Image() {
    /**
     * Removes whitespace and optional data URIs, then validates against a Base64 pattern.
     */
    const base64regex =
      /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    let base64 = await this.runScript("", []);
    base64 = base64.replace(/\s+/g, "");
    base64 = base64.replace(/^.*,/, "");
    if (!base64regex.test(base64)) {
      throw new Error("faild genrate image from base64 text of clipboard");
    }
    return base64;
  }

  public async runScript(
    script: string,
    parameters: string[]
  ): Promise<string> {
    return await vscode.env.clipboard.readText();
  }
}

export { getShellScript, Base64TextScript };

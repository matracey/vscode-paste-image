import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getShellScript, Base64TextScript } from "../shellscript";
import { setClipboardImage } from "./testHelper";

suite("Extension Test Suite (shellscript)", () => {
  vscode.window.showInformationMessage("Start shellscript tests.");
  const conf = vscode.workspace.getConfiguration("pasteImage");
  let rootDir: vscode.Uri;
  if (
    undefined !== vscode.workspace.workspaceFolders &&
    0 < vscode.workspace.workspaceFolders.length
  ) {
    rootDir =
      vscode.workspace.workspaceFolders[0] &&
      vscode.workspace.workspaceFolders[0].uri;
  }
  const script = getShellScript();

  test("saveImage success", async () => {
    const base64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuNWRHWFIAAAAMSURBVBhXY2BgYAAAAAQAAVzN/2kAAAAASUVORK5CYII=";
    await setClipboardImage(base64);
    const file = vscode.Uri.joinPath(rootDir, "sample.png");
    const output = await script.getBase64Image();
    //assert.equal(base64, output);
  });

  test("saveImage false", async () => {
    await vscode.env.clipboard.writeText("a");
    const file = vscode.Uri.joinPath(rootDir, "sample.png");
    try {
      await script.getBase64Image();
      assert.fail();
    } catch (err) {
      assert.equal("" + err, "Error: image of clipboard is empty");
    }
  });

  test("saveImage base64", async () => {
    const base64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuNWRHWFIAAAAMSURBVBhXY2BgYAAAAAQAAVzN/2kAAAAASUVORK5CYII=";
    await vscode.env.clipboard.writeText(base64);
    const base64script = await Base64TextScript.getScript();
    if (!base64script) {
      assert.fail();
    }
    const file = vscode.Uri.joinPath(rootDir, "sample.png");
    const output = await base64script.getBase64Image();
    //assert.equal(base64, output);
  });
});

import * as path from "path";
import { getShellScript } from "../shellscript";

/**
 * Sets a Base64-encoded image to the system clipboard in a cross-platform way.
 * @param base64 The Base64-encoded PNG image data
 */
export async function setClipboardImage(base64: string): Promise<void> {
  const script = getShellScript();

  switch (process.platform) {
    case "win32":
      await script.runScript(
        "../src/test/win32 _test_set_clipboard_image.ps1",
        [base64]
      );
      break;

    case "darwin":
      // macOS: decode base64 and use osascript
      await script.runScript("../src/test/mac_test_set_clipboard_image.sh", [
        base64,
      ]);
      break;

    case "linux":
      // Linux: decode base64 and use xclip with timeout
      await script.runScript("../src/test/linux_test_set_clipboard_image.sh", [
        base64,
      ]);
      break;

    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

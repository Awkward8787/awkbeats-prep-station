const { execFileSync } = require('child_process');
const path = require('path');

// electron-builder 25 treats mac.identity "-" as a keychain certificate name
// and then skips signing. Ad-hoc sign here, after the .app exists and before
// the disk image is built. Hardened runtime stays off; there is no Developer ID.
async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '-s', '-', appPath], { stdio: 'inherit' });
}

module.exports = afterPack;
module.exports.afterPack = afterPack;

'use strict';

const common = require('./lib/common.js');

function main() {
  try {
    const hookContext = common.readStdin();
    const status = common.readPdcaStatus(hookContext.cwd);

    if (!status) {
      process.stdout.write('[PDCA] No active PDCA session. Run /pdca plan [feature] to start.\n');
      process.exit(0);
    }

    const context = common.buildFullContext(status);
    process.stdout.write(context + '\n');
    process.exit(0);
  } catch (e) {
    common.debugLog('session-start', 'Error', { error: e.message });
    process.exit(0);
  }
}

main();

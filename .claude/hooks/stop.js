'use strict';

const common = require('./lib/common.js');

function getNextCommand(feature, phase, matchRate) {
  switch (phase) {
    case 'plan':      return `/pdca design ${feature}`;
    case 'design':    return `/pdca do ${feature}`;
    case 'do':        return `/pdca analyze ${feature}`;
    case 'check':     return matchRate >= 90 ? `/pdca report ${feature}` : `/pdca iterate ${feature}`;
    case 'completed': return `/pdca archive ${feature}`;
    default:          return '/pdca status';
  }
}

function main() {
  try {
    const hookContext = common.readStdin();

    // Re-entry guard: stop_hook_active=true 시 즉시 종료
    if (hookContext.stop_hook_active === true) {
      process.exit(0);
    }

    const status = common.readPdcaStatus(hookContext.cwd);
    if (!status) {
      process.exit(0);
    }

    const primary = status.primaryFeature;
    if (!primary || !status.features || !status.features[primary]) {
      process.exit(0);
    }

    const d = status.features[primary];
    const mr = d.matchRate || 0;
    const next = getNextCommand(primary, d.phase, mr);
    const mrStr = mr > 0 ? `, matchRate=${mr}%` : '';

    process.stdout.write(`[PDCA] ${primary}: ${d.phase} (${d.phaseNumber}/6)${mrStr} | Next: ${next}\n`);
    process.exit(0);
  } catch (e) {
    common.debugLog('stop', 'Error', { error: e.message });
    process.exit(0);
  }
}

main();

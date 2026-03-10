'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildFullContext, detectPdcaKeywords } = require('../lib/common.js');

// === buildFullContext() Tests ===

describe('buildFullContext', () => {
  // TS-01: null status
  it('TS-01: returns no active session for null', () => {
    assert.equal(buildFullContext(null), '[PDCA] No active session.');
  });

  // TS-02: active feature -> 1-line summary
  it('TS-02: returns 1-line summary for active feature', () => {
    const status = {
      primaryFeature: 'f1',
      features: { f1: { phase: 'plan', phaseNumber: 1 } },
    };
    assert.equal(buildFullContext(status), '[PDCA] f1: plan (1/6)');
  });

  // TS-03: with matchRate
  it('TS-03: includes MR when matchRate > 0', () => {
    const status = {
      primaryFeature: 'f1',
      features: { f1: { phase: 'plan', phaseNumber: 1, matchRate: 85 } },
    };
    assert.equal(buildFullContext(status), '[PDCA] f1: plan (1/6), MR:85%');
  });

  // TS-04: result length <= 200
  it('TS-04: result is 200 chars or less', () => {
    const longName = 'a'.repeat(180);
    const status = {
      primaryFeature: longName,
      features: { [longName]: { phase: 'plan', phaseNumber: 1, matchRate: 99 } },
    };
    const result = buildFullContext(status);
    assert.ok(result.length <= 200, `Length was ${result.length}`);
  });

  // EC-01: primaryFeature exists but not in features
  it('EC-01: returns no active feature when key missing from features', () => {
    const status = {
      primaryFeature: 'f1',
      features: {},
    };
    assert.equal(buildFullContext(status), '[PDCA] No active feature.');
  });

  // EC-03: matchRate is 0
  it('EC-03: omits MR when matchRate is 0', () => {
    const status = {
      primaryFeature: 'f1',
      features: { f1: { phase: 'do', phaseNumber: 3, matchRate: 0 } },
    };
    assert.equal(buildFullContext(status), '[PDCA] f1: do (3/6)');
  });
});

// === detectPdcaKeywords() Tests ===

describe('detectPdcaKeywords', () => {
  // TS-05: /pdca prefix
  it('TS-05: matches /pdca prefix', () => {
    const result = detectPdcaKeywords('/pdca plan');
    assert.deepEqual(result, { phase: 'command', keywords: ['/pdca'] });
  });

  // TS-06: English "plan" alone -> null
  it('TS-06: does not match English "plan" without pdca context', () => {
    const result = detectPdcaKeywords('Let me plan the arch');
    assert.equal(result, null);
  });

  // TS-07: Korean keyword matches
  it('TS-07: matches Korean keyword', () => {
    const result = detectPdcaKeywords('계획을 세우자');
    assert.notEqual(result, null);
    assert.equal(result.phase, 'plan');
    assert.ok(result.keywords.includes('계획'));
  });

  // TS-08: "pdca plan" combination
  it('TS-08: matches English keyword with pdca context', () => {
    const result = detectPdcaKeywords('pdca plan 작성');
    assert.notEqual(result, null);
    assert.equal(result.phase, 'plan');
    assert.ok(result.keywords.includes('plan'));
  });

  // TS-09: short input
  it('TS-09: returns null for short input', () => {
    assert.equal(detectPdcaKeywords('ab'), null);
  });

  // EC-02: "planning" alone without pdca
  it('EC-02: does not match "planning" without pdca context', () => {
    const result = detectPdcaKeywords('I am planning to go');
    assert.equal(result, null);
  });
});

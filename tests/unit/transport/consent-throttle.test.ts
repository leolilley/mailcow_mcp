/**
 * Consent-route check-rate schedule.
 *
 * Tested here rather than against a live server because the only way to
 * observe a 30 second step over HTTP is to wait for it.
 *
 * The schedule gates how often a submitted password is *checked*. That
 * distinction is the whole finding behind this file. An earlier version used
 * the same numbers to delay the *reply* instead, which looked equivalent and
 * was not: an attacker does not need the reply, only the verdict. They
 * saturated the route, every guess was still evaluated at once, a wrong one
 * had its socket dropped immediately and a correct one returned an immediate
 * redirect. The delay slowed nobody and the saturation path was a clean
 * negative oracle.
 *
 * Two further constraints the schedule has to satisfy:
 *
 *   - It must never stop answering. The SDK limiter this route replaced
 *     answered 429, which let an attacker lock the operator out of their own
 *     consent screen, so there must be no "give up" value.
 *   - It must be bounded, because a submission waits for its slot and a
 *     caller is holding a socket while it does.
 */

import { consentIntervalFor } from '../../../src/transport/http';

describe('consentIntervalFor', () => {
  it('starts at one second', () => {
    expect(consentIntervalFor(1)).toBe(1000);
  });

  it('doubles with each failure in the window', () => {
    expect(consentIntervalFor(2)).toBe(2000);
    expect(consentIntervalFor(3)).toBe(4000);
    expect(consentIntervalFor(4)).toBe(8000);
    expect(consentIntervalFor(5)).toBe(16000);
  });

  it('caps, so a queued submission waits a bounded time', () => {
    expect(consentIntervalFor(6)).toBe(30000);
    expect(consentIntervalFor(50)).toBe(30000);
    expect(consentIntervalFor(10_000)).toBe(30000);
  });

  it('never decreases as failures accumulate', () => {
    let previous = 0;
    for (let n = 1; n <= 40; n++) {
      const interval = consentIntervalFor(n);
      expect(interval).toBeGreaterThanOrEqual(previous);
      previous = interval;
    }
  });

  it('always returns a finite interval rather than a refusal', () => {
    for (const n of [0, 1, 7, 1000]) {
      const interval = consentIntervalFor(n);
      expect(Number.isFinite(interval)).toBe(true);
      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThanOrEqual(30000);
    }
  });

  it('treats a zero or negative count as the first failure', () => {
    expect(consentIntervalFor(0)).toBe(1000);
    expect(consentIntervalFor(-5)).toBe(1000);
  });

  it('bounds sustained guessing to a rate, not just a latency', () => {
    // At the cap, a sustained attack gets two checks a minute from the whole
    // server, whatever concurrency it brings. That is the number that matters:
    // the previous design bounded only how fast an answer came back, which
    // left the check rate unlimited.
    const perMinuteAtCap = 60_000 / consentIntervalFor(99);
    expect(perMinuteAtCap).toBeLessThanOrEqual(2);
  });
});

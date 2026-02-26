/**
 * stats.js — Statistical helpers used across all benchmark suites.
 */

/** Sort a numeric array in-place and return it (convenience). */
export function sort(arr) {
  return arr.slice().sort((a, b) => a - b);
}

/** Arithmetic mean */
export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Population standard deviation */
export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/** Percentile using linear interpolation (p in [0, 100]). */
export function percentile(arr, p) {
  const s = sort(arr);
  if (!s.length) return 0;
  if (s.length === 1) return s[0];
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

/** Return a full statistics object for an array of millisecond timings. */
export function summarise(timesMs) {
  const s = sort(timesMs);
  return {
    samples:  s.length,
    min:      s[0] ?? 0,
    max:      s[s.length - 1] ?? 0,
    mean:     round2(mean(s)),
    stddev:   round2(stddev(s)),
    p50:      round2(percentile(s, 50)),
    p75:      round2(percentile(s, 75)),
    p95:      round2(percentile(s, 95)),
    p99:      round2(percentile(s, 99)),
  };
}

/** Round to 2 decimal places. */
export function round2(v) {
  return Math.round(v * 100) / 100;
}

/** Throughput in operations/second given N ops and total ms elapsed. */
export function throughput(N, totalMs) {
  if (totalMs === 0) return 0;
  return round2((N / totalMs) * 1000);
}

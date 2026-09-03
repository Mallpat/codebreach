/**
 * JEST-COMPATIBLE TEST SUITE
 * Test suite for Project Nimbus Telemetry & Alert Pipeline
 */

describe('Nimbus Telemetry & Alert Pipeline', () => {
  const sampleAlerts = [
    { id: 'alt-1', service: 'auth', priority: 4, errorCount: 2, isCritical: false, latencyMs: 120 },
    { id: 'alt-2', service: 'database', priority: 10, errorCount: 15, isCritical: true, latencyMs: 850 },
    { id: 'alt-3', service: 'gateway', priority: 7, errorCount: 1, isCritical: false, latencyMs: 45 },
    { id: 'alt-4', service: 'database', priority: 9, errorCount: 6, isCritical: true, latencyMs: 620 },
    { id: 'alt-5', service: 'payments', priority: 2, errorCount: 8, isCritical: false, latencyMs: 90 }
  ];

  test('Test 1: sortAlertsByPriority orders alerts descending by priority', () => {
    const sorted = sortAlertsByPriority(sampleAlerts);
    const priorities = sorted.map(a => a.priority);
    // Highest priority should be first: 10, 9, 7, 4, 2
    expect(priorities).toEqual([10, 9, 7, 4, 2]);
  });

  test('Test 2: aggregateMetricsByService aggregates counts and latency into object', () => {
    const metrics = aggregateMetricsByService(sampleAlerts);
    expect(typeof metrics).toBe('object');
    expect(metrics).not.toBeNull();
    expect(metrics.database).toBeDefined();
    expect(metrics.database.count).toBe(2);
    expect(metrics.database.totalLatency).toBe(1470);
    expect(metrics.database.criticalCount).toBe(2);
  });

  test('Test 3: aggregateMetricsByService handles empty events array', () => {
    const metrics = aggregateMetricsByService([]);
    expect(typeof metrics).toBe('object');
    expect(Object.keys(metrics).length).toBe(0);
  });

  test('Test 4: filterUrgentAlerts requires BOTH priority >= 8 AND errorCount >= 5', () => {
    const urgent = filterUrgentAlerts(sampleAlerts);
    const ids = urgent.map(u => u.id);
    // alt-2 (10, 15) and alt-4 (9, 6) meet BOTH criteria
    // alt-5 has errorCount 8 but priority 2 -> MUST NOT be included
    expect(ids).toEqual(['alt-2', 'alt-4']);
  });

  test('Test 5: calculateAverageLatency correctly computes mean latency', () => {
    const stats = { count: 4, totalLatency: 800 };
    expect(calculateAverageLatency(stats)).toBe(200);
  });

  test('Test 6: calculateAverageLatency returns 0 when count is 0 without NaN', () => {
    const emptyStats = { count: 0, totalLatency: 0 };
    const avg = calculateAverageLatency(emptyStats);
    expect(avg).toBe(0);
    expect(Number.isNaN(avg)).toBe(false);
  });
});

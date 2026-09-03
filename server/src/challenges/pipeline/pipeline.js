/**
 * PROJECT NIMBUS - TELEMETRY & ALERT PIPELINE
 * Service: Nimbus Real-time Ingestion Stream
 * 
 * Incident Ticket #NIM-5204:
 * "High-priority incidents are getting dropped or misordered in production queues.
 * Alert thresholds triggering false alarms on low-severity events."
 */

/**
 * Sorts telemetry alerts by severity priority (highest priority first).
 * BUG 1: Sort comparator returns boolean (a > b) instead of numeric difference (b - a).
 */
export function sortAlertsByPriority(alerts) {
  if (!Array.isArray(alerts)) return [];
  const copy = [...alerts];
  // BUG: Array.prototype.sort requires a negative, zero, or positive number.
  // Returning boolean (a.priority > b.priority) produces erratic non-deterministic ordering in V8.
  // FIX NEEDED: (a, b) => b.priority - a.priority
  return copy.sort((a, b) => a.priority > b.priority);
}

/**
 * Aggregates alert metrics by service name into a grouped map.
 * BUG 2: Reduce initial accumulator is initialized to 0 instead of empty object {}.
 */
export function aggregateMetricsByService(events) {
  if (!Array.isArray(events)) return {};

  // BUG: Initial value is 0 instead of {}
  // FIX NEEDED: Pass {} as the second argument to reduce
  return events.reduce((acc, event) => {
    const service = event.service || 'unknown';
    if (!acc[service]) {
      acc[service] = { count: 0, totalLatency: 0, criticalCount: 0 };
    }
    acc[service].count += 1;
    acc[service].totalLatency += (event.latencyMs || 0);
    if (event.isCritical) {
      acc[service].criticalCount += 1;
    }
    return acc;
  }, 0);
}

/**
 * Filters urgent events that need immediate on-call notification.
 * Condition: Event must have priority >= 8 AND errorCount >= 5.
 * BUG 3: Uses OR (||) instead of AND (&&), causing low-priority warnings to trigger false alarms.
 */
export function filterUrgentAlerts(alerts) {
  if (!Array.isArray(alerts)) return [];

  // BUG: Using || instead of &&
  // FIX NEEDED: alert.priority >= 8 && alert.errorCount >= 5
  return alerts.filter(alert => {
    return alert.priority >= 8 || alert.errorCount >= 5;
  });
}

/**
 * Calculates average response latency for a given service.
 * BUG 4: Division by zero returns NaN when no metrics exist, rather than 0.
 */
export function calculateAverageLatency(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return 0;
  }
  // BUG: If metrics.count is 0 or undefined, 0/0 results in NaN instead of 0
  // FIX NEEDED: if (!metrics.count || metrics.count === 0) return 0;
  return Math.round(metrics.totalLatency / metrics.count);
}

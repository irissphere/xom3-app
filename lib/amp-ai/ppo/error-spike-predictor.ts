// STRIKE 4: Predict Error Spikes
// Analyzes error patterns to predict spikes

import { ErrorSpikePrediction } from "./types";
import { getAirtableBase } from "../../airtable/client";

/**
 * Predict error spikes
 */
export async function predictErrorSpikes(
  pipelineId: string,
  tenant: string
): Promise<ErrorSpikePrediction[]> {
  const predictions: ErrorSpikePrediction[] = [];

  try {
    const base = await getAirtableBase();
    // Load error history
    const errorTable = base("AMP Errors");
    const errors = await errorTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 500,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (errors.length < 20) {
      return predictions;
    }

    // Analyze time-based patterns
    const dayOfWeekCounts: Record<number, number> = {};
    const hourCounts: Record<number, number> = {};
    const recentErrors = errors.slice(0, 100);
    const olderErrors = errors.slice(100, 200);

    errors.forEach(record => {
      const timestamp = record.get("Timestamp") as string;
      if (timestamp) {
        const date = new Date(timestamp);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    // Calculate error rates
    const recentErrorRate = recentErrors.length / 100;
    const olderErrorRate = olderErrors.length / 100;
    const currentErrorRate = errors.length / 500;

    // Predict time-based spike
    const peakDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakDay && peakDay[1] >= 10) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const nextPeakDay = new Date();
      const daysUntilPeak = (parseInt(peakDay[0]) - nextPeakDay.getDay() + 7) % 7;
      nextPeakDay.setDate(nextPeakDay.getDate() + (daysUntilPeak || 7));

      const predictedErrorRate = currentErrorRate * 1.5; // Predict 50% increase
      const increasePercentage = ((predictedErrorRate - currentErrorRate) / currentErrorRate) * 100;

      predictions.push({
        type: "time_based",
        source: `${dayNames[parseInt(peakDay[0])]} pattern`,
        confidence: Math.min(0.85, 0.5 + (peakDay[1] / 50) * 0.35),
        predictedTime: nextPeakDay.toISOString(),
        predictedErrorRate,
        currentErrorRate,
        increasePercentage,
        description: `Error rate typically spikes on ${dayNames[parseInt(peakDay[0])]} (${peakDay[1]} occurrences in history)`,
        recommendedAction: `Prepare for increased error volume on ${dayNames[parseInt(peakDay[0])]}. Review mappings and validation rules.`
      });
    }

    // Predict tenant-based spike
    if (recentErrorRate > olderErrorRate * 1.5) {
      const predictedErrorRate = recentErrorRate * 1.2;
      const increasePercentage = ((predictedErrorRate - currentErrorRate) / currentErrorRate) * 100;

      predictions.push({
        type: "tenant_based",
        source: tenant,
        confidence: 0.75,
        predictedTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        predictedErrorRate,
        currentErrorRate,
        increasePercentage,
        description: `Tenant '${tenant}' error rate is trending upward (${(recentErrorRate * 100).toFixed(1)}% recent vs ${(olderErrorRate * 100).toFixed(1)}% older)`,
        recommendedAction: `Review tenant-specific mappings and data quality for '${tenant}'`
      });
    }

    // Predict source-based spike (if schema drift detected)
    const signalsTable = base("AMP Evolution Signals");
    const driftSignals = await signalsTable.select({
      filterByFormula: `AND({Type} = "drift", {PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 20,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (driftSignals.length >= 3) {
      predictions.push({
        type: "schema_based",
        source: "Schema drift detected",
        confidence: 0.7,
        predictedTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        predictedErrorRate: currentErrorRate * 1.3,
        currentErrorRate,
        increasePercentage: 30,
        description: `${driftSignals.length} schema drift signals detected. New columns or type changes may cause errors.`,
        recommendedAction: "Review schema changes and update mapping profile before next run"
      });
    }

  } catch (error) {
    console.error("[PPO] Failed to predict error spikes:", error);
  }

  return predictions;
}

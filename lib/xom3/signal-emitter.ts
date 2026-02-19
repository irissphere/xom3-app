import { ConsentSignal, DataFlowSignal } from './types';

export async function emitConsentSignal(signal: ConsentSignal): Promise<void> {
  try {
    // Send to your signal processing system
    await fetch('/api/signals/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal)
    });
  } catch (error) {
    console.error('Failed to emit consent signal:', error);
  }
}

export async function emitDataFlowSignal(signal: DataFlowSignal): Promise<void> {
  try {
    // Send to your signal processing system
    await fetch('/api/signals/data-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal)
    });
  } catch (error) {
    console.error('Failed to emit data flow signal:', error);
  }
}

export async function emitSystemSignal(
  source: string,
  type: string,
  severity: 'info' | 'warning' | 'error',
  payload: any
): Promise<void> {
  try {
    await fetch('/api/signals/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        type,
        severity,
        payload,
        timestamp: new Date()
      })
    });
  } catch (error) {
    console.error('Failed to emit system signal:', error);
  }
}









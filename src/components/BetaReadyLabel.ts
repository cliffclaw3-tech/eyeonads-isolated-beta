// A small beta-only display contract. No account or business-data behavior.
export function betaReadyLabel(ready: boolean): string {
  return ready ? 'Ready' : 'Checking';
}

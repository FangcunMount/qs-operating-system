// Read the original frozen payload. Never add a schema field to its content or
// substitute a current report: that would change the payload fingerprint.
const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const schemas = ['ai-explanation-input/v1', 'ai-explanation-input/v2', 'ai-explanation-input/v3', 'ai-explanation-input/v4']
export function frozenInputDocument(evidence: unknown): Record<string, any> | undefined {
  if (!object(evidence) || !object(evidence.frozen_input)) return
  const value = evidence.frozen_input
  if (value.available !== true || !object(value.content)) return
  const content = value.content
  const contract = value.input_schema === undefined ? evidence.release?.input_schema : value.input_schema
  if (contract !== undefined) {
    if (!object(contract) || contract.id !== 'ai-explanation-input' || !schemas.includes(contract.version) ||
      typeof contract.fingerprint !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(contract.fingerprint) ||
      (content.schema_version !== undefined && content.schema_version !== contract.version)) return
    if (value.input_schema !== undefined && evidence.release?.input_schema !== undefined &&
      ['id', 'version', 'fingerprint'].some((key) => contract[key] !== evidence.release.input_schema[key])) return
    return { value, content, schemaVersion: contract.version }
  }
  // Compatibility with older authenticated reads that included the wrapper.
  if (schemas.includes(content.schema_version)) return { value, content, schemaVersion: content.schema_version }
  return undefined
}

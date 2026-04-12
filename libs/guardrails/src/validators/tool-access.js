import { GuardrailViolation } from '../errors.js';

export const toolAccessValidator = {
  validate: async ({ context, config }) => {
    const requestedTools = context?.requestedTools || context?.requested_tools || [];
    const allowedTools = (config.allowed_tools || []).map((t) => String(t).toLowerCase());

    if (
      !Array.isArray(requestedTools) ||
      requestedTools.length === 0 ||
      allowedTools.length === 0
    ) {
      return;
    }

    const violations = requestedTools.filter((tool) => {
      const toolName = String(tool).toLowerCase();
      return !allowedTools.includes(toolName);
    });

    if (violations.length > 0) {
      throw new GuardrailViolation('Requested tool is not allowed by policy', {
        guardrail: 'tool_access',
        type: 'tool_not_allowed',
        value: violations,
        metadata: {
          requested_tools: requestedTools,
          allowed_tools: config.allowed_tools || [],
        },
      });
    }
  },
};

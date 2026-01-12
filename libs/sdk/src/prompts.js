import { promptService } from '@llm-governance/prompts';

export const prompts = {
  /**
   * Create a new prompt container
   * @param {Object} data { name, description, owner }
   */
  create: async (data) => {
    return await promptService.createPrompt(data);
  },

  /**
   * Create a new version for a prompt
   * @param {String} promptId
   * @param {Object} data { version, template, metadata }
   */
  createVersion: async (promptId, data) => {
    return await promptService.createVersion(promptId, data);
  },

  /**
   * Bind a version to an environment
   * @param {String} promptId
   * @param {String} versionId
   * @param {String} env 'prod' | 'dev' | 'test'
   */
  bindEnvironment: async (promptId, versionId, env) => {
    return await promptService.bindEnvironment(promptId, versionId, env);
  },

  /**
   * Get the resolved prompt template for an environment
   * @param {String} name Prompt Name
   * @param {String} env Environment (default: 'prod')
   */
  get: async (name, env = 'prod') => {
    return await promptService.getPrompt(name, env);
  }
};

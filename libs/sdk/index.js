import { init, observe } from './src/llm.js';
import * as context from './src/context.js';
import { prompts } from './src/prompts.js';
import { evaluation } from './src/evaluation.js';
import { gatewayService } from '@llm-governance/gateway';

export default {
    init,
    observe,
    context,
    prompts,
    evaluation,
    gateway: gatewayService
};

export { init, observe, context, prompts, evaluation, gatewayService as gateway };

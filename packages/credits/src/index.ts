/**
 * @mana/credits — Unified credit package
 *
 * Consolidates credit-operations + shared-credit-service + shared-credit-ui.
 *
 * Usage:
 * - Operations/costs: import { CreditOperationType, CREDIT_COSTS } from '@mana/credits'
 * - Service: import { createCreditService } from '@mana/credits'
 * - Web UI: import { CreditBalance } from '@mana/credits/web'
 */

// === Operations (costs, types, metadata) ===
export {
	CreditOperationType,
	CreditCategory,
	CREDIT_COSTS,
	OPERATION_METADATA,
	FREE_OPERATIONS,
	getCreditCost,
	getOperationMetadata,
	getOperationsForApp,
	getOperationsByCategory,
	calculateBulkCost,
	isFreeOperation,
	isAiOperation,
	formatCreditCost,
	getPricingTable,
	isFreeAction,
	type OperationMetadata,
} from './operations';

// === Service (client-side credit management) ===
export { createCreditService, type CreditService } from './createCreditService';
export type {
	CreditServiceConfig,
	CreditBalance,
	CreditCheckResponse,
	CreditConsumptionResponse,
	PricingResponse,
	CreditUpdateCallback,
	StandardOperationType,
} from './service-types';
export { DEFAULT_OPERATION_PRICING } from './service-types';

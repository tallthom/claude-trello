import { z } from 'zod';

/**
 * Extract a Trello ID from a URL, short ID, or full 24-char hex ID.
 *
 * Supported formats:
 * - Full URL: https://trello.com/c/EOY1CRmz/18-project-plan → EOY1CRmz
 * - Full URL: https://trello.com/b/lntO1GVb/board-name → lntO1GVb
 * - Short ID: EOY1CRmz → EOY1CRmz
 * - Full ID: 507f1f77bcf86cd799439011 → 507f1f77bcf86cd799439011
 */
export function extractTrelloId(input: string): string {
  const trimmed = input.trim();

  // Try to parse as a Trello URL
  const urlMatch = trimmed.match(/trello\.com\/[a-z]\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Already a valid ID (24-char hex or short alphanumeric)
  return trimmed;
}

export const trelloIdSchema = z.string().min(1, 'ID is required').transform(extractTrelloId);
const trelloIdOptionalSchema = z.string().min(1).transform(extractTrelloId).optional();

export const credentialsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required')
});

type ArgumentRecord = Record<string, unknown>;

export function extractCredentials(args: unknown): { credentials: { apiKey: string; token: string }; params: ArgumentRecord } {
  if (args !== undefined && args !== null && typeof args !== 'object') {
    throw new Error('Tool arguments must be an object.');
  }

  const { apiKey: argApiKey, token: argToken, ...rest } = (args as ArgumentRecord) ?? {};

  const credentials = credentialsSchema.parse({
    apiKey: argApiKey ?? process.env.TRELLO_API_KEY,
    token: argToken ?? process.env.TRELLO_TOKEN
  });

  return {
    credentials,
    params: rest
  };
}

export const listBoardsSchema = z.object({
  filter: z.enum(['all', 'open', 'closed']).optional().default('open')
});

export const getBoardSchema = z.object({
  boardId: trelloIdSchema,
  includeDetails: z.boolean().optional().default(false),
  descriptionMaxLength: z.number().min(0).max(10000).optional(),
  compact: z.boolean().optional()
});

export const getBoardListsSchema = z.object({
  boardId: trelloIdSchema,
  filter: z.enum(['all', 'open', 'closed']).optional().default('open')
});

export const createCardSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(16384, 'Card name too long'),
  desc: z.string().max(16384, 'Description too long').optional(),
  idList: trelloIdSchema,
  pos: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/).transform(Number), z.enum(['top', 'bottom'])]).optional(),
  due: z.string().datetime().optional(),
  start: z.string().datetime().optional(),
  idMembers: z.array(trelloIdSchema).optional(),
  idLabels: z.array(trelloIdSchema).optional()
});

export const updateCardSchema = z.object({
  cardId: trelloIdSchema,
  name: z.string().min(1).max(16384).optional(),
  desc: z.string().max(16384).optional(),
  closed: z.boolean().optional(),
  due: z.string().datetime().nullable().optional(),
  dueComplete: z.boolean().optional(),
  start: z.string().datetime().nullable().optional(),
  idList: trelloIdOptionalSchema,
  pos: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/).transform(Number), z.enum(['top', 'bottom'])]).optional(),
  idMembers: z.array(trelloIdSchema).optional(),
  idLabels: z.array(trelloIdSchema).optional()
});

export const moveCardSchema = z.object({
  cardId: trelloIdSchema,
  idList: trelloIdSchema,
  pos: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/).transform(Number), z.enum(['top', 'bottom'])]).optional()
});

export const getCardSchema = z.object({
  cardId: trelloIdSchema,
  includeDetails: z.boolean().optional().default(false)
});

export const deleteCardSchema = z.object({
  cardId: trelloIdSchema
});

export function validateCredentials(data: unknown) {
  return credentialsSchema.parse(data);
}

export function validateListBoards(data: unknown) {
  return listBoardsSchema.parse(data);
}

export function validateGetBoard(data: unknown) {
  return getBoardSchema.parse(data);
}

export function validateGetBoardLists(data: unknown) {
  return getBoardListsSchema.parse(data);
}

export function validateCreateCard(data: unknown) {
  return createCardSchema.parse(data);
}

export function validateUpdateCard(data: unknown) {
  return updateCardSchema.parse(data);
}

export function validateMoveCard(data: unknown) {
  return moveCardSchema.parse(data);
}

export function validateGetCard(data: unknown) {
  return getCardSchema.parse(data);
}

export function validateDeleteCard(data: unknown) {
  return deleteCardSchema.parse(data);
}

export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return `Validation error: ${issues.join(', ')}`;
}
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
export declare function extractTrelloId(input: string): string;
export declare const trelloIdSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const credentialsSchema: z.ZodObject<{
    apiKey: z.ZodString;
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    apiKey: string;
}, {
    token: string;
    apiKey: string;
}>;
type ArgumentRecord = Record<string, unknown>;
export declare function extractCredentials(args: unknown): {
    credentials: {
        apiKey: string;
        token: string;
    };
    params: ArgumentRecord;
};
export declare const listBoardsSchema: z.ZodObject<{
    filter: z.ZodDefault<z.ZodOptional<z.ZodEnum<["all", "open", "closed"]>>>;
}, "strip", z.ZodTypeAny, {
    filter: "all" | "open" | "closed";
}, {
    filter?: "all" | "open" | "closed" | undefined;
}>;
export declare const getBoardSchema: z.ZodObject<{
    boardId: z.ZodEffects<z.ZodString, string, string>;
    includeDetails: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    descriptionMaxLength: z.ZodOptional<z.ZodNumber>;
    compact: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    boardId: string;
    includeDetails: boolean;
    descriptionMaxLength?: number | undefined;
    compact?: boolean | undefined;
}, {
    boardId: string;
    includeDetails?: boolean | undefined;
    descriptionMaxLength?: number | undefined;
    compact?: boolean | undefined;
}>;
export declare const getBoardListsSchema: z.ZodObject<{
    boardId: z.ZodEffects<z.ZodString, string, string>;
    filter: z.ZodDefault<z.ZodOptional<z.ZodEnum<["all", "open", "closed"]>>>;
}, "strip", z.ZodTypeAny, {
    filter: "all" | "open" | "closed";
    boardId: string;
}, {
    boardId: string;
    filter?: "all" | "open" | "closed" | undefined;
}>;
export declare const createCardSchema: z.ZodObject<{
    name: z.ZodString;
    desc: z.ZodOptional<z.ZodString>;
    idList: z.ZodEffects<z.ZodString, string, string>;
    pos: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>, z.ZodEnum<["top", "bottom"]>]>>;
    due: z.ZodOptional<z.ZodString>;
    start: z.ZodOptional<z.ZodString>;
    idMembers: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    idLabels: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    idList: string;
    desc?: string | undefined;
    pos?: number | "top" | "bottom" | undefined;
    due?: string | undefined;
    start?: string | undefined;
    idMembers?: string[] | undefined;
    idLabels?: string[] | undefined;
}, {
    name: string;
    idList: string;
    desc?: string | undefined;
    pos?: string | number | undefined;
    due?: string | undefined;
    start?: string | undefined;
    idMembers?: string[] | undefined;
    idLabels?: string[] | undefined;
}>;
export declare const updateCardSchema: z.ZodObject<{
    cardId: z.ZodEffects<z.ZodString, string, string>;
    name: z.ZodOptional<z.ZodString>;
    desc: z.ZodOptional<z.ZodString>;
    closed: z.ZodOptional<z.ZodBoolean>;
    due: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueComplete: z.ZodOptional<z.ZodBoolean>;
    start: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    idList: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    pos: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>, z.ZodEnum<["top", "bottom"]>]>>;
    idMembers: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    idLabels: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    cardId: string;
    closed?: boolean | undefined;
    name?: string | undefined;
    desc?: string | undefined;
    idList?: string | undefined;
    pos?: number | "top" | "bottom" | undefined;
    due?: string | null | undefined;
    start?: string | null | undefined;
    idMembers?: string[] | undefined;
    idLabels?: string[] | undefined;
    dueComplete?: boolean | undefined;
}, {
    cardId: string;
    closed?: boolean | undefined;
    name?: string | undefined;
    desc?: string | undefined;
    idList?: string | undefined;
    pos?: string | number | undefined;
    due?: string | null | undefined;
    start?: string | null | undefined;
    idMembers?: string[] | undefined;
    idLabels?: string[] | undefined;
    dueComplete?: boolean | undefined;
}>;
export declare const moveCardSchema: z.ZodObject<{
    cardId: z.ZodEffects<z.ZodString, string, string>;
    idList: z.ZodEffects<z.ZodString, string, string>;
    pos: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>, z.ZodEnum<["top", "bottom"]>]>>;
}, "strip", z.ZodTypeAny, {
    idList: string;
    cardId: string;
    pos?: number | "top" | "bottom" | undefined;
}, {
    idList: string;
    cardId: string;
    pos?: string | number | undefined;
}>;
export declare const getCardSchema: z.ZodObject<{
    cardId: z.ZodEffects<z.ZodString, string, string>;
    includeDetails: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    includeDetails: boolean;
    cardId: string;
}, {
    cardId: string;
    includeDetails?: boolean | undefined;
}>;
export declare const deleteCardSchema: z.ZodObject<{
    cardId: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    cardId: string;
}, {
    cardId: string;
}>;
export declare function validateCredentials(data: unknown): {
    token: string;
    apiKey: string;
};
export declare function validateListBoards(data: unknown): {
    filter: "all" | "open" | "closed";
};
export declare function validateGetBoard(data: unknown): {
    boardId: string;
    includeDetails: boolean;
    descriptionMaxLength?: number | undefined;
    compact?: boolean | undefined;
};
export declare function validateGetBoardLists(data: unknown): {
    filter: "all" | "open" | "closed";
    boardId: string;
};
export declare function validateCreateCard(data: unknown): {
    name: string;
    idList: string;
    desc?: string | undefined;
    pos?: number | "top" | "bottom" | undefined;
    due?: string | undefined;
    start?: string | undefined;
    idMembers?: string[] | undefined;
    idLabels?: string[] | undefined;
};
export declare function validateUpdateCard(data: unknown): {
    cardId: string;
    closed?: boolean | undefined;
    name?: string | undefined;
    desc?: string | undefined;
    idList?: string | undefined;
    pos?: number | "top" | "bottom" | undefined;
    due?: string | null | undefined;
    start?: string | null | undefined;
    idMembers?: string[] | undefined;
    idLabels?: string[] | undefined;
    dueComplete?: boolean | undefined;
};
export declare function validateMoveCard(data: unknown): {
    idList: string;
    cardId: string;
    pos?: number | "top" | "bottom" | undefined;
};
export declare function validateGetCard(data: unknown): {
    includeDetails: boolean;
    cardId: string;
};
export declare function validateDeleteCard(data: unknown): {
    cardId: string;
};
export declare function formatValidationError(error: z.ZodError): string;
export {};
//# sourceMappingURL=validation.d.ts.map
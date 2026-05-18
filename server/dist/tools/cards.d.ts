import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const createCardTool: Tool;
export declare function handleCreateCard(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError?: never;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare const updateCardTool: Tool;
export declare function handleUpdateCard(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError?: never;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare const moveCardTool: Tool;
export declare function handleMoveCard(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError?: never;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare const getCardTool: Tool;
export declare function handleGetCard(args: unknown): Promise<{
    content: ({
        type: "image";
        data: string;
        mimeType: string;
    } | {
        type: "text";
        text: string;
    })[];
    isError?: never;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare const trelloArchiveCardTool: Tool;
export declare function handleArchiveCard(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError?: never;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
//# sourceMappingURL=cards.d.ts.map
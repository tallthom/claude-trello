import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const listBoardsTool: Tool;
export declare function handleListBoards(args: unknown): Promise<{
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
export declare const getBoardDetailsTool: Tool;
export declare function handleGetBoardDetails(args: unknown): Promise<{
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
export declare const getListsTool: Tool;
export declare function handleGetLists(args: unknown): Promise<{
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
export declare const trelloFilterListsTool: Tool;
export declare function handleTrelloFilterLists(args: unknown): Promise<{
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
//# sourceMappingURL=boards.d.ts.map
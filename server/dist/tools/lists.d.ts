import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const trelloGetListCardsTool: Tool;
export declare function handleTrelloGetListCards(args: unknown): Promise<{
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
export declare const trelloCreateListTool: Tool;
export declare function handleTrelloCreateList(args: unknown): Promise<{
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
export declare const trelloAddCommentTool: Tool;
export declare function handleTrelloAddComment(args: unknown): Promise<{
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
//# sourceMappingURL=lists.d.ts.map
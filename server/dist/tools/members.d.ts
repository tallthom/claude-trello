import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const trelloGetUserBoardsTool: Tool;
export declare function handleTrelloGetUserBoards(args: unknown): Promise<{
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
export declare const trelloGetMemberTool: Tool;
export declare function handleTrelloGetMember(args: unknown): Promise<{
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
//# sourceMappingURL=members.d.ts.map
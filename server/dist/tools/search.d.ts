import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const trelloSearchTool: Tool;
export declare function handleTrelloSearch(args: unknown): Promise<{
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
//# sourceMappingURL=search.d.ts.map
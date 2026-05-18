import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const trelloCreateChecklistTool: Tool;
export declare const trelloGetChecklistTool: Tool;
export declare const trelloUpdateChecklistTool: Tool;
export declare const trelloDeleteChecklistTool: Tool;
export declare const trelloGetChecklistFieldTool: Tool;
export declare const trelloUpdateChecklistFieldTool: Tool;
export declare const trelloGetBoardForChecklistTool: Tool;
export declare const trelloGetCardForChecklistTool: Tool;
export declare const trelloGetCheckItemsTool: Tool;
export declare const trelloCreateCheckItemTool: Tool;
export declare const trelloGetCheckItemTool: Tool;
export declare const trelloDeleteCheckItemTool: Tool;
export declare const trelloUpdateCheckItemTool: Tool;
export declare function handleTrelloCreateChecklist(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloGetChecklist(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloUpdateChecklist(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloDeleteChecklist(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloGetChecklistField(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloUpdateChecklistField(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloGetBoardForChecklist(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloGetCardForChecklist(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloGetCheckItems(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloCreateCheckItem(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloGetCheckItem(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloDeleteCheckItem(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleTrelloUpdateCheckItem(args: unknown): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
//# sourceMappingURL=checklists.d.ts.map
import type { TrelloCredentials, TrelloBoard, TrelloList, TrelloCard, TrelloLabel, TrelloChecklist, TrelloCheckItem, TrelloAttachment, TrelloMember, TrelloUser, TrelloAction, TrelloComment, TrelloSearchResults, CreateCardRequest, UpdateCardRequest, MoveCardRequest, CreateChecklistRequest, UpdateChecklistRequest, CreateCheckItemRequest, UpdateCheckItemRequest, TrelloCustomField, TrelloApiResponse } from '../types/trello.js';
export declare class TrelloClient {
    private baseURL;
    private credentials;
    private retryConfig;
    constructor(credentials: TrelloCredentials);
    private fetchWithTimeout;
    private buildURL;
    private extractRateLimitInfo;
    private sleep;
    private calculateBackoffDelay;
    private handleError;
    private makeRequest;
    private shouldRetry;
    getMyBoards(filter?: 'all' | 'open' | 'closed'): Promise<TrelloApiResponse<TrelloBoard[]>>;
    getBoard(boardId: string, includeDetails?: boolean): Promise<TrelloApiResponse<TrelloBoard>>;
    getBoardLists(boardId: string, filter?: 'all' | 'open' | 'closed'): Promise<TrelloApiResponse<TrelloList[]>>;
    createCard(cardData: CreateCardRequest): Promise<TrelloApiResponse<TrelloCard>>;
    updateCard(cardId: string, updates: UpdateCardRequest): Promise<TrelloApiResponse<TrelloCard>>;
    moveCard(cardId: string, moveData: MoveCardRequest): Promise<TrelloApiResponse<TrelloCard>>;
    getCard(cardId: string, includeDetails?: boolean): Promise<TrelloApiResponse<TrelloCard>>;
    deleteCard(cardId: string): Promise<TrelloApiResponse<void>>;
    getBoardMembers(boardId: string): Promise<TrelloApiResponse<TrelloMember[]>>;
    getBoardLabels(boardId: string): Promise<TrelloApiResponse<TrelloLabel[]>>;
    search(query: string, options?: {
        modelTypes?: string[];
        boardIds?: string[];
        boardsLimit?: number;
        cardsLimit?: number;
        membersLimit?: number;
    }): Promise<TrelloApiResponse<TrelloSearchResults>>;
    getListCards(listId: string, options?: {
        filter?: 'all' | 'open' | 'closed';
        fields?: string[];
    }): Promise<TrelloApiResponse<TrelloCard[]>>;
    addCommentToCard(cardId: string, text: string): Promise<TrelloApiResponse<TrelloComment>>;
    createList(listData: {
        name: string;
        idBoard: string;
        pos?: string | number;
    }): Promise<TrelloApiResponse<TrelloList>>;
    getMember(memberId: string, options?: {
        fields?: string[];
        boards?: string;
        organizations?: string;
    }): Promise<TrelloApiResponse<TrelloMember>>;
    getCurrentUser(): Promise<TrelloApiResponse<TrelloUser>>;
    getBoardCards(boardId: string, options?: {
        attachments?: string;
        members?: string;
        filter?: string;
        limit?: number;
        before?: string;
        since?: string;
    }): Promise<TrelloApiResponse<TrelloCard[]>>;
    getCardActions(cardId: string, options?: {
        filter?: string;
        limit?: number;
    }): Promise<TrelloApiResponse<TrelloAction[]>>;
    getCardAttachments(cardId: string, options?: {
        fields?: string[];
    }): Promise<TrelloApiResponse<TrelloAttachment[]>>;
    createCardAttachment(cardId: string, data: {
        url?: string;
        filePath?: string;
        name?: string;
        mimeType?: string;
        setCover?: boolean;
    }): Promise<TrelloApiResponse<TrelloAttachment>>;
    getCardAttachment(cardId: string, attachmentId: string, options?: {
        fields?: string[];
    }): Promise<TrelloApiResponse<TrelloAttachment>>;
    deleteCardAttachment(cardId: string, attachmentId: string): Promise<TrelloApiResponse<void>>;
    downloadAttachment(url: string): Promise<{
        data: string;
        mimeType: string;
    } | null>;
    getCardChecklists(cardId: string, options?: {
        checkItems?: string;
        fields?: string[];
    }): Promise<TrelloApiResponse<TrelloChecklist[]>>;
    createLabel(boardId: string, name: string, color: string): Promise<TrelloApiResponse<TrelloLabel>>;
    updateLabel(labelId: string, updates: {
        name?: string;
        color?: string;
    }): Promise<TrelloApiResponse<TrelloLabel>>;
    addLabelToCard(cardId: string, labelId: string): Promise<TrelloApiResponse<string[]>>;
    removeLabelFromCard(cardId: string, labelId: string): Promise<TrelloApiResponse<void>>;
    deleteLabel(labelId: string): Promise<TrelloApiResponse<void>>;
    addMemberToCard(cardId: string, memberId: string): Promise<TrelloApiResponse<any[]>>;
    removeMemberFromCard(cardId: string, memberId: string): Promise<TrelloApiResponse<void>>;
    createChecklist(data: CreateChecklistRequest): Promise<TrelloApiResponse<TrelloChecklist>>;
    getChecklist(checklistId: string, options?: {
        fields?: string[];
    }): Promise<TrelloApiResponse<TrelloChecklist>>;
    updateChecklist(checklistId: string, updates: UpdateChecklistRequest): Promise<TrelloApiResponse<TrelloChecklist>>;
    deleteChecklist(checklistId: string): Promise<TrelloApiResponse<void>>;
    getChecklistField(checklistId: string, field: string): Promise<TrelloApiResponse<Record<string, string>>>;
    updateChecklistField(checklistId: string, field: string, value: string): Promise<TrelloApiResponse<Record<string, string>>>;
    getBoardForChecklist(checklistId: string): Promise<TrelloApiResponse<TrelloBoard>>;
    getCardForChecklist(checklistId: string): Promise<TrelloApiResponse<TrelloCard[]>>;
    getCheckItems(checklistId: string, options?: {
        filter?: string;
        fields?: string[];
    }): Promise<TrelloApiResponse<TrelloCheckItem[]>>;
    createCheckItem(checklistId: string, data: CreateCheckItemRequest): Promise<TrelloApiResponse<TrelloCheckItem>>;
    getCheckItem(checklistId: string, checkItemId: string): Promise<TrelloApiResponse<TrelloCheckItem>>;
    deleteCheckItem(checklistId: string, checkItemId: string): Promise<TrelloApiResponse<void>>;
    updateCheckItem(cardId: string, checkItemId: string, updates: UpdateCheckItemRequest): Promise<TrelloApiResponse<TrelloCheckItem>>;
    getBoardCustomFields(boardId: string): Promise<TrelloApiResponse<TrelloCustomField[]>>;
}
//# sourceMappingURL=client.d.ts.map
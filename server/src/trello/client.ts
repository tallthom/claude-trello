import { readFile } from 'fs/promises';
import { basename } from 'path';
import { logger } from '../utils/logger.js';
import { insights } from '../utils/appInsights.js';
import { isAllowedAttachmentUrl } from '../utils/imageDownload.js';
import type {
  TrelloCredentials,
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloLabel,
  TrelloChecklist,
  TrelloCheckItem,
  TrelloAttachment,
  TrelloMember,
  TrelloUser,
  TrelloAction,
  TrelloComment,
  TrelloSearchResults,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  CreateChecklistRequest,
  UpdateChecklistRequest,
  CreateCheckItemRequest,
  UpdateCheckItemRequest,
  TrelloCustomField,
  TrelloError,
  RateLimitInfo,
  TrelloApiResponse
} from '../types/trello.js';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export class TrelloClient {
  private baseURL = 'https://api.trello.com/1';
  private credentials: TrelloCredentials;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  constructor(credentials: TrelloCredentials) {
    this.credentials = credentials;
  }

  private async fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
    const { timeout = 15000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private buildURL(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.set('key', this.credentials.apiKey);
    url.searchParams.set('token', this.credentials.token);
    
    // Add additional parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      });
    }
    
    return url.toString();
  }

  private extractRateLimitInfo(response: Response): RateLimitInfo | undefined {
    const limit = response.headers.get('x-rate-limit-api-key-limit');
    const remaining = response.headers.get('x-rate-limit-api-key-remaining');
    const reset = response.headers.get('x-rate-limit-api-key-reset');
    
    if (limit) {
      return {
        limit: parseInt(limit, 10) || 300,
        remaining: parseInt(remaining || '0', 10),
        resetTime: parseInt(reset || '0', 10)
      };
    }
    return undefined;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private handleError(error: unknown): TrelloError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network error - unable to reach Trello API',
        error: error.message,
        code: 'NETWORK_ERROR'
      };
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        message: 'Request timeout - Trello API did not respond in time',
        error: error.message,
        code: 'TIMEOUT_ERROR'
      };
    }
    
    // For Response objects (HTTP errors)
    if (error && typeof error === 'object' && 'status' in error) {
      const response = error as Response;
      const status = response.status;
      
      let message = 'Trello API error';
      let code = 'API_ERROR';
      
      switch (status) {
        case 401:
          message = 'Invalid or expired Trello credentials. Please update your API key and token in Claude.app\'s MCP connection settings.';
          code = 'INVALID_CREDENTIALS';
          break;
        case 403:
          message = 'Insufficient permissions. Your Trello token may need additional permissions, or the resource may be private. Please check your Trello settings or update your token in Claude.app.';
          code = 'INSUFFICIENT_PERMISSIONS';
          break;
        case 404:
          message = 'Resource not found';
          code = 'NOT_FOUND';
          break;
        case 429:
          message = 'Rate limit exceeded';
          code = 'RATE_LIMIT_EXCEEDED';
          break;
        case 500:
          message = 'Trello server error';
          code = 'SERVER_ERROR';
          break;
        default:
          message = `HTTP ${status} error`;
      }
      
      return {
        message,
        error: `${status} - ${response.statusText}`,
        status,
        code
      };
    }
    
    return {
      message: 'Unknown error occurred',
      error: error instanceof Error ? error.message : String(error),
      code: 'UNKNOWN_ERROR'
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: FetchOptions & { params?: Record<string, string> } = {},
    operation: string
  ): Promise<TrelloApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.buildURL(endpoint, params);
    const startTime = Date.now();
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Skip Content-Type for FormData bodies (fetch sets multipart boundary automatically)
        const isFormData = fetchOptions.body instanceof FormData;
        const headers: Record<string, string> = {
          'User-Agent': 'TrelloMCPServer/1.0.0 (Node.js 22)',
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...fetchOptions.headers as Record<string, string>
        };

        const response = await this.fetchWithTimeout(url, {
          headers,
          ...fetchOptions
        });
        
        const rateLimit = this.extractRateLimitInfo(response);
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
            logger.warn(`Rate limited, waiting ${retryAfter}s`, { 
              operation, 
              attempt, 
              maxRetries: this.retryConfig.maxRetries 
            });
            insights.trackEvent('TrelloRateLimit', { operation, attempt, retryAfter });
            await this.sleep(retryAfter * 1000);
            continue;
          }
          
          throw response;
        }
        
        const contentType = response.headers.get('content-type') ?? '';
        const hasBody = response.status !== 204 && contentType.includes('application/json');
        const data = hasBody ? await response.json() as T : null as T;
        
        logger.info(`Trello API ${operation} successful`, {
          status: response.status,
          duration: `${duration}ms`,
          rateLimit
        });
        
        insights.trackDependency('HTTP', `Trello API ${operation}`, endpoint, duration, true, response.status.toString(), {
          statusCode: response.status.toString(),
          rateLimit: rateLimit?.remaining?.toString()
        });
        
        return {
          data,
          rateLimit
        };
        
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        if (error instanceof Response && error.status === 429) {
          continue; // Already handled above
        }
        
        if (attempt < this.retryConfig.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.debug(`Retrying ${operation}`, { 
            delay: `${delay}ms`, 
            attempt, 
            maxRetries: this.retryConfig.maxRetries 
          });
          insights.trackEvent('TrelloRetry', { operation, attempt, delay });
          await this.sleep(delay);
          continue;
        }
        
        // Final attempt failed
        const trelloError = this.handleError(error);
        logger.error(`Trello API ${operation} failed`, {
          error: trelloError.message,
          status: trelloError.status,
          duration: `${duration}ms`
        });
        
        insights.trackDependency('HTTP', `Trello API ${operation}`, endpoint, duration, false, trelloError.status?.toString() || '500', {
          error: trelloError.message,
          statusCode: trelloError.status?.toString() || '500'
        });
        
        insights.trackException(new Error(trelloError.message), {
          operation,
          trelloError: JSON.stringify(trelloError)
        });
        
        throw trelloError;
      }
    }
    
    throw this.handleError(lastError);
  }

  private shouldRetry(error: unknown): boolean {
    // Network errors should be retried
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors should be retried
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }
    
    // HTTP errors
    if (error instanceof Response) {
      const status = error.status;
      return status >= 500 || status === 429; // Server errors and rate limits
    }
    
    return false;
  }

  async getMyBoards(filter?: 'all' | 'open' | 'closed'): Promise<TrelloApiResponse<TrelloBoard[]>> {
    return this.makeRequest<TrelloBoard[]>(
      '/members/me/boards',
      { params: { filter: filter || 'open' } },
      'Get user boards'
    );
  }

  async getBoard(boardId: string, includeDetails = false): Promise<TrelloApiResponse<TrelloBoard>> {
    const params: Record<string, string> = {
      lists: 'open'
    };
    if (includeDetails) {
      params.cards = 'open';
      params.card_members = 'true';
      params.card_labels = 'true';
    }

    return this.makeRequest<TrelloBoard>(
      `/boards/${boardId}`,
      { params },
      `Get board ${boardId}`
    );
  }

  async getBoardLists(boardId: string, filter?: 'all' | 'open' | 'closed'): Promise<TrelloApiResponse<TrelloList[]>> {
    return this.makeRequest<TrelloList[]>(
      `/boards/${boardId}/lists`,
      { params: { filter: filter || 'open' } },
      `Get board ${boardId} lists`
    );
  }

  async createCard(cardData: CreateCardRequest): Promise<TrelloApiResponse<TrelloCard>> {
    return this.makeRequest<TrelloCard>(
      '/cards',
      {
        method: 'POST',
        body: JSON.stringify(cardData)
      },
      `Create card "${cardData.name}"`
    );
  }

  async updateCard(cardId: string, updates: UpdateCardRequest): Promise<TrelloApiResponse<TrelloCard>> {
    return this.makeRequest<TrelloCard>(
      `/cards/${cardId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      `Update card ${cardId}`
    );
  }

  async moveCard(cardId: string, moveData: MoveCardRequest): Promise<TrelloApiResponse<TrelloCard>> {
    return this.makeRequest<TrelloCard>(
      `/cards/${cardId}`,
      {
        method: 'PUT',
        body: JSON.stringify(moveData)
      },
      `Move card ${cardId}`
    );
  }

  async getCard(cardId: string, includeDetails = false): Promise<TrelloApiResponse<TrelloCard>> {
    const params: Record<string, string> = {
      customFieldItems: 'true'
    };
    if (includeDetails) {
      params.members = 'true';
      params.labels = 'true';
      params.checklists = 'all';
      params.badges = 'true';
    }
    
    return this.makeRequest<TrelloCard>(
      `/cards/${cardId}`,
      { params },
      `Get card ${cardId}`
    );
  }

  async deleteCard(cardId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}`,
      { method: 'DELETE' },
      `Delete card ${cardId}`
    );
  }

  async getBoardMembers(boardId: string): Promise<TrelloApiResponse<TrelloMember[]>> {
    return this.makeRequest<TrelloMember[]>(
      `/boards/${boardId}/members`,
      {},
      `Get board ${boardId} members`
    );
  }

  async getBoardLabels(boardId: string): Promise<TrelloApiResponse<TrelloLabel[]>> {
    return this.makeRequest<TrelloLabel[]>(
      `/boards/${boardId}/labels`,
      {},
      `Get board ${boardId} labels`
    );
  }

  async search(query: string, options?: {
    modelTypes?: string[];
    boardIds?: string[];
    boardsLimit?: number;
    cardsLimit?: number;
    membersLimit?: number;
  }): Promise<TrelloApiResponse<TrelloSearchResults>> {
    const params: Record<string, string> = {
      query: encodeURIComponent(query)
    };

    if (options?.modelTypes) {
      params.modelTypes = options.modelTypes.join(',');
    }
    if (options?.boardIds) {
      params.idBoards = options.boardIds.join(',');
    }
    if (options?.boardsLimit) {
      params.boards_limit = options.boardsLimit.toString();
    }
    if (options?.cardsLimit) {
      params.cards_limit = options.cardsLimit.toString();
    }
    if (options?.membersLimit) {
      params.members_limit = options.membersLimit.toString();
    }

    return this.makeRequest<TrelloSearchResults>(
      '/search',
      { params },
      `Search for "${query}"`
    );
  }

  async getListCards(listId: string, options?: {
    filter?: 'all' | 'open' | 'closed';
    fields?: string[];
  }): Promise<TrelloApiResponse<TrelloCard[]>> {
    const params: Record<string, string> = {};
    
    if (options?.filter) {
      params.filter = options.filter;
    }
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }
    
    return this.makeRequest<TrelloCard[]>(
      `/lists/${listId}/cards`,
      { params },
      `Get cards in list ${listId}`
    );
  }

  async addCommentToCard(cardId: string, text: string): Promise<TrelloApiResponse<TrelloComment>> {
    return this.makeRequest<TrelloComment>(
      `/cards/${cardId}/actions/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ text })
      },
      `Add comment to card ${cardId}`
    );
  }

  async createList(listData: {
    name: string;
    idBoard: string;
    pos?: string | number;
  }): Promise<TrelloApiResponse<TrelloList>> {
    return this.makeRequest<TrelloList>(
      '/lists',
      {
        method: 'POST',
        body: JSON.stringify(listData)
      },
      `Create list "${listData.name}"`
    );
  }

  async getMember(memberId: string, options?: {
    fields?: string[];
    boards?: string;
    organizations?: string;
  }): Promise<TrelloApiResponse<TrelloMember>> {
    const params: Record<string, string> = {};

    if (options?.fields) {
      params.fields = options.fields.join(',');
    }
    if (options?.boards) {
      params.boards = options.boards;
    }
    if (options?.organizations) {
      params.organizations = options.organizations;
    }

    return this.makeRequest<TrelloMember>(
      `/members/${memberId}`,
      { params },
      `Get member ${memberId}`
    );
  }

  async getCurrentUser(): Promise<TrelloApiResponse<TrelloUser>> {
    return this.makeRequest<TrelloUser>(
      '/members/me',
      { params: { boards: 'open', organizations: 'all' } },
      'Get current user'
    );
  }

  async getBoardCards(boardId: string, options?: {
    attachments?: string;
    members?: string;
    filter?: string;
    limit?: number;
    before?: string;
    since?: string;
  }): Promise<TrelloApiResponse<TrelloCard[]>> {
    const params: Record<string, string> = {
      customFieldItems: 'true'
    };

    if (options?.attachments) {
      params.attachments = options.attachments;
    }
    if (options?.members) {
      params.members = options.members;
    }
    if (options?.filter) {
      params.filter = options.filter;
    }
    if (options?.limit) {
      params.limit = options.limit.toString();
    }
    if (options?.before) {
      params.before = options.before;
    }
    if (options?.since) {
      params.since = options.since;
    }

    return this.makeRequest<TrelloCard[]>(
      `/boards/${boardId}/cards`,
      { params },
      `Get cards in board ${boardId}`
    );
  }

  async getCardActions(cardId: string, options?: {
    filter?: string;
    limit?: number;
  }): Promise<TrelloApiResponse<TrelloAction[]>> {
    const params: Record<string, string> = {};

    if (options?.filter) {
      params.filter = options.filter;
    }
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    return this.makeRequest<TrelloAction[]>(
      `/cards/${cardId}/actions`,
      { params },
      `Get actions for card ${cardId}`
    );
  }

  async getCardAttachments(cardId: string, options?: {
    fields?: string[];
  }): Promise<TrelloApiResponse<TrelloAttachment[]>> {
    const params: Record<string, string> = {};

    if (options?.fields) {
      params.fields = options.fields.join(',');
    }

    return this.makeRequest<TrelloAttachment[]>(
      `/cards/${cardId}/attachments`,
      { params },
      `Get attachments for card ${cardId}`
    );
  }

  async createCardAttachment(cardId: string, data: {
    url?: string;
    filePath?: string;
    name?: string;
    mimeType?: string;
    setCover?: boolean;
  }): Promise<TrelloApiResponse<TrelloAttachment>> {
    if (data.filePath) {
      // File upload via multipart/form-data
      const fileBuffer = await readFile(data.filePath);
      const fileName = data.name || basename(data.filePath);
      const blob = new Blob([fileBuffer], { type: data.mimeType || 'application/octet-stream' });

      const formData = new FormData();
      formData.append('file', blob, fileName);
      if (data.name) formData.append('name', data.name);
      if (data.mimeType) formData.append('mimeType', data.mimeType);
      if (data.setCover !== undefined) formData.append('setCover', String(data.setCover));

      return this.makeRequest<TrelloAttachment>(
        `/cards/${cardId}/attachments`,
        {
          method: 'POST',
          body: formData as any
        },
        `Upload file attachment to card ${cardId}`
      );
    }

    // URL attachment via JSON body
    const body: Record<string, any> = {};
    if (data.url) body.url = data.url;
    if (data.name) body.name = data.name;
    if (data.mimeType) body.mimeType = data.mimeType;
    if (data.setCover !== undefined) body.setCover = data.setCover;

    return this.makeRequest<TrelloAttachment>(
      `/cards/${cardId}/attachments`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      },
      `Create URL attachment on card ${cardId}`
    );
  }

  async getCardAttachment(cardId: string, attachmentId: string, options?: {
    fields?: string[];
  }): Promise<TrelloApiResponse<TrelloAttachment>> {
    const params: Record<string, string> = {};

    if (options?.fields) {
      params.fields = options.fields.join(',');
    }

    return this.makeRequest<TrelloAttachment>(
      `/cards/${cardId}/attachments/${attachmentId}`,
      { params },
      `Get attachment ${attachmentId} for card ${cardId}`
    );
  }

  async deleteCardAttachment(cardId: string, attachmentId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
      `Delete attachment ${attachmentId} from card ${cardId}`
    );
  }

  async downloadAttachment(url: string): Promise<{ data: string; mimeType: string } | null> {
    if (!isAllowedAttachmentUrl(url)) {
      logger.warn('Skipping attachment download: URL not on allowlist', { url });
      return null;
    }
    try {
      const response = await this.fetchWithTimeout(url, {
        timeout: 30000,
        headers: {
          Authorization: `OAuth oauth_consumer_key="${this.credentials.apiKey}", oauth_token="${this.credentials.token}"`
        }
      });
      if (!response.ok) {
        logger.warn('Attachment download failed', { url, status: response.status });
        return null;
      }
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();
      const data = Buffer.from(buffer).toString('base64');
      return { data, mimeType };
    } catch (error) {
      logger.error('Attachment download error', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async getCardChecklists(cardId: string, options?: {
    checkItems?: string;
    fields?: string[];
  }): Promise<TrelloApiResponse<TrelloChecklist[]>> {
    const params: Record<string, string> = {};

    if (options?.checkItems) {
      params.checkItems = options.checkItems;
    }
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }

    return this.makeRequest<TrelloChecklist[]>(
      `/cards/${cardId}/checklists`,
      { params },
      `Get checklists for card ${cardId}`
    );
  }

  async createLabel(boardId: string, name: string, color: string): Promise<TrelloApiResponse<TrelloLabel>> {
    return this.makeRequest<TrelloLabel>(
      `/boards/${boardId}/labels`,
      {
        method: 'POST',
        body: JSON.stringify({ name, color })
      },
      `Create label "${name}" on board ${boardId}`
    );
  }

  async updateLabel(labelId: string, updates: { name?: string; color?: string }): Promise<TrelloApiResponse<TrelloLabel>> {
    return this.makeRequest<TrelloLabel>(
      `/labels/${labelId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      `Update label ${labelId}`
    );
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<TrelloApiResponse<string[]>> {
    return this.makeRequest<string[]>(
      `/cards/${cardId}/idLabels`,
      {
        method: 'POST',
        body: JSON.stringify({ value: labelId })
      },
      `Add label ${labelId} to card ${cardId}`
    );
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/idLabels/${labelId}`,
      { method: 'DELETE' },
      `Remove label ${labelId} from card ${cardId}`
    );
  }

  async deleteLabel(labelId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/labels/${labelId}`,
      { method: 'DELETE' },
      `Delete label ${labelId}`
    );
  }

  async addMemberToCard(cardId: string, memberId: string): Promise<TrelloApiResponse<any[]>> {
    return this.makeRequest<any[]>(
      `/cards/${cardId}/idMembers`,
      {
        method: 'POST',
        body: JSON.stringify({ value: memberId })
      },
      `Add member ${memberId} to card ${cardId}`
    );
  }

  async removeMemberFromCard(cardId: string, memberId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/idMembers/${memberId}`,
      { method: 'DELETE' },
      `Remove member ${memberId} from card ${cardId}`
    );
  }

  // Checklist methods

  async createChecklist(data: CreateChecklistRequest): Promise<TrelloApiResponse<TrelloChecklist>> {
    return this.makeRequest<TrelloChecklist>(
      '/checklists',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      `Create checklist "${data.name}" on card ${data.idCard}`
    );
  }

  async getChecklist(checklistId: string, options?: { fields?: string[] }): Promise<TrelloApiResponse<TrelloChecklist>> {
    const params: Record<string, string> = {};
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }
    return this.makeRequest<TrelloChecklist>(
      `/checklists/${checklistId}`,
      { params },
      `Get checklist ${checklistId}`
    );
  }

  async updateChecklist(checklistId: string, updates: UpdateChecklistRequest): Promise<TrelloApiResponse<TrelloChecklist>> {
    return this.makeRequest<TrelloChecklist>(
      `/checklists/${checklistId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      `Update checklist ${checklistId}`
    );
  }

  async deleteChecklist(checklistId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/checklists/${checklistId}`,
      { method: 'DELETE' },
      `Delete checklist ${checklistId}`
    );
  }

  async getChecklistField(checklistId: string, field: string): Promise<TrelloApiResponse<Record<string, string>>> {
    return this.makeRequest<Record<string, string>>(
      `/checklists/${checklistId}/${field}`,
      {},
      `Get checklist ${checklistId} field ${field}`
    );
  }

  async updateChecklistField(checklistId: string, field: string, value: string): Promise<TrelloApiResponse<Record<string, string>>> {
    return this.makeRequest<Record<string, string>>(
      `/checklists/${checklistId}/${field}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value })
      },
      `Update checklist ${checklistId} field ${field}`
    );
  }

  async getBoardForChecklist(checklistId: string): Promise<TrelloApiResponse<TrelloBoard>> {
    return this.makeRequest<TrelloBoard>(
      `/checklists/${checklistId}/board`,
      {},
      `Get board for checklist ${checklistId}`
    );
  }

  async getCardForChecklist(checklistId: string): Promise<TrelloApiResponse<TrelloCard[]>> {
    return this.makeRequest<TrelloCard[]>(
      `/checklists/${checklistId}/cards`,
      {},
      `Get card for checklist ${checklistId}`
    );
  }

  async getCheckItems(checklistId: string, options?: { filter?: string; fields?: string[] }): Promise<TrelloApiResponse<TrelloCheckItem[]>> {
    const params: Record<string, string> = {};
    if (options?.filter) {
      params.filter = options.filter;
    }
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }
    return this.makeRequest<TrelloCheckItem[]>(
      `/checklists/${checklistId}/checkItems`,
      { params },
      `Get check items for checklist ${checklistId}`
    );
  }

  async createCheckItem(checklistId: string, data: CreateCheckItemRequest): Promise<TrelloApiResponse<TrelloCheckItem>> {
    return this.makeRequest<TrelloCheckItem>(
      `/checklists/${checklistId}/checkItems`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      `Create check item "${data.name}" on checklist ${checklistId}`
    );
  }

  async getCheckItem(checklistId: string, checkItemId: string): Promise<TrelloApiResponse<TrelloCheckItem>> {
    return this.makeRequest<TrelloCheckItem>(
      `/checklists/${checklistId}/checkItems/${checkItemId}`,
      {},
      `Get check item ${checkItemId}`
    );
  }

  async deleteCheckItem(checklistId: string, checkItemId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/checklists/${checklistId}/checkItems/${checkItemId}`,
      { method: 'DELETE' },
      `Delete check item ${checkItemId}`
    );
  }

  async updateCheckItem(cardId: string, checkItemId: string, updates: UpdateCheckItemRequest): Promise<TrelloApiResponse<TrelloCheckItem>> {
    return this.makeRequest<TrelloCheckItem>(
      `/cards/${cardId}/checkItem/${checkItemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      `Update check item ${checkItemId} on card ${cardId}`
    );
  }

  async getBoardCustomFields(boardId: string): Promise<TrelloApiResponse<TrelloCustomField[]>> {
    return this.makeRequest<TrelloCustomField[]>(
      `/boards/${boardId}/customFields`,
      {},
      `Get custom fields for board ${boardId}`
    );
  }
}
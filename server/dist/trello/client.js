import { readFile } from 'fs/promises';
import { basename } from 'path';
import { logger } from '../utils/logger.js';
import { insights } from '../utils/appInsights.js';
import { isAllowedAttachmentUrl } from '../utils/imageDownload.js';
export class TrelloClient {
    baseURL = 'https://api.trello.com/1';
    credentials;
    retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
    };
    constructor(credentials) {
        this.credentials = credentials;
    }
    async fetchWithTimeout(url, options = {}) {
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
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    buildURL(endpoint, params) {
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
    extractRateLimitInfo(response) {
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
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    calculateBackoffDelay(attempt) {
        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
        return Math.min(delay, this.retryConfig.maxDelay);
    }
    handleError(error) {
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
            const response = error;
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
    async makeRequest(endpoint, options = {}, operation) {
        const { params, ...fetchOptions } = options;
        const url = this.buildURL(endpoint, params);
        const startTime = Date.now();
        let lastError;
        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                // Skip Content-Type for FormData bodies (fetch sets multipart boundary automatically)
                const isFormData = fetchOptions.body instanceof FormData;
                const headers = {
                    'User-Agent': 'TrelloMCPServer/1.0.0 (Node.js 22)',
                    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    ...fetchOptions.headers
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
                const data = hasBody ? await response.json() : null;
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
            }
            catch (error) {
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
    shouldRetry(error) {
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
    async getMyBoards(filter) {
        return this.makeRequest('/members/me/boards', { params: { filter: filter || 'open' } }, 'Get user boards');
    }
    async getBoard(boardId, includeDetails = false) {
        const params = {
            lists: 'open'
        };
        if (includeDetails) {
            params.cards = 'open';
            params.card_members = 'true';
            params.card_labels = 'true';
        }
        return this.makeRequest(`/boards/${boardId}`, { params }, `Get board ${boardId}`);
    }
    async getBoardLists(boardId, filter) {
        return this.makeRequest(`/boards/${boardId}/lists`, { params: { filter: filter || 'open' } }, `Get board ${boardId} lists`);
    }
    async createCard(cardData) {
        return this.makeRequest('/cards', {
            method: 'POST',
            body: JSON.stringify(cardData)
        }, `Create card "${cardData.name}"`);
    }
    async updateCard(cardId, updates) {
        return this.makeRequest(`/cards/${cardId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }, `Update card ${cardId}`);
    }
    async moveCard(cardId, moveData) {
        return this.makeRequest(`/cards/${cardId}`, {
            method: 'PUT',
            body: JSON.stringify(moveData)
        }, `Move card ${cardId}`);
    }
    async getCard(cardId, includeDetails = false) {
        const params = {
            customFieldItems: 'true'
        };
        if (includeDetails) {
            params.members = 'true';
            params.labels = 'true';
            params.checklists = 'all';
            params.badges = 'true';
        }
        return this.makeRequest(`/cards/${cardId}`, { params }, `Get card ${cardId}`);
    }
    async deleteCard(cardId) {
        return this.makeRequest(`/cards/${cardId}`, { method: 'DELETE' }, `Delete card ${cardId}`);
    }
    async getBoardMembers(boardId) {
        return this.makeRequest(`/boards/${boardId}/members`, {}, `Get board ${boardId} members`);
    }
    async getBoardLabels(boardId) {
        return this.makeRequest(`/boards/${boardId}/labels`, {}, `Get board ${boardId} labels`);
    }
    async search(query, options) {
        const params = {
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
        return this.makeRequest('/search', { params }, `Search for "${query}"`);
    }
    async getListCards(listId, options) {
        const params = {};
        if (options?.filter) {
            params.filter = options.filter;
        }
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        return this.makeRequest(`/lists/${listId}/cards`, { params }, `Get cards in list ${listId}`);
    }
    async addCommentToCard(cardId, text) {
        return this.makeRequest(`/cards/${cardId}/actions/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        }, `Add comment to card ${cardId}`);
    }
    async createList(listData) {
        return this.makeRequest('/lists', {
            method: 'POST',
            body: JSON.stringify(listData)
        }, `Create list "${listData.name}"`);
    }
    async getMember(memberId, options) {
        const params = {};
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        if (options?.boards) {
            params.boards = options.boards;
        }
        if (options?.organizations) {
            params.organizations = options.organizations;
        }
        return this.makeRequest(`/members/${memberId}`, { params }, `Get member ${memberId}`);
    }
    async getCurrentUser() {
        return this.makeRequest('/members/me', { params: { boards: 'open', organizations: 'all' } }, 'Get current user');
    }
    async getBoardCards(boardId, options) {
        const params = {
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
        return this.makeRequest(`/boards/${boardId}/cards`, { params }, `Get cards in board ${boardId}`);
    }
    async getCardActions(cardId, options) {
        const params = {};
        if (options?.filter) {
            params.filter = options.filter;
        }
        if (options?.limit) {
            params.limit = options.limit.toString();
        }
        return this.makeRequest(`/cards/${cardId}/actions`, { params }, `Get actions for card ${cardId}`);
    }
    async getCardAttachments(cardId, options) {
        const params = {};
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        return this.makeRequest(`/cards/${cardId}/attachments`, { params }, `Get attachments for card ${cardId}`);
    }
    async createCardAttachment(cardId, data) {
        if (data.filePath) {
            // File upload via multipart/form-data
            const fileBuffer = await readFile(data.filePath);
            const fileName = data.name || basename(data.filePath);
            const blob = new Blob([fileBuffer], { type: data.mimeType || 'application/octet-stream' });
            const formData = new FormData();
            formData.append('file', blob, fileName);
            if (data.name)
                formData.append('name', data.name);
            if (data.mimeType)
                formData.append('mimeType', data.mimeType);
            if (data.setCover !== undefined)
                formData.append('setCover', String(data.setCover));
            return this.makeRequest(`/cards/${cardId}/attachments`, {
                method: 'POST',
                body: formData
            }, `Upload file attachment to card ${cardId}`);
        }
        // URL attachment via JSON body
        const body = {};
        if (data.url)
            body.url = data.url;
        if (data.name)
            body.name = data.name;
        if (data.mimeType)
            body.mimeType = data.mimeType;
        if (data.setCover !== undefined)
            body.setCover = data.setCover;
        return this.makeRequest(`/cards/${cardId}/attachments`, {
            method: 'POST',
            body: JSON.stringify(body)
        }, `Create URL attachment on card ${cardId}`);
    }
    async getCardAttachment(cardId, attachmentId, options) {
        const params = {};
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        return this.makeRequest(`/cards/${cardId}/attachments/${attachmentId}`, { params }, `Get attachment ${attachmentId} for card ${cardId}`);
    }
    async deleteCardAttachment(cardId, attachmentId) {
        return this.makeRequest(`/cards/${cardId}/attachments/${attachmentId}`, { method: 'DELETE' }, `Delete attachment ${attachmentId} from card ${cardId}`);
    }
    async downloadAttachment(url) {
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
        }
        catch (error) {
            logger.error('Attachment download error', {
                url,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }
    async getCardChecklists(cardId, options) {
        const params = {};
        if (options?.checkItems) {
            params.checkItems = options.checkItems;
        }
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        return this.makeRequest(`/cards/${cardId}/checklists`, { params }, `Get checklists for card ${cardId}`);
    }
    async createLabel(boardId, name, color) {
        return this.makeRequest(`/boards/${boardId}/labels`, {
            method: 'POST',
            body: JSON.stringify({ name, color })
        }, `Create label "${name}" on board ${boardId}`);
    }
    async updateLabel(labelId, updates) {
        return this.makeRequest(`/labels/${labelId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }, `Update label ${labelId}`);
    }
    async addLabelToCard(cardId, labelId) {
        return this.makeRequest(`/cards/${cardId}/idLabels`, {
            method: 'POST',
            body: JSON.stringify({ value: labelId })
        }, `Add label ${labelId} to card ${cardId}`);
    }
    async removeLabelFromCard(cardId, labelId) {
        return this.makeRequest(`/cards/${cardId}/idLabels/${labelId}`, { method: 'DELETE' }, `Remove label ${labelId} from card ${cardId}`);
    }
    async deleteLabel(labelId) {
        return this.makeRequest(`/labels/${labelId}`, { method: 'DELETE' }, `Delete label ${labelId}`);
    }
    async addMemberToCard(cardId, memberId) {
        return this.makeRequest(`/cards/${cardId}/idMembers`, {
            method: 'POST',
            body: JSON.stringify({ value: memberId })
        }, `Add member ${memberId} to card ${cardId}`);
    }
    async removeMemberFromCard(cardId, memberId) {
        return this.makeRequest(`/cards/${cardId}/idMembers/${memberId}`, { method: 'DELETE' }, `Remove member ${memberId} from card ${cardId}`);
    }
    // Checklist methods
    async createChecklist(data) {
        return this.makeRequest('/checklists', {
            method: 'POST',
            body: JSON.stringify(data)
        }, `Create checklist "${data.name}" on card ${data.idCard}`);
    }
    async getChecklist(checklistId, options) {
        const params = {};
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        return this.makeRequest(`/checklists/${checklistId}`, { params }, `Get checklist ${checklistId}`);
    }
    async updateChecklist(checklistId, updates) {
        return this.makeRequest(`/checklists/${checklistId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }, `Update checklist ${checklistId}`);
    }
    async deleteChecklist(checklistId) {
        return this.makeRequest(`/checklists/${checklistId}`, { method: 'DELETE' }, `Delete checklist ${checklistId}`);
    }
    async getChecklistField(checklistId, field) {
        return this.makeRequest(`/checklists/${checklistId}/${field}`, {}, `Get checklist ${checklistId} field ${field}`);
    }
    async updateChecklistField(checklistId, field, value) {
        return this.makeRequest(`/checklists/${checklistId}/${field}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        }, `Update checklist ${checklistId} field ${field}`);
    }
    async getBoardForChecklist(checklistId) {
        return this.makeRequest(`/checklists/${checklistId}/board`, {}, `Get board for checklist ${checklistId}`);
    }
    async getCardForChecklist(checklistId) {
        return this.makeRequest(`/checklists/${checklistId}/cards`, {}, `Get card for checklist ${checklistId}`);
    }
    async getCheckItems(checklistId, options) {
        const params = {};
        if (options?.filter) {
            params.filter = options.filter;
        }
        if (options?.fields) {
            params.fields = options.fields.join(',');
        }
        return this.makeRequest(`/checklists/${checklistId}/checkItems`, { params }, `Get check items for checklist ${checklistId}`);
    }
    async createCheckItem(checklistId, data) {
        return this.makeRequest(`/checklists/${checklistId}/checkItems`, {
            method: 'POST',
            body: JSON.stringify(data)
        }, `Create check item "${data.name}" on checklist ${checklistId}`);
    }
    async getCheckItem(checklistId, checkItemId) {
        return this.makeRequest(`/checklists/${checklistId}/checkItems/${checkItemId}`, {}, `Get check item ${checkItemId}`);
    }
    async deleteCheckItem(checklistId, checkItemId) {
        return this.makeRequest(`/checklists/${checklistId}/checkItems/${checkItemId}`, { method: 'DELETE' }, `Delete check item ${checkItemId}`);
    }
    async updateCheckItem(cardId, checkItemId, updates) {
        return this.makeRequest(`/cards/${cardId}/checkItem/${checkItemId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }, `Update check item ${checkItemId} on card ${cardId}`);
    }
    async getBoardCustomFields(boardId) {
        return this.makeRequest(`/boards/${boardId}/customFields`, {}, `Get custom fields for board ${boardId}`);
    }
}
//# sourceMappingURL=client.js.map
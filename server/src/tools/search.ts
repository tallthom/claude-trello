import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import { formatValidationError, trelloIdSchema, extractCredentials } from '../utils/validation.js';

const validateSearch = (args: unknown) => {
  const schema = z.object({
    query: z.string().min(1, 'Search query is required'),
    modelTypes: z.array(z.enum(['boards', 'cards', 'members', 'organizations'])).optional(),
    boardIds: z.array(trelloIdSchema).optional(),
    boardsLimit: z.number().min(1).max(1000).optional(),
    cardsLimit: z.number().min(1).max(1000).optional(),
    membersLimit: z.number().min(1).max(1000).optional(),
    descriptionMaxLength: z.number().min(0).max(10000).optional(),
    compact: z.boolean().optional()
  });

  return schema.parse(args);
};

function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (maxLength === 0) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export const trelloSearchTool: Tool = {
  name: 'trello_search',
  description: 'Universal search across all Trello content (boards, cards, members). Use this to find specific items by keywords or phrases.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (optional if TRELLO_API_KEY env var is set)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (optional if TRELLO_TOKEN env var is set)'
      },
      query: {
        type: 'string',
        description: 'Search term or phrase to find in Trello content',
        minLength: 1
      },
      modelTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['boards', 'cards', 'members', 'organizations']
        },
        description: 'Types of content to search in. Defaults to all types if not specified',
        default: ['boards', 'cards', 'members']
      },
      boardIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional: limit search to specific boards by their IDs or URLs'
      },
      boardsLimit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of boards to return in results',
        default: 10
      },
      cardsLimit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of cards to return in results',
        default: 50
      },
      membersLimit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of members to return in results',
        default: 20
      },
      descriptionMaxLength: {
        type: 'number',
        minimum: 0,
        maximum: 10000,
        description: 'Maximum length for descriptions (0 to exclude descriptions). Default: 200',
        default: 200
      },
      compact: {
        type: 'boolean',
        description: 'Return minimal fields only (id, name, url). Default: true. Set to false for full details.',
        default: true
      }
    },
    required: ['query']
  }
};

export async function handleTrelloSearch(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { query, modelTypes, boardIds, boardsLimit, cardsLimit, membersLimit, descriptionMaxLength, compact } = validateSearch(params);
    const client = new TrelloClient(credentials);

    // Default to 200 chars for descriptions to keep responses manageable
    const maxDescLen = descriptionMaxLength ?? 200;
    // Default to compact mode for smaller responses
    const useCompact = compact ?? true;

    const searchOptions = {
      ...(modelTypes && { modelTypes }),
      ...(boardIds && { boardIds }),
      ...(boardsLimit !== undefined && { boardsLimit }),
      ...(cardsLimit !== undefined && { cardsLimit }),
      ...(membersLimit !== undefined && { membersLimit })
    };

    const response = await client.search(query, Object.keys(searchOptions).length > 0 ? searchOptions : undefined);
    const searchResults = response.data;

    // Build result based on compact mode (default: true)
    const result = useCompact ? {
      summary: `Search results for: "${query}" (compact mode)`,
      query,
      boards: searchResults.boards?.map((board: any) => ({
        id: board.id,
        name: board.name,
        url: board.shortUrl
      })) || [],
      cards: searchResults.cards?.map((card: any) => ({
        id: card.id,
        name: card.name,
        url: card.shortUrl,
        listId: card.idList,
        boardId: card.idBoard
      })) || [],
      members: searchResults.members?.map((member: any) => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username
      })) || [],
      organizations: searchResults.organizations?.map((org: any) => ({
        id: org.id,
        name: org.name,
        displayName: org.displayName
      })) || [],
      totalResults: {
        boards: searchResults.boards?.length || 0,
        cards: searchResults.cards?.length || 0,
        members: searchResults.members?.length || 0,
        organizations: searchResults.organizations?.length || 0
      },
      rateLimit: response.rateLimit
    } : {
      summary: `Search results for: "${query}"`,
      query,
      boards: searchResults.boards?.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: truncateText(board.desc, maxDescLen) || 'No description',
        url: board.shortUrl,
        closed: board.closed,
        lastActivity: board.dateLastActivity
      })) || [],
      cards: searchResults.cards?.map((card: any) => ({
        id: card.id,
        name: card.name,
        description: truncateText(card.desc, maxDescLen) || 'No description',
        url: card.shortUrl,
        listId: card.idList,
        boardId: card.idBoard,
        due: card.due,
        start: card.start,
        closed: card.closed,
        labels: card.labels?.map((label: any) => ({
          id: label.id,
          name: label.name,
          color: label.color
        })) || []
      })) || [],
      members: searchResults.members?.map((member: any) => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username,
        bio: truncateText(member.bio, maxDescLen),
        url: member.url
      })) || [],
      organizations: searchResults.organizations?.map((org: any) => ({
        id: org.id,
        name: org.name,
        displayName: org.displayName,
        description: truncateText(org.desc, maxDescLen),
        url: org.url
      })) || [],
      totalResults: {
        boards: searchResults.boards?.length || 0,
        cards: searchResults.cards?.length || 0,
        members: searchResults.members?.length || 0,
        organizations: searchResults.organizations?.length || 0
      },
      rateLimit: response.rateLimit
    };
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError 
      ? formatValidationError(error)
      : error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error searching Trello: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
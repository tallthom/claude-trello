import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import {
  validateCreateCard,
  validateUpdateCard,
  validateMoveCard,
  validateGetCard,
  formatValidationError,
  trelloIdSchema,
  extractCredentials
} from '../utils/validation.js';
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  isAllowedAttachmentUrl,
  imageDownloadEnabled
} from '../utils/imageDownload.js';

export const createCardTool: Tool = {
  name: 'create_card',
  description: 'Create a new card in a Trello list. Use this to add tasks, ideas, or items to your workflow.',
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
      name: {
        type: 'string',
        description: 'Name/title of the card (what the task or item is about)'
      },
      desc: {
        type: 'string',
        description: 'Optional detailed description of the card'
      },
      idList: {
        type: 'string',
        description: 'ID of the list where the card will be created (you can get this from get_lists)'
      },
      pos: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', enum: ['top', 'bottom'] }
        ],
        description: 'Position in the list: "top", "bottom", or specific number'
      },
      due: {
        type: 'string',
        format: 'date-time',
        description: 'Optional due date for the card (ISO 8601 format, e.g., "2024-12-31T23:59:59Z")'
      },
      start: {
        type: 'string',
        format: 'date-time',
        description: 'Optional start date for the card (ISO 8601 format, e.g., "2024-12-01T09:00:00Z")'
      },
      idMembers: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional array of member IDs to assign to the card'
      },
      idLabels: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional array of label IDs to categorize the card'
      }
    },
    required: ['name', 'idList']
  }
};

export async function handleCreateCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const createData = validateCreateCard(params);

    const client = new TrelloClient(credentials);
    const response = await client.createCard(createData);
    const card = response.data;
    
    const result = {
      summary: `Created card: ${card.name}`,
      card: {
        id: card.id,
        name: card.name,
        description: card.desc || 'No description',
        url: card.shortUrl,
        listId: card.idList,
        boardId: card.idBoard,
        position: card.pos,
        due: card.due,
        start: card.start,
        closed: card.closed,
        labels: card.labels?.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color
        })) || [],
        members: card.members?.map(member => ({
          id: member.id,
          fullName: member.fullName,
          username: member.username
        })) || []
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
          text: `Error creating card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const updateCardTool: Tool = {
  name: 'update_card',
  description: 'Update properties of an existing Trello card. Use this to change card details like name, description, due date, or status.',
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
      cardId: {
        type: 'string',
        description: 'ID or URL of the card to update (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      name: {
        type: 'string',
        description: 'New name/title for the card'
      },
      desc: {
        type: 'string',
        description: 'New description for the card'
      },
      closed: {
        type: 'boolean',
        description: 'Set to true to archive the card, false to unarchive'
      },
      due: {
        type: ['string', 'null'],
        format: 'date-time',
        description: 'Set due date (ISO 8601 format) or null to remove due date'
      },
      dueComplete: {
        type: 'boolean',
        description: 'Mark the due date as complete (true) or incomplete (false)'
      },
      start: {
        type: ['string', 'null'],
        format: 'date-time',
        description: 'Set start date (ISO 8601 format) or null to remove start date'
      },
      idList: {
        type: 'string',
        description: 'Move card to a different list by providing the list ID'
      },
      pos: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', enum: ['top', 'bottom'] }
        ],
        description: 'Change position in the list: "top", "bottom", or specific number'
      }
    },
    required: ['cardId']
  }
};

export async function handleUpdateCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, ...updates } = validateUpdateCard(params);

    const client = new TrelloClient(credentials);
    const response = await client.updateCard(cardId, updates);
    const card = response.data;
    
    const result = {
      summary: `Updated card: ${card.name}`,
      card: {
        id: card.id,
        name: card.name,
        description: card.desc || 'No description',
        url: card.shortUrl,
        listId: card.idList,
        boardId: card.idBoard,
        position: card.pos,
        due: card.due,
        dueComplete: card.dueComplete,
        start: card.start,
        closed: card.closed,
        labels: card.labels?.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color
        })) || []
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
          text: `Error updating card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const moveCardTool: Tool = {
  name: 'move_card',
  description: 'Move a card to a different list. Use this to change a card\'s workflow status (e.g., from "To Do" to "In Progress").',
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
      cardId: {
        type: 'string',
        description: 'ID or URL of the card to move (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      idList: {
        type: 'string',
        description: 'ID of the destination list (you can get this from get_lists)'
      },
      pos: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', enum: ['top', 'bottom'] }
        ],
        description: 'Position in the destination list: "top", "bottom", or specific number'
      }
    },
    required: ['cardId', 'idList']
  }
};

export async function handleMoveCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, ...moveParams } = validateMoveCard(params);

    const client = new TrelloClient(credentials);
    const response = await client.moveCard(cardId, moveParams);
    const card = response.data;
    
    const result = {
      summary: `Moved card "${card.name}" to list ${card.idList}`,
      card: {
        id: card.id,
        name: card.name,
        url: card.shortUrl,
        listId: card.idList,
        boardId: card.idBoard,
        position: card.pos
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
          text: `Error moving card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const getCardTool: Tool = {
  name: 'get_card',
  description: 'Get detailed information about a specific Trello card, including its content, status, members, and attachments.',
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
      cardId: {
        type: 'string',
        description: 'ID or URL of the card to retrieve (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      includeDetails: {
        type: 'boolean',
        description: 'Include additional details like members, labels, checklists, and activity badges',
        default: false
      }
    },
    required: ['cardId']
  }
};

export async function handleGetCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, includeDetails } = validateGetCard(params);

    const client = new TrelloClient(credentials);
    const downloadImages = imageDownloadEnabled();

    const [response, attachmentsResponse] = await Promise.all([
      client.getCard(cardId, includeDetails),
      downloadImages ? client.getCardAttachments(cardId) : Promise.resolve(null)
    ]);
    const card = response.data;
    const attachments = attachmentsResponse?.data ?? [];

    type ImageContentBlock = { type: 'image'; data: string; mimeType: string };
    const imageBlocks: ImageContentBlock[] = [];
    const imageStatus: string[] = [];

    if (downloadImages && attachments.length > 0) {
      const eligible = attachments.filter(a =>
        a.mimeType &&
        IMAGE_MIME_TYPES.has(a.mimeType) &&
        a.bytes <= MAX_IMAGE_BYTES &&
        isAllowedAttachmentUrl(a.url)
      );
      const skipped = attachments.filter(a =>
        a.mimeType && IMAGE_MIME_TYPES.has(a.mimeType) && !eligible.includes(a)
      );
      for (const a of skipped) {
        const reason = a.bytes > MAX_IMAGE_BYTES
          ? `>${MAX_IMAGE_BYTES} bytes`
          : 'url not on allowlist';
        imageStatus.push(`skipped ${a.name} (${reason})`);
      }
      const downloads = await Promise.all(eligible.map(a => client.downloadAttachment(a.url)));
      for (let i = 0; i < eligible.length; i++) {
        const a = eligible[i];
        const dl = downloads[i];
        if (dl) {
          imageBlocks.push({ type: 'image', data: dl.data, mimeType: dl.mimeType });
          imageStatus.push(`downloaded ${a.name} (${dl.mimeType}, ${a.bytes} bytes)`);
        } else {
          imageStatus.push(`failed ${a.name}`);
        }
      }
    }

    const result = {
      summary: `Card: ${card.name}`,
      card: {
        id: card.id,
        name: card.name,
        description: card.desc || 'No description',
        url: card.shortUrl,
        listId: card.idList,
        boardId: card.idBoard,
        position: card.pos,
        due: card.due,
        dueComplete: card.dueComplete,
        start: card.start,
        closed: card.closed,
        lastActivity: card.dateLastActivity,
        ...(downloadImages && {
          attachments: attachments.map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            mimeType: a.mimeType,
            bytes: a.bytes,
            isImage: !!a.mimeType && IMAGE_MIME_TYPES.has(a.mimeType)
          })),
          imageDownloads: imageStatus
        }),
        ...(includeDetails && {
          labels: card.labels?.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
          })) || [],
          members: card.members?.map(member => ({
            id: member.id,
            fullName: member.fullName,
            username: member.username,
            initials: member.initials
          })) || [],
          checklists: card.checklists?.map(checklist => ({
            id: checklist.id,
            name: checklist.name,
            checkItems: checklist.checkItems?.map(item => ({
              id: item.id,
              name: item.name,
              state: item.state,
              due: item.due
            })) || []
          })) || [],
          badges: card.badges ? {
            votes: card.badges.votes,
            comments: card.badges.comments,
            attachments: card.badges.attachments,
            checkItems: card.badges.checkItems,
            checkItemsChecked: card.badges.checkItemsChecked,
            description: card.badges.description
          } : undefined
        })
      },
      rateLimit: response.rateLimit
    };

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ...imageBlocks
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
          text: `Error getting card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

const validateArchiveCard = (args: unknown) => {
  const schema = z.object({
    cardId: trelloIdSchema,
    value: z.boolean().describe('true to archive, false to unarchive')
  });
  return schema.parse(args);
};

export const trelloArchiveCardTool: Tool = {
  name: 'trello_archive_card',
  description: 'Archive or unarchive a Trello card. Set value to true to archive, false to unarchive.',
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
      cardId: {
        type: 'string',
        description: 'ID or URL of the card to archive/unarchive (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      value: {
        type: 'boolean',
        description: 'true to archive, false to unarchive'
      }
    },
    required: ['cardId', 'value']
  }
};

export async function handleArchiveCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, value } = validateArchiveCard(params);
    const client = new TrelloClient(credentials);

    const response = await client.updateCard(cardId, { closed: value });
    const card = response.data;

    const result = {
      summary: value ? 'Card archived successfully' : 'Card unarchived successfully',
      card: {
        id: card.id,
        name: card.name,
        url: card.shortUrl,
        closed: card.closed
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
          text: `Error archiving card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
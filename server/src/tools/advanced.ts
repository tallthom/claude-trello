import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import { formatError, trelloIdSchema, extractCredentials } from '../utils/validation.js';

function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (maxLength === 0) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

const validateGetBoardCustomFields = (args: unknown) => {
  const schema = z.object({

    boardId: trelloIdSchema
  });

  return schema.parse(args);
};

const validateGetBoardCards = (args: unknown) => {
  const schema = z.object({

    boardId: trelloIdSchema,
    attachments: z.string().optional(),
    members: z.string().optional(),
    filter: z.string().optional(),
    limit: z.number().min(1).max(1000).optional(),
    descriptionMaxLength: z.number().min(0).max(10000).optional(),
    compact: z.boolean().optional()
  });

  return schema.parse(args);
};

const validateGetCardActions = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    filter: z.string().optional(),
    limit: z.number().min(1).max(1000).optional()
  });

  return schema.parse(args);
};

const validateGetCardAttachments = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    fields: z.array(z.string()).optional()
  });

  return schema.parse(args);
};

const validateCreateCardAttachment = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    url: z.string().url().optional(),
    filePath: z.string().optional(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    setCover: z.boolean().optional()
  }).refine(data => data.url || data.filePath, {
    message: 'Either url or filePath must be provided'
  });

  return schema.parse(args);
};

const validateGetCardAttachment = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    attachmentId: z.string().min(1, 'Attachment ID is required'),
    fields: z.array(z.string()).optional()
  });

  return schema.parse(args);
};

const validateDeleteCardAttachment = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    attachmentId: z.string().min(1, 'Attachment ID is required')
  });

  return schema.parse(args);
};

const validateGetCardChecklists = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    checkItems: z.string().optional(),
    fields: z.array(z.string()).optional()
  });

  return schema.parse(args);
};

const validateGetBoardMembers = (args: unknown) => {
  const schema = z.object({

    boardId: trelloIdSchema
  });

  return schema.parse(args);
};

const validateGetBoardLabels = (args: unknown) => {
  const schema = z.object({

    boardId: trelloIdSchema
  });

  return schema.parse(args);
};

const validateCreateLabel = (args: unknown) => {
  const schema = z.object({

    boardId: trelloIdSchema,
    name: z.string().min(1, 'Label name is required').max(16384, 'Label name too long'),
    color: z.string().min(1, 'Color is required')
  });

  return schema.parse(args);
};

const validateUpdateLabel = (args: unknown) => {
  const schema = z.object({

    labelId: trelloIdSchema,
    name: z.string().min(1).max(16384).optional(),
    color: z.string().min(1).optional()
  }).refine(data => Boolean(data.name || data.color), {
    message: 'At least one of name or color must be provided',
    path: ['name']
  });

  return schema.parse(args);
};

const validateAddLabelToCard = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    labelId: trelloIdSchema
  });

  return schema.parse(args);
};

const validateRemoveLabelFromCard = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    labelId: trelloIdSchema
  });

  return schema.parse(args);
};

export const trelloGetBoardCardsTool: Tool = {
  name: 'trello_get_board_cards',
  description: 'Get all cards from a Trello board with optional filtering and detailed information like attachments and members.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'ID or URL of the board (e.g. "abc123" or "https://trello.com/b/abc123/board-name")',

      },
      attachments: {
        type: 'string',
        enum: ['cover', 'true', 'false'],
        description: 'Include attachment information: "cover" for cover images, "true" for all attachments',
        default: 'false'
      },
      members: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Include member information for each card',
        default: 'true'
      },
      filter: {
        type: 'string',
        enum: ['all', 'open', 'closed'],
        description: 'Filter cards by status',
        default: 'open'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of cards to return. Default: 50',
        default: 50
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
        description: 'Return minimal fields only (id, name, url, listId). Default: true. Set to false for full details.',
        default: true
      }
    },
    required: ['boardId']
  }
};

export async function handleTrelloGetBoardCards(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { boardId, attachments, members, filter, limit, descriptionMaxLength, compact} = validateGetBoardCards(params);
    const client = new TrelloClient(credentials);

    // Default to 200 chars for descriptions and 50 cards limit
    const maxDescLen = descriptionMaxLength ?? 200;
    const cardLimit = limit ?? 50;
    // Default to compact mode for smaller responses
    const useCompact = compact ?? true;

    const response = await client.getBoardCards(boardId, {
      ...(attachments && { attachments }),
      ...(members && { members }),
      ...(filter && { filter }),
      limit: cardLimit
    });
    let cards = response.data;

    // Apply limit if returned more than requested (API may return more)
    if (cards.length > cardLimit) {
      cards = cards.slice(0, cardLimit);
    }

    const totalReturned = cards.length;
    const hasMore = response.data.length > cardLimit;

    // Build result based on compact mode (default: true)
    const result = useCompact ? {
      summary: `Found ${totalReturned} card(s) in board${hasMore ? ' (more available)' : ''}`,
      boardId,
      hasMore,
      cards: cards.map(card => ({
        id: card.id,
        name: card.name,
        url: card.shortUrl,
        listId: card.idList
      })),
      rateLimit: response.rateLimit
    } : {
      summary: `Found ${totalReturned} card(s) in board${hasMore ? ' (more available, use limit parameter)' : ''}`,
      boardId,
      hasMore,
      cards: cards.map(card => ({
        id: card.id,
        name: card.name,
        description: truncateText(card.desc, maxDescLen) || 'No description',
        url: card.shortUrl,
        listId: card.idList,
        position: card.pos,
        due: card.due,
        dueComplete: card.dueComplete,
        start: card.start,
        closed: card.closed,
        lastActivity: card.dateLastActivity,
        labels: card.labels?.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color
        })) || [],
        members: card.members?.map(member => ({
          id: member.id,
          fullName: member.fullName,
          username: member.username
        })) || [],
        attachments: card.attachments?.map(attachment => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          mimeType: attachment.mimeType,
          date: attachment.date
        })) || [],
        customFieldItems: card.customFieldItems || []
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting board cards: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetCardActionsTool: Tool = {
  name: 'trello_get_card_actions',
  description: 'Get activity history and comments for a specific Trello card. Useful for tracking changes and discussions.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card (e.g. "abc123" or "https://trello.com/c/abc123/1-title")',

      },
      filter: {
        type: 'string',
        enum: ['all', 'commentCard', 'updateCard', 'createCard'],
        description: 'Filter actions by type: "commentCard" for comments only, "updateCard" for updates',
        default: 'commentCard'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of actions to return',
        default: 50
      }
    },
    required: ['cardId']
  }
};

export async function handleTrelloGetCardActions(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, filter, limit} = validateGetCardActions(params);
    const client = new TrelloClient(credentials);

    const response = await client.getCardActions(cardId, {
      ...(filter && { filter }),
      ...(limit !== undefined && { limit })
    });
    const actions = response.data ?? [];

    const result = {
      summary: `Found ${actions.length} action(s) for card`,
      cardId,
      actions: actions.map(action => ({
        id: action.id,
        type: action.type,
        date: action.date,
        memberCreator: action.memberCreator ? {
          id: action.memberCreator.id,
          fullName: action.memberCreator.fullName,
          username: action.memberCreator.username
        } : null,
        data: {
          text: action.data?.text,
          old: action.data?.old,
          card: action.data?.card ? {
            id: action.data.card.id,
            name: action.data.card.name
          } : null,
          list: action.data?.list ? {
            id: action.data.list.id,
            name: action.data.list.name
          } : null
        }
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting card actions: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetCardAttachmentsTool: Tool = {
  name: 'trello_get_card_attachments',
  description: 'Get all attachments (files, links) for a specific Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card (e.g. "abc123" or "https://trello.com/c/abc123/1-title")',

      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: specific fields to include (e.g., ["name", "url", "mimeType", "date"])'
      }
    },
    required: ['cardId']
  }
};

export async function handleTrelloGetCardAttachments(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, fields} = validateGetCardAttachments(params);
    const client = new TrelloClient(credentials);

    const response = await client.getCardAttachments(cardId, {
      ...(fields && { fields })
    });
    const attachments = response.data;

    const result = {
      summary: `Found ${attachments.length} attachment(s) for card`,
      cardId,
      attachments: attachments.map(attachment => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
        date: attachment.date,
        bytes: attachment.bytes,
        isUpload: attachment.isUpload,
        previews: attachment.previews?.map(preview => ({
          id: preview.id,
          width: preview.width,
          height: preview.height,
          url: preview.url
        })) || []
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting card attachments: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetCardChecklistsTool: Tool = {
  name: 'trello_get_card_checklists',
  description: 'Get all checklists and their items for a specific Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card (e.g. "abc123" or "https://trello.com/c/abc123/1-title")',

      },
      checkItems: {
        type: 'string',
        enum: ['all', 'none'],
        description: 'Include checklist items in response',
        default: 'all'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: specific fields to include (e.g., ["name", "pos"])'
      }
    },
    required: ['cardId']
  }
};

export async function handleTrelloGetCardChecklists(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, checkItems, fields} = validateGetCardChecklists(params);
    const client = new TrelloClient(credentials);

    const response = await client.getCardChecklists(cardId, {
      ...(checkItems && { checkItems }),
      ...(fields && { fields })
    });
    const checklists = response.data;

    const result = {
      summary: `Found ${checklists.length} checklist(s) for card`,
      cardId,
      checklists: checklists.map(checklist => ({
        id: checklist.id,
        name: checklist.name,
        position: checklist.pos,
        checkItems: checklist.checkItems?.map((item: any) => ({
          id: item.id,
          name: item.name,
          state: item.state,
          position: item.pos,
          due: item.due,
          nameData: item.nameData
        })) || []
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting card checklists: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetBoardMembersTool: Tool = {
  name: 'trello_get_board_members',
  description: 'Get all members who have access to a specific Trello board.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'ID or URL of the board (e.g. "abc123" or "https://trello.com/b/abc123/board-name")',

      }
    },
    required: ['boardId']
  }
};

export async function handleTrelloGetBoardMembers(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { boardId} = validateGetBoardMembers(params);
    const client = new TrelloClient(credentials);

    const response = await client.getBoardMembers(boardId);
    const members = response.data;

    const result = {
      summary: `Found ${members.length} member(s) on board`,
      boardId,
      members: members.map(member => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username,
        memberType: member.memberType,
        confirmed: member.confirmed,
        avatarUrl: member.avatarUrl,
        initials: member.initials
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting board members: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetBoardLabelsTool: Tool = {
  name: 'trello_get_board_labels',
  description: 'Get all labels available on a specific Trello board for categorizing cards.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'ID or URL of the board (e.g. "abc123" or "https://trello.com/b/abc123/board-name")',

      }
    },
    required: ['boardId']
  }
};

export async function handleTrelloGetBoardLabels(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { boardId} = validateGetBoardLabels(params);
    const client = new TrelloClient(credentials);

    const response = await client.getBoardLabels(boardId);
    const labels = response.data;

    const result = {
      summary: `Found ${labels.length} label(s) on board`,
      boardId,
      labels: labels.map(label => ({
        id: label.id,
        name: label.name,
        color: label.color,
        uses: label.uses
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting board labels: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloCreateLabelTool: Tool = {
  name: 'trello_create_label',
  description: 'Create a new label on a Trello board.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'ID or URL of the board where the label will be created',

      },
      name: {
        type: 'string',
        description: 'Name of the label',
        minLength: 1
      },
      color: {
        type: 'string',
        description: 'Color of the label (e.g., green, yellow, orange, red, purple, blue, sky, lime, pink, black)'
      }
    },
    required: ['boardId', 'name', 'color']
  }
};

export async function handleTrelloCreateLabel(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { boardId, name, color} = validateCreateLabel(params);
    const client = new TrelloClient(credentials);

    const response = await client.createLabel(boardId, name, color);
    const label = response.data;

    const result = {
      summary: `Created label "${label.name}" on board`,
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        boardId: label.idBoard,
        uses: label.uses
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error creating label: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloUpdateLabelTool: Tool = {
  name: 'trello_update_label',
  description: 'Update the name or color of an existing Trello label.',
  inputSchema: {
    type: 'object',
    properties: {
      labelId: {
        type: 'string',
        description: 'ID of the label to update',

      },
      name: {
        type: 'string',
        description: 'New name for the label',
        minLength: 1
      },
      color: {
        type: 'string',
        description: 'New color for the label'
      }
    },
    required: ['labelId']
  }
};

export async function handleTrelloUpdateLabel(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { labelId, name, color} = validateUpdateLabel(params);
    const client = new TrelloClient(credentials);

    const response = await client.updateLabel(labelId, { ...(name && { name }), ...(color && { color }) });
    const label = response.data;

    const result = {
      summary: `Updated label ${label.id}`,
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        boardId: label.idBoard,
        uses: label.uses
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error updating label: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloAddLabelToCardTool: Tool = {
  name: 'trello_add_label_to_card',
  description: 'Assign an existing label to a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID of the card to label',

      },
      labelId: {
        type: 'string',
        description: 'ID of the label to add',

      }
    },
    required: ['cardId', 'labelId']
  }
};

export async function handleTrelloAddLabelToCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, labelId} = validateAddLabelToCard(params);
    const client = new TrelloClient(credentials);

    const response = await client.addLabelToCard(cardId, labelId);

    const result = {
      summary: `Added label ${labelId} to card ${cardId}`,
      cardId,
      labels: response.data,
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error adding label to card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloRemoveLabelFromCardTool: Tool = {
  name: 'trello_remove_label_from_card',
  description: 'Remove a label from a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID of the card to remove the label from',

      },
      labelId: {
        type: 'string',
        description: 'ID of the label to remove',

      }
    },
    required: ['cardId', 'labelId']
  }
};

export async function handleTrelloRemoveLabelFromCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, labelId} = validateRemoveLabelFromCard(params);
    const client = new TrelloClient(credentials);

    const response = await client.removeLabelFromCard(cardId, labelId);

    const result = {
      summary: `Removed label ${labelId} from card ${cardId}`,
      cardId,
      labelId,
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error removing label from card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// Attachment management tools

export const trelloCreateCardAttachmentTool: Tool = {
  name: 'trello_create_card_attachment',
  description: 'Attach a URL or local file to a Trello card. Provide either a url (for link attachments) or filePath (for file uploads from the local filesystem).',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      url: {
        type: 'string',
        description: 'URL to attach as a link (e.g. "https://example.com/doc.pdf"). Cannot be used with filePath.'
      },
      filePath: {
        type: 'string',
        description: 'Absolute path to a local file to upload (e.g. "/home/user/report.pdf"). Cannot be used with url.'
      },
      name: {
        type: 'string',
        description: 'Optional display name for the attachment'
      },
      mimeType: {
        type: 'string',
        description: 'Optional MIME type (e.g. "application/pdf", "image/png"). Auto-detected for file uploads if omitted.'
      },
      setCover: {
        type: 'boolean',
        description: 'If true, set this attachment as the card cover image'
      }
    },
    required: ['cardId']
  }
};

export async function handleTrelloCreateCardAttachment(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, url, filePath, name, mimeType, setCover} = validateCreateCardAttachment(params);
    const client = new TrelloClient(credentials);

    const response = await client.createCardAttachment(cardId, {
      ...(url && { url }),
      ...(filePath && { filePath }),
      ...(name && { name }),
      ...(mimeType && { mimeType }),
      ...(setCover !== undefined && { setCover })
    });
    const attachment = response.data;

    const result = {
      summary: filePath
        ? `Uploaded file attachment to card ${cardId}`
        : `Attached URL to card ${cardId}`,
      cardId,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
        bytes: attachment.bytes,
        isUpload: attachment.isUpload,
        date: attachment.date
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error creating attachment: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetCardAttachmentTool: Tool = {
  name: 'trello_get_card_attachment',
  description: 'Get details of a single attachment on a Trello card by its attachment ID.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      attachmentId: {
        type: 'string',
        description: 'ID of the attachment to retrieve'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: specific fields to include (e.g., ["name", "url", "mimeType", "date"])'
      }
    },
    required: ['cardId', 'attachmentId']
  }
};

export async function handleTrelloGetCardAttachment(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, attachmentId, fields} = validateGetCardAttachment(params);
    const client = new TrelloClient(credentials);

    const response = await client.getCardAttachment(cardId, attachmentId, {
      ...(fields && { fields })
    });
    const attachment = response.data;

    const result = {
      summary: `Retrieved attachment ${attachmentId} from card ${cardId}`,
      cardId,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
        date: attachment.date,
        bytes: attachment.bytes,
        isUpload: attachment.isUpload,
        pos: attachment.pos,
        edgeColor: attachment.edgeColor,
        previews: attachment.previews?.map(preview => ({
          id: preview.id,
          width: preview.width,
          height: preview.height,
          url: preview.url
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting attachment: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloDeleteCardAttachmentTool: Tool = {
  name: 'trello_delete_card_attachment',
  description: 'Delete an attachment from a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card (e.g. "abc123" or "https://trello.com/c/abc123/1-title")'
      },
      attachmentId: {
        type: 'string',
        description: 'ID of the attachment to delete'
      }
    },
    required: ['cardId', 'attachmentId']
  }
};

export async function handleTrelloDeleteCardAttachment(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, attachmentId} = validateDeleteCardAttachment(params);
    const client = new TrelloClient(credentials);

    const response = await client.deleteCardAttachment(cardId, attachmentId);

    const result = {
      summary: `Deleted attachment ${attachmentId} from card ${cardId}`,
      cardId,
      attachmentId,
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error deleting attachment: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloGetBoardCustomFieldsTool: Tool = {
  name: 'trello_get_board_custom_fields',
  description: 'Get all custom field definitions for a Trello board. Returns field names, types, and options.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'ID or URL of the board to get custom fields from'
      }
    },
    required: ['boardId']
  }
};

export async function handleTrelloGetBoardCustomFields(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { boardId} = validateGetBoardCustomFields(params);
    const client = new TrelloClient(credentials);

    const response = await client.getBoardCustomFields(boardId);
    const fields = response.data;

    const result = {
      summary: `Found ${fields.length} custom field(s) on board`,
      boardId,
      customFields: fields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        position: field.pos,
        options: field.options?.map(opt => ({
          id: opt.id,
          value: opt.value.text,
          color: opt.color,
          position: opt.pos
        })) || []
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting board custom fields: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// Card member management tools

const validateAddMemberToCard = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    memberId: trelloIdSchema
  });
  return schema.parse(args);
};

const validateRemoveMemberFromCard = (args: unknown) => {
  const schema = z.object({

    cardId: trelloIdSchema,
    memberId: trelloIdSchema
  });
  return schema.parse(args);
};

const validateDeleteLabel = (args: unknown) => {
  const schema = z.object({

    labelId: trelloIdSchema
  });
  return schema.parse(args);
};

export const trelloAddMemberToCardTool: Tool = {
  name: 'trello_add_member_to_card',
  description: 'Add a member to a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card'
      },
      memberId: {
        type: 'string',
        description: 'ID of the member to add to the card'
      }
    },
    required: ['cardId', 'memberId']
  }
};

export async function handleTrelloAddMemberToCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, memberId} = validateAddMemberToCard(params);
    const client = new TrelloClient(credentials);

    const response = await client.addMemberToCard(cardId, memberId);
    const members = response.data;

    const result = {
      summary: `Added member ${memberId} to card ${cardId}`,
      cardId,
      members: members.map((member: any) => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username
      })),
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error adding member to card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloRemoveMemberFromCardTool: Tool = {
  name: 'trello_remove_member_from_card',
  description: 'Remove a member from a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: {
        type: 'string',
        description: 'ID or URL of the card'
      },
      memberId: {
        type: 'string',
        description: 'ID of the member to remove from the card'
      }
    },
    required: ['cardId', 'memberId']
  }
};

export async function handleTrelloRemoveMemberFromCard(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { cardId, memberId} = validateRemoveMemberFromCard(params);
    const client = new TrelloClient(credentials);

    const response = await client.removeMemberFromCard(cardId, memberId);

    const result = {
      summary: `Removed member ${memberId} from card ${cardId}`,
      cardId,
      memberId,
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error removing member from card: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const trelloDeleteLabelTool: Tool = {
  name: 'trello_delete_label',
  description: 'Delete a label from a Trello board.',
  inputSchema: {
    type: 'object',
    properties: {
      labelId: {
        type: 'string',
        description: 'ID of the label to delete'
      }
    },
    required: ['labelId']
  }
};

export async function handleTrelloDeleteLabel(args: unknown) {
  try {
    const { credentials, params } = extractCredentials(args);
    const { labelId} = validateDeleteLabel(params);
    const client = new TrelloClient(credentials);

    const response = await client.deleteLabel(labelId);

    const result = {
      summary: `Deleted label ${labelId}`,
      labelId,
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
    const errorMessage = formatError(error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error deleting label: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

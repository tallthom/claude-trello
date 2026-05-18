#!/usr/bin/env node

// Initialize logging first - this sets up file transport and console overrides
import './utils/logger.js';

import { createRequire } from 'module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const pkg = createRequire(import.meta.url)('../package.json') as { name: string; version: string };

// stderr is safe — stdout is reserved for JSON-RPC. Boot continues so
// MCP clients can complete initialize / tools/list (e.g. for registry
// introspection); credential errors surface per-tool-call instead.
if (!process.env.TRELLO_API_KEY || !process.env.TRELLO_TOKEN) {
  process.stderr.write(
    `${pkg.name}: warning — TRELLO_API_KEY and/or TRELLO_TOKEN are not set. ` +
    `The server will start, but tool calls will fail until credentials are ` +
    `provided via env vars or per-tool apiKey/token arguments. ` +
    `See https://github.com/agrath/Trello-Desktop-MCP#credentials\n`
  );
}

// Import tools with credential injection
import {
  listBoardsTool,
  getBoardDetailsTool,
  getListsTool,
  handleListBoards,
  handleGetBoardDetails,
  handleGetLists,
  trelloFilterListsTool,
  handleTrelloFilterLists
} from './tools/boards.js';

import {
  createCardTool,
  updateCardTool,
  moveCardTool,
  getCardTool,
  handleCreateCard,
  handleUpdateCard,
  handleMoveCard,
  handleGetCard,
  trelloArchiveCardTool,
  handleArchiveCard
} from './tools/cards.js';

import {
  trelloSearchTool,
  handleTrelloSearch
} from './tools/search.js';

import {
  trelloGetListCardsTool,
  handleTrelloGetListCards,
  trelloCreateListTool,
  handleTrelloCreateList,
  trelloAddCommentTool,
  handleTrelloAddComment
} from './tools/lists.js';

import {
  trelloGetUserBoardsTool,
  handleTrelloGetUserBoards,
  trelloGetMemberTool,
  handleTrelloGetMember
} from './tools/members.js';

import {
  trelloGetBoardCardsTool,
  handleTrelloGetBoardCards,
  trelloGetCardActionsTool,
  handleTrelloGetCardActions,
  trelloGetCardAttachmentsTool,
  handleTrelloGetCardAttachments,
  trelloGetCardChecklistsTool,
  handleTrelloGetCardChecklists,
  trelloGetBoardMembersTool,
  handleTrelloGetBoardMembers,
  trelloGetBoardLabelsTool,
  handleTrelloGetBoardLabels,
  trelloCreateLabelTool,
  handleTrelloCreateLabel,
  trelloUpdateLabelTool,
  handleTrelloUpdateLabel,
  trelloAddLabelToCardTool,
  handleTrelloAddLabelToCard,
  trelloRemoveLabelFromCardTool,
  handleTrelloRemoveLabelFromCard,
  trelloCreateCardAttachmentTool,
  handleTrelloCreateCardAttachment,
  trelloGetCardAttachmentTool,
  handleTrelloGetCardAttachment,
  trelloDeleteCardAttachmentTool,
  handleTrelloDeleteCardAttachment,
  trelloGetBoardCustomFieldsTool,
  handleTrelloGetBoardCustomFields,
  trelloAddMemberToCardTool,
  handleTrelloAddMemberToCard,
  trelloRemoveMemberFromCardTool,
  handleTrelloRemoveMemberFromCard,
  trelloDeleteLabelTool,
  handleTrelloDeleteLabel
} from './tools/advanced.js';

import {
  trelloCreateChecklistTool,
  handleTrelloCreateChecklist,
  trelloGetChecklistTool,
  handleTrelloGetChecklist,
  trelloUpdateChecklistTool,
  handleTrelloUpdateChecklist,
  trelloDeleteChecklistTool,
  handleTrelloDeleteChecklist,
  trelloGetChecklistFieldTool,
  handleTrelloGetChecklistField,
  trelloUpdateChecklistFieldTool,
  handleTrelloUpdateChecklistField,
  trelloGetBoardForChecklistTool,
  handleTrelloGetBoardForChecklist,
  trelloGetCardForChecklistTool,
  handleTrelloGetCardForChecklist,
  trelloGetCheckItemsTool,
  handleTrelloGetCheckItems,
  trelloCreateCheckItemTool,
  handleTrelloCreateCheckItem,
  trelloGetCheckItemTool,
  handleTrelloGetCheckItem,
  trelloDeleteCheckItemTool,
  handleTrelloDeleteCheckItem,
  trelloUpdateCheckItemTool,
  handleTrelloUpdateCheckItem
} from './tools/checklists.js';

// Create server instance
const server = new Server(
  {
    name: pkg.name,
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Initialize handler
server.setRequestHandler(InitializeRequestSchema, async () => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    serverInfo: {
      name: pkg.name,
      version: pkg.version
    }
  };
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Phase 1: Essential tools
      trelloSearchTool,
      trelloGetUserBoardsTool,
      getBoardDetailsTool,
      getCardTool,
      createCardTool,
      // Phase 2: Core operations
      updateCardTool,
      moveCardTool,
      trelloAddCommentTool,
      trelloGetListCardsTool,
      trelloCreateListTool,
      // Original tools (maintained for compatibility)
      listBoardsTool,
      getListsTool,
      // Member management
      trelloGetMemberTool,
      // Phase 3: Advanced features
      trelloGetBoardCardsTool,
      trelloGetCardActionsTool,
      trelloGetCardAttachmentsTool,
      trelloCreateCardAttachmentTool,
      trelloGetCardAttachmentTool,
      trelloDeleteCardAttachmentTool,
      trelloGetCardChecklistsTool,
      trelloGetBoardMembersTool,
      trelloGetBoardLabelsTool,
      // Label management
      trelloCreateLabelTool,
      trelloUpdateLabelTool,
      trelloAddLabelToCardTool,
      trelloRemoveLabelFromCardTool,
      trelloDeleteLabelTool,
      // Member management on cards
      trelloAddMemberToCardTool,
      trelloRemoveMemberFromCardTool,
      // Custom fields
      trelloGetBoardCustomFieldsTool,
      // Card archiving
      trelloArchiveCardTool,
      // List filtering
      trelloFilterListsTool,
      // Checklist management
      trelloCreateChecklistTool,
      trelloGetChecklistTool,
      trelloUpdateChecklistTool,
      trelloDeleteChecklistTool,
      trelloGetChecklistFieldTool,
      trelloUpdateChecklistFieldTool,
      trelloGetBoardForChecklistTool,
      trelloGetCardForChecklistTool,
      trelloGetCheckItemsTool,
      trelloCreateCheckItemTool,
      trelloGetCheckItemTool,
      trelloDeleteCheckItemTool,
      trelloUpdateCheckItemTool
    ]
  };
});

// Handle tool calls. Each handler calls extractCredentials() which
// reads per-call apiKey/token first, then falls back to env vars, and
// throws a clear validation error if neither is present.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      // Phase 1: Essential tools
      case 'trello_search':
        result = await handleTrelloSearch(args);
        break;

      case 'trello_get_user_boards':
        result = await handleTrelloGetUserBoards(args);
        break;

      case 'get_board_details':
        result = await handleGetBoardDetails(args);
        break;

      case 'get_card':
        result = await handleGetCard(args);
        break;

      case 'create_card':
        result = await handleCreateCard(args);
        break;

      // Phase 2: Core operations
      case 'update_card':
        result = await handleUpdateCard(args);
        break;

      case 'move_card':
        result = await handleMoveCard(args);
        break;

      case 'trello_add_comment':
        result = await handleTrelloAddComment(args);
        break;

      case 'trello_get_list_cards':
        result = await handleTrelloGetListCards(args);
        break;

      case 'trello_create_list':
        result = await handleTrelloCreateList(args);
        break;

      // Original tools (maintained for compatibility)
      case 'list_boards':
        result = await handleListBoards(args);
        break;

      case 'get_lists':
        result = await handleGetLists(args);
        break;

      // Member management
      case 'trello_get_member':
        result = await handleTrelloGetMember(args);
        break;

      // Phase 3: Advanced features
      case 'trello_get_board_cards':
        result = await handleTrelloGetBoardCards(args);
        break;

      case 'trello_get_card_actions':
        result = await handleTrelloGetCardActions(args);
        break;

      case 'trello_get_card_attachments':
        result = await handleTrelloGetCardAttachments(args);
        break;

      case 'trello_create_card_attachment':
        result = await handleTrelloCreateCardAttachment(args);
        break;

      case 'trello_get_card_attachment':
        result = await handleTrelloGetCardAttachment(args);
        break;

      case 'trello_delete_card_attachment':
        result = await handleTrelloDeleteCardAttachment(args);
        break;

      case 'trello_get_card_checklists':
        result = await handleTrelloGetCardChecklists(args);
        break;

      case 'trello_get_board_members':
        result = await handleTrelloGetBoardMembers(args);
        break;

      case 'trello_get_board_labels':
        result = await handleTrelloGetBoardLabels(args);
        break;

      // Label management
      case 'trello_create_label':
        result = await handleTrelloCreateLabel(args);
        break;

      case 'trello_update_label':
        result = await handleTrelloUpdateLabel(args);
        break;

      case 'trello_add_label_to_card':
        result = await handleTrelloAddLabelToCard(args);
        break;

      case 'trello_remove_label_from_card':
        result = await handleTrelloRemoveLabelFromCard(args);
        break;

      case 'trello_delete_label':
        result = await handleTrelloDeleteLabel(args);
        break;

      // Member management on cards
      case 'trello_add_member_to_card':
        result = await handleTrelloAddMemberToCard(args);
        break;

      case 'trello_remove_member_from_card':
        result = await handleTrelloRemoveMemberFromCard(args);
        break;

      // Custom fields
      case 'trello_get_board_custom_fields':
        result = await handleTrelloGetBoardCustomFields(args);
        break;

      // Card archiving
      case 'trello_archive_card':
        result = await handleArchiveCard(args);
        break;

      // List filtering
      case 'trello_filter_lists':
        result = await handleTrelloFilterLists(args);
        break;

      // Checklist management
      case 'trello_create_checklist':
        result = await handleTrelloCreateChecklist(args);
        break;

      case 'trello_get_checklist':
        result = await handleTrelloGetChecklist(args);
        break;

      case 'trello_update_checklist':
        result = await handleTrelloUpdateChecklist(args);
        break;

      case 'trello_delete_checklist':
        result = await handleTrelloDeleteChecklist(args);
        break;

      case 'trello_get_checklist_field':
        result = await handleTrelloGetChecklistField(args);
        break;

      case 'trello_update_checklist_field':
        result = await handleTrelloUpdateChecklistField(args);
        break;

      case 'trello_get_board_for_checklist':
        result = await handleTrelloGetBoardForChecklist(args);
        break;

      case 'trello_get_card_for_checklist':
        result = await handleTrelloGetCardForChecklist(args);
        break;

      case 'trello_get_check_items':
        result = await handleTrelloGetCheckItems(args);
        break;

      case 'trello_create_check_item':
        result = await handleTrelloCreateCheckItem(args);
        break;

      case 'trello_get_check_item':
        result = await handleTrelloGetCheckItem(args);
        break;

      case 'trello_delete_check_item':
        result = await handleTrelloDeleteCheckItem(args);
        break;

      case 'trello_update_check_item':
        result = await handleTrelloUpdateCheckItem(args);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return result;

  } catch (error) {
    throw error;
  }
});

// List resources (empty for now)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

// List prompts (empty for now)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});

// Error handler
process.on('uncaughtException', (_error) => {
  process.exit(1);
});

process.on('unhandledRejection', (_reason) => {
  process.exit(1);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Server is running - no output needed
}

main().catch((_error) => {
  process.exit(1);
});

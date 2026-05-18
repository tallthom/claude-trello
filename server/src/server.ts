import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  listBoardsTool,
  handleListBoards,
  getBoardDetailsTool,
  handleGetBoardDetails,
  getListsTool,
  handleGetLists,
  trelloFilterListsTool,
  handleTrelloFilterLists
} from './tools/boards.js';
import {
  createCardTool,
  handleCreateCard,
  updateCardTool,
  handleUpdateCard,
  moveCardTool,
  handleMoveCard,
  getCardTool,
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

const WRITE_TOOL_NAMES = new Set([
  'create_card', 'update_card', 'move_card', 'trello_archive_card',
  'trello_add_comment', 'trello_create_list',
  'trello_create_label', 'trello_update_label', 'trello_delete_label',
  'trello_add_label_to_card', 'trello_remove_label_from_card',
  'trello_add_member_to_card', 'trello_remove_member_from_card',
  'trello_create_checklist', 'trello_update_checklist', 'trello_delete_checklist',
  'trello_update_checklist_field',
  'trello_create_check_item', 'trello_delete_check_item', 'trello_update_check_item',
  'trello_create_card_attachment', 'trello_delete_card_attachment'
]);

export function createMCPServer() {
  const readOnly = process.env.TRELLO_READ_ONLY === 'true';

  const server = new Server(
    {
      name: 'trello-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Handle MCP initialization
  server.setRequestHandler(InitializeRequestSchema, async (_request) => {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: 'trello-mcp-server',
        version: '1.0.0',
      },
    };
  });

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = [
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
        trelloGetCardChecklistsTool,
        trelloGetBoardMembersTool,
        trelloGetBoardLabelsTool,
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
      ];

      return {
        tools: readOnly ? allTools.filter(t => !WRITE_TOOL_NAMES.has(t.name)) : allTools,
      };
  });

  // Handle list resources request (required by MCP spec)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  // Handle list prompts request (required by MCP spec)
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (readOnly && WRITE_TOOL_NAMES.has(name)) {
      return {
        content: [{ type: 'text' as const, text: `Error: Tool '${name}' is not available in read-only mode` }],
        isError: true
      };
    }

    switch (name) {
      // Phase 1: Essential tools
      case 'trello_search':
        return await handleTrelloSearch(args);
      
      case 'trello_get_user_boards':
        return await handleTrelloGetUserBoards(args);
      
      case 'get_board_details':
        return await handleGetBoardDetails(args);
      
      case 'get_card':
        return await handleGetCard(args);
      
      case 'create_card':
        return await handleCreateCard(args);
      
      // Phase 2: Core operations
      case 'update_card':
        return await handleUpdateCard(args);
      
      case 'move_card':
        return await handleMoveCard(args);
      
      case 'trello_add_comment':
        return await handleTrelloAddComment(args);
      
      case 'trello_get_list_cards':
        return await handleTrelloGetListCards(args);
      
      case 'trello_create_list':
        return await handleTrelloCreateList(args);
      
      // Original tools (maintained for compatibility)
      case 'list_boards':
        return await handleListBoards(args);
      
      case 'get_lists':
        return await handleGetLists(args);
      
      // Member management
      case 'trello_get_member':
        return await handleTrelloGetMember(args);
      
      // Phase 3: Advanced features
      case 'trello_get_board_cards':
        return await handleTrelloGetBoardCards(args);
      
      case 'trello_get_card_actions':
        return await handleTrelloGetCardActions(args);
      
      case 'trello_get_card_attachments':
        return await handleTrelloGetCardAttachments(args);
      
      case 'trello_get_card_checklists':
        return await handleTrelloGetCardChecklists(args);
      
      case 'trello_get_board_members':
        return await handleTrelloGetBoardMembers(args);
      
      case 'trello_get_board_labels':
        return await handleTrelloGetBoardLabels(args);

      case 'trello_create_label':
        return await handleTrelloCreateLabel(args);

      case 'trello_update_label':
        return await handleTrelloUpdateLabel(args);

      case 'trello_add_label_to_card':
        return await handleTrelloAddLabelToCard(args);

      case 'trello_remove_label_from_card':
        return await handleTrelloRemoveLabelFromCard(args);

      case 'trello_delete_label':
        return await handleTrelloDeleteLabel(args);

      // Member management on cards
      case 'trello_add_member_to_card':
        return await handleTrelloAddMemberToCard(args);

      case 'trello_remove_member_from_card':
        return await handleTrelloRemoveMemberFromCard(args);

      // Custom fields
      case 'trello_get_board_custom_fields':
        return await handleTrelloGetBoardCustomFields(args);

      // Card archiving
      case 'trello_archive_card':
        return await handleArchiveCard(args);

      // List filtering
      case 'trello_filter_lists':
        return await handleTrelloFilterLists(args);

      // Checklist management
      case 'trello_create_checklist':
        return await handleTrelloCreateChecklist(args);

      case 'trello_get_checklist':
        return await handleTrelloGetChecklist(args);

      case 'trello_update_checklist':
        return await handleTrelloUpdateChecklist(args);

      case 'trello_delete_checklist':
        return await handleTrelloDeleteChecklist(args);

      case 'trello_get_checklist_field':
        return await handleTrelloGetChecklistField(args);

      case 'trello_update_checklist_field':
        return await handleTrelloUpdateChecklistField(args);

      case 'trello_get_board_for_checklist':
        return await handleTrelloGetBoardForChecklist(args);

      case 'trello_get_card_for_checklist':
        return await handleTrelloGetCardForChecklist(args);

      case 'trello_get_check_items':
        return await handleTrelloGetCheckItems(args);

      case 'trello_create_check_item':
        return await handleTrelloCreateCheckItem(args);

      case 'trello_get_check_item':
        return await handleTrelloGetCheckItem(args);

      case 'trello_delete_check_item':
        return await handleTrelloDeleteCheckItem(args);

      case 'trello_update_check_item':
        return await handleTrelloUpdateCheckItem(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

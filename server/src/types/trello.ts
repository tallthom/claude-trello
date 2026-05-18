export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  dateLastActivity: string;
  prefs: {
    permissionLevel: string;
    voting: string;
    comments: string;
    invitations: string;
    selfJoin: boolean;
    cardCovers: boolean;
    background: string;
    backgroundColor: string;
  };
  lists?: TrelloList[];
  cards?: TrelloCard[];
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
  subscribed: boolean;
  idBoard: string;
  cards?: TrelloCard[];
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  pos: number;
  idBoard: string;
  idList: string;
  dateLastActivity: string;
  due: string | null;
  dueComplete: boolean;
  start: string | null;
  labels: TrelloLabel[];
  members: TrelloMember[];
  checklists: TrelloChecklist[];
  attachments?: TrelloAttachment[];
  customFieldItems?: TrelloCustomFieldItem[];
  badges: {
    votes: number;
    viewingMemberVoted: boolean;
    subscribed: boolean;
    fogbugz: string;
    checkItems: number;
    checkItemsChecked: number;
    comments: number;
    attachments: number;
    description: boolean;
    due: string | null;
    dueComplete: boolean;
  };
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
  idBoard: string;
  uses: number;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarHash: string | null;
  avatarUrl: string | null;
  initials: string;
  bio?: string;
  url?: string;
  memberType?: string;
  confirmed?: boolean;
  boards?: TrelloBoard[];
  organizations?: { id: string; name: string; displayName: string; desc?: string }[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idBoard: string;
  idCard: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
  due: string | null;
  idMember: string | null;
}

export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  date: string;
  bytes: number;
  isUpload: boolean;
  pos?: number;
  edgeColor?: string | null;
  previews?: {
    id: string;
    width: number;
    height: number;
    url: string;
  }[];
}

export interface CreateCardRequest {
  name: string;
  desc?: string | undefined;
  idList: string;
  pos?: number | string | undefined;
  due?: string | undefined;
  start?: string | undefined;
  idMembers?: string[] | undefined;
  idLabels?: string[] | undefined;
}

export interface UpdateCardRequest {
  name?: string | undefined;
  desc?: string | undefined;
  closed?: boolean | undefined;
  due?: string | null | undefined;
  dueComplete?: boolean | undefined;
  start?: string | null | undefined;
  idList?: string | undefined;
  pos?: number | string | undefined;
  idMembers?: string[] | undefined;
  idLabels?: string[] | undefined;
}

export interface MoveCardRequest {
  idList: string;
  pos?: number | string | undefined;
}

export interface CreateChecklistRequest {
  name: string;
  idCard: string;
  idChecklistSource?: string;
  pos?: string | number;
}

export interface UpdateChecklistRequest {
  name?: string;
  pos?: string | number;
}

export interface CreateCheckItemRequest {
  name: string;
  pos?: string | number;
  checked?: boolean;
  due?: string;
  idMember?: string;
}

export interface UpdateCheckItemRequest {
  name?: string;
  state?: 'complete' | 'incomplete';
  pos?: string | number;
  due?: string | null;
  idMember?: string | null;
}

export interface TrelloError {
  message: string;
  error?: string;
  status?: number;
  code?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

export interface TrelloApiResponse<T> {
  data: T;
  rateLimit?: RateLimitInfo | undefined;
}

export interface TrelloCustomField {
  id: string;
  idModel: string;
  modelType: 'board';
  fieldGroup: string;
  name: string;
  type: 'text' | 'number' | 'checkbox' | 'date' | 'list';
  pos: number;
  options?: {
    id: string;
    idCustomField: string;
    value: {
      text: string;
    };
    color: string;
    pos: number;
  }[];
}

export interface TrelloCustomFieldItem {
  id: string;
  idCustomField: string;
  idModel: string;
  modelType: 'card';
  idValue?: string;
  value?: {
    text?: string;
    number?: string;
    checked?: string;
    date?: string;
  };
}

export interface TrelloUser extends TrelloMember {
  email?: string;
}

export interface TrelloAction {
  id: string;
  type: string;
  date: string;
  data: {
    text?: string;
    card?: { id: string; name: string; shortLink?: string };
    board?: { id: string; name: string; shortLink?: string };
    list?: { id: string; name: string };
    old?: Record<string, unknown>;
  };
  memberCreator: TrelloMember;
}

export interface TrelloComment {
  id: string;
  type: 'commentCard';
  date: string;
  data: {
    text: string;
    card: { id: string; name: string; shortLink?: string };
  };
  memberCreator: TrelloMember;
}

export interface TrelloSearchResults {
  boards?: TrelloBoard[];
  cards?: TrelloCard[];
  members?: TrelloMember[];
  organizations?: { id: string; name: string; displayName: string }[];
}
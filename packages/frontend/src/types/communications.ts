export interface CommunicationReader {
  user_id: string;
  read_at: string | null;
  confirmed_at: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface Communication {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'urgent' | 'celebration';
  target_branch_ids: string[] | null;
  target_roles: string[] | null;
  is_published: boolean;
  published_at: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface CommunicationWithRead extends Communication {
  is_read: boolean;
}

export interface CommunicationWithSource extends CommunicationWithRead {
  source_type: 'brand' | 'local';
  source_branch_id: string | null;
  tag: string | null;
  custom_label: string | null;
  branch_name?: string | null;
  requires_confirmation?: boolean;
  is_confirmed?: boolean;
}

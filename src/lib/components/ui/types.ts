export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type IconName =
  | 'search'
  | 'chat'
  | 'gamepad'
  | 'user'
  | 'users'
  | 'bell'
  | 'lock'
  | 'unlock'
  | 'map'
  | 'chevron-right'
  | 'chevron-left'
  | 'x'
  | 'edit'
  | 'plus'
  | 'send'
  | 'info'
  | 'more'
  | 'check'
  | 'trash'
  | 'phone'
  | 'phone-off'
  | 'mic'
  | 'mic-off';

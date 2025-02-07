export type PlaylistItem = {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  isSelected: boolean;
  uploader?: string;
  error?: string;
  success?: boolean;
}
export type FileVisibilityValue = "INTERNAL" | "CLIENT";

export type ProjectFile = {
  id: string;
  type: string;
  visibility: FileVisibilityValue;
  createdAt: string;
  uploader: { id: string; name: string };
};

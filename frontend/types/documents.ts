export type UploadDocumentResult = {
  documentId: string;
  businessId: string;
  filename: string;
  fileType: string;
  status: "ready";
  chunkCount: number;
};

export type DocumentListItem = {
  documentId: string;
  filename: string;
  status: "ready";
  chunkCount: number;
  uploadedAt: string;
};

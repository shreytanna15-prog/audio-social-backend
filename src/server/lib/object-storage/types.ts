export type SignedUpload = {
    path: string;
    signedUrl: string;
    token?: string;
};

export interface ObjectStorage {
    createSignedUploadUrl(
        path: string,
        contentType?: string
    ): Promise<SignedUpload>;
    createSignedDownloadUrl(
        path: string,
        ttlSeconds?: number
    ): Promise<string>;
    objectExists(prefix: string, fileName: string): Promise<boolean>;
    objectExistsAtPath(path: string): Promise<boolean>;
    remove(paths: string[]): Promise<void>;
}

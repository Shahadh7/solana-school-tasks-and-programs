export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  url?: string;
  isDuplicate?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class IPFSService {
  private pinataGateway: string;

  constructor() {
    this.pinataGateway =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
    if (!process.env.NEXT_PUBLIC_PINATA_GATEWAY) {
    }
  }

  getIPFSUrl(cidOrHash: string): string {
    const cid = cidOrHash.replace("ipfs://", "");
    return `${this.pinataGateway}/ipfs/${cid}`;
  }

  async uploadFile(file: File): Promise<PinataUploadResponse> {
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/files", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  uploadFileWithProgress(
    file: File,
    onProgress: (p: UploadProgress) => void
  ): Promise<PinataUploadResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          onProgress({
            loaded: evt.loaded,
            total: evt.total,
            percentage: Math.round((evt.loaded / evt.total) * 100),
          });
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Invalid JSON from /api/files"));
          }
        } else {
          reject(new Error(xhr.responseText || "Upload failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.open("POST", "/api/files");
      xhr.send(formData);
    });
  }

  async uploadJSON(metadata: object, filename = "metadata.json"): Promise<PinataUploadResponse> {
    const res = await fetch("/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata, name: filename }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  createNFTMetadata(params: {
    name: string;
    description: string;
    imageCidOrHash: string;
    unlockDate: Date;
    attributes?: Array<{ trait_type: string; value: string }>;
    creatorAddress?: string;
    mimeType?: string;
    externalUrl?: string;
  }) {
    const {
      name,
      description,
      imageCidOrHash,
      unlockDate,
      attributes = [],
      creatorAddress,
      mimeType = "image/png",
      externalUrl = "https://dearfuture.xyz"
    } = params;

    const image = this.getIPFSUrl(imageCidOrHash);

    return {
      name,
      description,
      image,
      external_url: externalUrl,
      attributes: [
        { trait_type: "Unlock Date", value: unlockDate.toISOString() },
        { trait_type: "Created At", value: new Date().toISOString() },
        { trait_type: "Type", value: "Memory Capsule" },
        ...attributes,
      ],
      properties: {
        files: [{ uri: image, type: mimeType }],
        category: "image",
        creators: creatorAddress
          ? [{ address: creatorAddress, share: 100 }]
          : undefined,
      },
    };
  }
}

export const ipfsService = new IPFSService();

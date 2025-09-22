import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: "PINATA_JWT is not configured on the server" },
      { status: 500 }
    );
  }

  const { metadata, name = "metadata.json", keyvalues = {} } = await req.json();

  if (!metadata || typeof metadata !== "object") {
    return NextResponse.json({ error: "Body must include a 'metadata' object" }, { status: 400 });
  }

  const body = {
    pinataContent: metadata,
    pinataMetadata: {
      name: `DearFuture-${name}`,
      keyvalues: {
        app: "dear-future-web3",
        type: "nft-metadata",
        uploadedAt: new Date().toISOString(),
        ...keyvalues,
      },
    },
    pinataOptions: { cidVersion: 1 },
  };

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: json?.error || json }, { status: res.status });
  }

  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
  const cid = json.IpfsHash as string;

  return NextResponse.json({
    IpfsHash: cid,
    PinSize: json.PinSize,
    Timestamp: json.Timestamp,
    url: `${gateway}/ipfs/${cid}`,
  });
}

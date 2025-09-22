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

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' in form-data" }, { status: 400 });
  }

  const pinataForm = new FormData();
  pinataForm.append("file", file, file.name);

  pinataForm.append(
    "pinataMetadata",
    JSON.stringify({
      name: `DearFuture-${file.name}`,
      keyvalues: {
        app: "dear-future-web3",
        type: "capsule-image",
        uploadedAt: new Date().toISOString(),
      },
    })
  );
  pinataForm.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`, 
    },
    body: pinataForm,
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

import { cookies } from "next/headers";

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function getWalletAddress(): Promise<string | null> {
  const cookieStore = await cookies();
  const address = cookieStore.get("wallet_address")?.value;
  if (!address || !SOLANA_ADDRESS_REGEX.test(address)) return null;
  return address;
}

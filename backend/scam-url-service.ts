import axios from "axios";
import LOCAL_SCAM_URLS from "./scam-url-blocklist";

// Fetch scammy URLs from Helius API (replace with your actual endpoint)
export async function fetchScamUrlsFromHelius(apiKey: string): Promise<string[]> {
  try {
    // Example endpoint - update as needed for your Helius API
    const response = await axios.get(`https://api.helius.xyz/v0/scam-urls?api-key=${apiKey}`);
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // If the API returns an object with a 'urls' property
    if (response.data && Array.isArray(response.data.urls)) {
      return response.data.urls;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch scam URLs from Helius:", error);
    return [];
  }
}

// Merge local and fetched lists, removing duplicates
export async function getCombinedScamUrlList(apiKey: string): Promise<string[]> {
  const heliusUrls = await fetchScamUrlsFromHelius(apiKey);
  const allUrls = new Set([...LOCAL_SCAM_URLS, ...heliusUrls]);
  return Array.from(allUrls);
}

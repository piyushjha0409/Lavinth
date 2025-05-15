"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchScamUrlsFromHelius = fetchScamUrlsFromHelius;
exports.getCombinedScamUrlList = getCombinedScamUrlList;
const axios_1 = __importDefault(require("axios"));
const scam_url_blocklist_1 = __importDefault(require("./scam-url-blocklist"));
// Fetch scammy URLs from Helius API (replace with your actual endpoint)
function fetchScamUrlsFromHelius(apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Example endpoint - update as needed for your Helius API
            const response = yield axios_1.default.get(`https://api.helius.xyz/v0/scam-urls?api-key=${apiKey}`);
            if (Array.isArray(response.data)) {
                return response.data;
            }
            // If the API returns an object with a 'urls' property
            if (response.data && Array.isArray(response.data.urls)) {
                return response.data.urls;
            }
            return [];
        }
        catch (error) {
            console.error("Failed to fetch scam URLs from Helius:", error);
            return [];
        }
    });
}
// Merge local and fetched lists, removing duplicates
function getCombinedScamUrlList(apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const heliusUrls = yield fetchScamUrlsFromHelius(apiKey);
        const allUrls = new Set([...scam_url_blocklist_1.default, ...heliusUrls]);
        return Array.from(allUrls);
    });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get("type") || "all";
    const limit = searchParams.get("limit") || "10";
    const offset = searchParams.get("offset") || "0";

    let endpoint: string;
    let responses: Response[] = [];

    if (filterType === "dust") {
      endpoint = `${apiBaseURL}/dust-transactions/potential-dust?limit=${limit}&offset=${offset}`;
      const response = await fetch(endpoint, {
        headers: {
          "x-access-token": apiKey as string,
        },
      });
      responses = [response];
    } else if (filterType === "poisoning") {
      endpoint = `${apiBaseURL}/dust-transactions/potential-poisoning?limit=${limit}&offset=${offset}`;
      const response = await fetch(endpoint, {
        headers: {
          "x-access-token": apiKey as string,
        },
      });
      responses = [response];
    } else if (filterType === "attackers") {
      endpoint = `${apiBaseURL}/dusting-attackers?limit=${limit}&offset=${offset}`;
      const response = await fetch(endpoint, {
        headers: {
          "x-access-token": apiKey as string,
        },
      });
      responses = [response];
    } else if (filterType === "victims") {
      endpoint = `${apiBaseURL}/dusting-victims?limit=${limit}&offset=${offset}`;
      const response = await fetch(endpoint, {
        headers: {
          "x-access-token": apiKey as string,
        },
      });
      responses = [response];
    } else {
      // For 'all', fetch both dust and poisoning transactions
      const dustEndpoint = `${apiBaseURL}/dust-transactions/potential-dust?limit=${limit}&offset=${offset}`;
      const poisoningEndpoint = `${apiBaseURL}/dust-transactions/potential-poisoning?limit=${limit}&offset=${offset}`;

      const [dustResponse, poisoningResponse] = await Promise.all([
        fetch(dustEndpoint, {
          headers: {
            "x-access-token": apiKey as string,
          },
        }),
        fetch(poisoningEndpoint, {
          headers: {
            "x-access-token": apiKey as string,
          },
        }),
      ]);

      responses = [dustResponse, poisoningResponse];
    }

    // Handle single endpoint responses
    if (responses.length === 1) {
      const response = responses[0];

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch transaction data: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Handle combined responses for 'all' filter
    const [dustResponse, poisoningResponse] = responses;

    if (!dustResponse.ok && !poisoningResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch transaction data" },
        { status: 500 }
      );
    }

    // Process dust transactions
    const dustData = dustResponse.ok
      ? await dustResponse.json()
      : { data: [], pagination: { total: 0, totalPages: 0 } };

    // Process poisoning transactions
    const poisoningData = poisoningResponse.ok
      ? await poisoningResponse.json()
      : { data: [], pagination: { total: 0, totalPages: 0 } };

    // Combine data from both endpoints
    const combinedTransactions = [
      ...(dustData.data || []),
      ...(poisoningData.data || []),
    ];

    // Remove duplicates based on signature
    const uniqueTransactions = Array.from(
      new Map(
        combinedTransactions.map((tx: any) => [tx.signature, tx])
      ).values()
    );

    // Sort by timestamp descending
    uniqueTransactions.sort(
      (a: any, b: any) =>
        new Date(b.timestamp || Date.now()).getTime() -
        new Date(a.timestamp || Date.now()).getTime()
    );

    // Slice to match the page size
    const pageSize = parseInt(limit);
    const paginatedTransactions = uniqueTransactions.slice(0, pageSize);

    // Calculate combined pagination
    const totalItems =
      (dustData.pagination?.total || 0) +
      (poisoningData.pagination?.total || 0);
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const currentPage = Math.floor(parseInt(offset) / pageSize) + 1;

    const combinedResponse = {
      status: "success",
      count: paginatedTransactions.length,
      pagination: {
        total: totalItems,
        totalPages,
        currentPage,
        limit: pageSize,
        offset: parseInt(offset),
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
      data: paginatedTransactions,
    };

    return NextResponse.json(combinedResponse);
  } catch (error) {
    console.error("Error fetching suspicious transactions:", error);
    return NextResponse.json(
      { error: "Failed to load transaction data" },
      { status: 500 }
    );
  }
}

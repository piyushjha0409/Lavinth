import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiKeyService } from '@/lib/services/apiKeyService';

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const userId = session.user.id as string;
    const apiKeys = await ApiKeyService.listApiKeys(userId);
    
    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { name, expiresAt, permissions, usageLimit, ipRestrictions, description } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }
    
    const userId = session.user.id as string;
    
    const { apiKey, apiKeyDoc } = await ApiKeyService.generateApiKey({
      name,
      userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      permissions,
      usageLimit,
      ipRestrictions,
      description
    });
    
    return NextResponse.json({
      message: 'API key created successfully',
      apiKey,
      apiKeyDoc
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getLists, createList } from '@/lib/queries';

export async function GET() {
  try {
    const lists = getLists();
    return NextResponse.json(lists);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const list = createList({
      name: body.name,
      color: body.color || '#6366f1',
      emoji: body.emoji || '\ud83d\udccb',
    });
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}

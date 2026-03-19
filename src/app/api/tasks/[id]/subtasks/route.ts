import { NextRequest, NextResponse } from 'next/server';
import { createSubtask } from '@/lib/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const subtask = createSubtask(id, body.title);
    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}

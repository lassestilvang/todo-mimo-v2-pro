import { NextRequest, NextResponse } from 'next/server';
import { toggleSubtaskComplete } from '@/lib/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subtask = toggleSubtaskComplete(id);
    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }
    return NextResponse.json(subtask);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle subtask' }, { status: 500 });
  }
}

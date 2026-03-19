import { NextRequest, NextResponse } from 'next/server';
import { createReminder } from '@/lib/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    if (!body.reminderAt) {
      return NextResponse.json({ error: 'reminderAt is required' }, { status: 400 });
    }
    const reminder = createReminder(taskId, body.reminderAt);
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

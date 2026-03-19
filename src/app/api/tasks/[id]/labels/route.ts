import { NextRequest, NextResponse } from 'next/server';
import { addLabelToTask, removeLabelFromTask } from '@/lib/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.labelId) {
      return NextResponse.json({ error: 'Label ID is required' }, { status: 400 });
    }
    addLabelToTask(id, body.labelId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add label to task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const labelId = searchParams.get('labelId');
    if (!labelId) {
      return NextResponse.json({ error: 'Label ID is required' }, { status: 400 });
    }
    removeLabelFromTask(id, labelId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove label from task' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { deleteReminder } from '@/lib/queries';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteReminder(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}

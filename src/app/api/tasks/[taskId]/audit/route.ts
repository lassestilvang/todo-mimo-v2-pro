import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const logs = getAuditLogs(taskId);
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

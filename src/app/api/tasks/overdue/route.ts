import { NextResponse } from 'next/server';
import { getOverdueTasks } from '@/lib/queries';

export async function GET() {
  try {
    const tasks = getOverdueTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch overdue tasks' }, { status: 500 });
  }
}

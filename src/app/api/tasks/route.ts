import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask } from '@/lib/queries';
import type { ViewType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId') || undefined;
    const view = searchParams.get('view') as ViewType | null;
    const showCompleted = searchParams.get('showCompleted') === 'true';
    const labelId = searchParams.get('labelId') || undefined;

    const tasks = getTasks({
      listId,
      view: view || undefined,
      showCompleted,
      labelId,
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }
    const task = createTask({
      title: body.title,
      description: body.description ?? null,
      listId: body.listId,
      priority: body.priority || 'none',
      date: body.date ?? null,
      deadline: body.deadline ?? null,
      estimate: body.estimate ?? null,
      actualTime: body.actualTime ?? null,
      recurring: body.recurring ?? null,
      recurringCustom: body.recurringCustom ?? null,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

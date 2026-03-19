import { NextRequest, NextResponse } from 'next/server';
import { getLabels, createLabel } from '@/lib/queries';

export async function GET() {
  try {
    const labels = getLabels();
    return NextResponse.json(labels);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const label = createLabel({
      name: body.name,
      color: body.color || '#6366f1',
      icon: body.icon || '\ud83c\udff7\ufe0f',
    });
    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}

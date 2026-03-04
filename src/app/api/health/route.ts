import { NextResponse } from 'next/server';
import { OTWOONE_OS_VERSION } from '@/lib/osVersion';

export async function GET() {
  return NextResponse.json({ status: 'ok', version: OTWOONE_OS_VERSION });
}

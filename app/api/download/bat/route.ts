// app/api/download/bat/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const batContent = `@echo off
REM Design Task - Folder Opener Helper
REM Place this file in C:\\design-task-helper\\open-folder.bat

SET "ARG=%~1"

REM Extract path from URL: design-task://open?path=K:\\...
SET "ARG=%ARG:design-task://open?path=%"

REM URL decode basic characters
SET "ARG=%ARG:%%5C=\\%"
SET "ARG=%ARG:%%20= %"
SET "ARG=%ARG:%%3A=:%"

REM Open in Explorer
explorer "%ARG%"
`

  return new NextResponse(batContent, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="open-folder.bat"',
    },
  })
}

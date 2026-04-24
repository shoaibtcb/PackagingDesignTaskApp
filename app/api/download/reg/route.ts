// app/api/download/reg/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\design-task]
@="URL:Design Task Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\design-task\\DefaultIcon]
@="C:\\\\design-task-helper\\\\open-folder.bat,0"

[HKEY_CLASSES_ROOT\\design-task\\shell]

[HKEY_CLASSES_ROOT\\design-task\\shell\\open]

[HKEY_CLASSES_ROOT\\design-task\\shell\\open\\command]
@="\\"C:\\\\design-task-helper\\\\open-folder.bat\\" \\"%1\\""
`

  return new NextResponse(regContent, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="design-task-setup.reg"',
    },
  })
}

import { errors, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (!process.env.JWT_SECRET) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    await jwtVerify(token, secretKey);
    return NextResponse.next();
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return response;
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

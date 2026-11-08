import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING) {
  throw new Error('FATAL: Variable de entorno JWT_SECRET no configurada.');
}
const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir la pantalla y API de login sin token
  if (pathname === '/admin/login' || pathname === '/api/admin/auth') {
    return NextResponse.next();
  }

  const token = req.cookies.get('yankun_admin_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Acceso no autorizado. Inicia sesión en el panel de administración.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const role = (payload as any).role || 'COCINERO';

    // Restricciones de Rol: COCINERO solo puede operar en la pantalla de Cocina KDS
    if (role === 'COCINERO') {
      const allowedPaths = ['/admin/cocina', '/api/admin/cocina', '/api/admin/orders', '/admin/inventario', '/api/admin/inventory'];
      const isAllowed = allowedPaths.some((p) => pathname.startsWith(p));
      if (!isAllowed) {
        if (pathname.startsWith('/api/admin')) {
          return NextResponse.json(
            { error: 'Permisos insuficientes para esta operación.' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/admin/cocina', req.url));
      }
    }

    // Inyectar datos de sesión validados en los headers de la solicitud
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', String(payload.userId || ''));
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-email', String(payload.email || ''));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // Token inválido o expirado
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Sesión expirada o inválida. Por favor reingresa tus credenciales.' },
        { status: 401 }
      );
    }

    const response = NextResponse.redirect(new URL('/admin/login', req.url));
    response.cookies.delete('yankun_admin_token');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

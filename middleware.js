export const config = {
  matcher: '/:path*',
}

export default function middleware(request) {
  const authorizationHeader = request.headers.get('authorization');
  
  if (authorizationHeader) {
    const basicAuth = authorizationHeader.split(' ')[1];
    
    // Using atob in Edge runtime to decode base64
    const [user, password] = atob(basicAuth).split(':');
    
    // Check credentials against provided basic auth
    if (user === 'admin' && password === 'psa2026') {
      // Allow request to continue implicitly (Vercel standard)
      return;
    }
  }

  // Return a 401 response challenging for Basic Auth
  return new Response('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Dashboard Area"',
    },
  });
}

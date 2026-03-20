import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Painel da autoescola: verifica cookie painel_session ─────────────────
  // Matches /:slug/painel/** but NOT /:slug/painel/login
  const painelProtectedMatch = pathname.match(/^\/([^/]+)\/painel\/(?!login)(.*)/)
  if (painelProtectedMatch) {
    const slug = painelProtectedMatch[1]
    const sessionCookie = request.cookies.get('painel_session')?.value

    if (!sessionCookie) {
      return NextResponse.redirect(new URL(`/${slug}/painel/login`, request.url))
    }

    try {
      const session = JSON.parse(sessionCookie)
      if (session.autoescola_slug !== slug) {
        return NextResponse.redirect(new URL(`/${slug}/painel/login`, request.url))
      }
    } catch {
      return NextResponse.redirect(new URL(`/${slug}/painel/login`, request.url))
    }

    return NextResponse.next()
  }

  // ─── Admin interno: verifica Supabase Auth ────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Sem sessão → vai para home, não expõe a rota de login
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Admin: protege /admin/* EXCETO /admin/login
    '/admin/((?!login).*)',
    // Painel: protege /:slug/painel/* EXCETO /:slug/painel/login
    '/:slug/painel/((?!login).*)',
  ],
}

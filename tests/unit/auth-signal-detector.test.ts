import { describe, it, expect } from 'vitest';
import {
  detectAuthSignalsInContent,
  classifyRoute,
} from '../../packages/crawler/src/index.js';

describe('Auth Signal Detector & Route Classifier (US2)', () => {
  it('detects Next.js getServerSession and redirect', () => {
    const code = `
      import { getServerSession } from "next-auth";
      export default async function DashboardPage() {
        const session = await getServerSession();
        if (!session) redirect('/login');
        return <div>Private Dashboard</div>;
      }
    `;
    const signals = detectAuthSignalsInContent(code);
    expect(signals).toContain('next-auth-session');
    expect(signals).toContain('login-redirect');

    const classification = classifyRoute('app/(admin)/page.tsx', code, '/admin');
    expect(classification.scope).toBe('private');
    expect(classification.recommendedRobots).toBe('noindex, nofollow');
    expect(classification.includeInSitemap).toBe(false);
  });

  it('detects Laravel $this->middleware("auth") and Gate::authorize', () => {
    const code = `
      class InvoiceController extends Controller {
        public function __construct() {
          $this->middleware('auth');
        }
        public function show($id) {
          Gate::authorize('view-invoice');
          return view('invoices.show');
        }
      }
    `;
    const signals = detectAuthSignalsInContent(code);
    expect(signals).toContain('laravel-auth-middleware');
    expect(signals).toContain('laravel-gate-authorize');

    const classification = classifyRoute('app/Http/Controllers/InvoiceController.php', code, '/invoices/123');
    expect(classification.scope).toBe('private');
    expect(classification.recommendedRobots).toBe('noindex, nofollow');
  });

  it('detects Symfony #[IsGranted("ROLE_USER")]', () => {
    const code = `
      #[Route('/profile')]
      #[IsGranted('ROLE_USER')]
      public function profile(): Response {
        return $this->render('profile.html.twig');
      }
    `;
    const signals = detectAuthSignalsInContent(code);
    expect(signals).toContain('symfony-is-granted');

    const classification = classifyRoute('src/Controller/ProfileController.php', code, '/profile');
    expect(classification.scope).toBe('private');
  });

  it('detects Django @login_required', () => {
    const code = `
      @login_required
      def user_settings(request):
        return render(request, 'settings.html')
    `;
    const signals = detectAuthSignalsInContent(code);
    expect(signals).toContain('django-login-required');

    const classification = classifyRoute('views.py', code, '/settings');
    expect(classification.scope).toBe('private');
  });

  it('classifies public landing pages correctly with index, follow', () => {
    const code = `
      export default function LandingPage() {
        return (
          <main>
            <h1>Le meilleur outil pour votre comptabilite</h1>
            <p>Decouvrez notre offre des aujourd'hui et boostez votre productivite.</p>
          </main>
        );
      }
    `;
    const signals = detectAuthSignalsInContent(code);
    expect(signals.length).toBe(0);

    const classification = classifyRoute('app/(public)/page.tsx', code, '/');
    expect(classification.scope).toBe('public');
    expect(classification.recommendedRobots).toBe('index, follow');
    expect(classification.includeInSitemap).toBe(true);
  });
});


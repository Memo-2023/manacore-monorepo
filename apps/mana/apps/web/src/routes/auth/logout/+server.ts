// OIDC-BFF Logout (nur managarten.com). Löscht die First-Party-Cookies.
import { oidc } from '$lib/auth/oidc-server';

export const POST = oidc.logout;

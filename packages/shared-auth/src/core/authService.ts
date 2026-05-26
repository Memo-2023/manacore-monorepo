import type {
	AuthServiceConfig,
	AuthServiceInterface,
	AuthEndpoints,
	AuthResult,
	AuthErrorCode,
	PasskeyCapability,
	TokenRefreshResult,
	UserData,
	StorageKeys,
	CreditBalance,
	B2BInfo,
} from '../types';
import { getStorageAdapter } from '../adapters/storage';
import { getDeviceAdapter } from '../adapters/device';
import {
	decodeToken,
	isTokenValidLocally,
	getUserFromToken,
	getB2BInfo as getB2BInfoFromToken,
	shouldDisableRevenueCat as checkRevenueCat,
	isB2BUser as checkB2BUser,
	getAppSettings as getAppSettingsFromToken,
} from './jwtUtils';

/**
 * Default storage keys
 */
const DEFAULT_STORAGE_KEYS: StorageKeys = {
	APP_TOKEN: '@auth/appToken',
	REFRESH_TOKEN: '@auth/refreshToken',
	USER_EMAIL: '@auth/userEmail',
};

/**
 * Default API endpoints - Updated for Mana Core Auth
 */
const DEFAULT_ENDPOINTS: AuthEndpoints = {
	signIn: '/api/v1/auth/login',
	signUp: '/api/v1/auth/register',
	signOut: '/api/v1/auth/logout',
	refresh: '/api/v1/auth/refresh',
	validate: '/api/v1/auth/validate',
	forgotPassword: '/api/v1/auth/forgot-password',
	resetPassword: '/api/v1/auth/reset-password',
	resendVerification: '/api/v1/auth/resend-verification',
	credits: '/api/v1/credits/balance',
	// Better Auth native endpoints for SSO
	getSession: '/api/auth/get-session',
	passkeyRegisterOptions: '/api/v1/auth/passkeys/register/options',
	passkeyRegisterVerify: '/api/v1/auth/passkeys/register/verify',
	passkeyAuthOptions: '/api/v1/auth/passkeys/authenticate/options',
	passkeyAuthVerify: '/api/v1/auth/passkeys/authenticate/verify',
	passkeyList: '/api/v1/auth/passkeys',
	passkeyCapability: '/api/v1/auth/passkeys/capability',
};

/**
 * Create an authentication service with the given configuration
 */
export function createAuthService(config: AuthServiceConfig): AuthServiceInterface {
	const baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
	const storageKeys: StorageKeys = { ...DEFAULT_STORAGE_KEYS, ...config.storageKeys };
	const endpoints: AuthEndpoints = { ...DEFAULT_ENDPOINTS, ...config.endpoints };

	// Callback for token refresh events
	let onTokenRefreshCallback: ((userData: UserData) => void) | null = null;

	// Passkey-capability cache: one-time probe per service instance.
	// Deduplicates concurrent callers via `inFlight`. See
	// getPasskeyCapability() for the rationale.
	let passkeyCapabilityCache: PasskeyCapability | null = null;
	let passkeyCapabilityInFlight: Promise<PasskeyCapability> | null = null;

	const service = {
		/**
		 * Sign in with email and password
		 */
		async signIn(email: string, password: string): Promise<AuthResult> {
			try {
				const storage = getStorageAdapter();
				const deviceAdapter = getDeviceAdapter();
				const deviceInfo = await deviceAdapter.getDeviceInfo();

				const response = await fetch(`${baseUrl}${endpoints.signIn}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						password,
						deviceId: deviceInfo?.deviceId,
						deviceName: deviceInfo?.deviceName,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					return service.handleAuthError(response.status, errorData);
				}

				const data = await response.json();
				const appToken = data.accessToken; // Mana Core Auth uses 'accessToken'
				const refreshToken = data.refreshToken;

				await Promise.all([
					storage.setItem(storageKeys.APP_TOKEN, appToken),
					storage.setItem(storageKeys.REFRESH_TOKEN, refreshToken),
					storage.setItem(storageKeys.USER_EMAIL, email),
				]);

				// Also sign in via Better Auth native endpoint to set session cookie
				// This enables cross-subdomain SSO (cookie shared across *.mana.how)
				try {
					await fetch(`${baseUrl}/api/auth/sign-in/email`, {
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email, password }),
					});
				} catch {
					// SSO cookie is nice-to-have, don't fail login if this fails
				}

				return { success: true };
			} catch (error) {
				console.error('Error signing in:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error during sign in',
				};
			}
		},

		/**
		 * Sign up with email and password
		 * @param email User email
		 * @param password User password
		 * @param sourceAppUrl Optional URL of the app where the user is registering
		 */
		async signUp(email: string, password: string, sourceAppUrl?: string): Promise<AuthResult> {
			try {
				const body: Record<string, string> = { email, password };
				if (sourceAppUrl) {
					body.sourceAppUrl = sourceAppUrl;
				}

				const response = await fetch(`${baseUrl}${endpoints.signUp}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					return service.handleAuthError(response.status, errorData);
				}

				const data = await response.json();

				// If emailVerified is false, the user needs to verify their email before login
				const needsVerification = data?.user?.emailVerified === false;
				return { success: true, needsVerification };
			} catch (error) {
				console.error('Error signing up:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error during sign up',
				};
			}
		},

		/**
		 * Sign out the current user
		 */
		async signOut(): Promise<void> {
			try {
				const storage = getStorageAdapter();
				const refreshToken = await storage.getItem<string>(storageKeys.REFRESH_TOKEN);

				if (refreshToken) {
					await fetch(`${baseUrl}${endpoints.signOut}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					}).catch((err) => console.error('Error logging out on server:', err));
				}

				await service.clearAuthStorage();
			} catch (error) {
				console.error('Error signing out:', error);
			}
		},

		/**
		 * Send password reset email
		 * @param email - User's email address
		 * @param redirectTo - Optional URL to redirect after password reset (current app origin)
		 */
		async forgotPassword(email: string, redirectTo?: string): Promise<AuthResult> {
			try {
				const response = await fetch(`${baseUrl}${endpoints.forgotPassword}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, redirectTo }),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					return service.handleAuthError(response.status, errorData);
				}

				return { success: true };
			} catch (error) {
				console.error('Error sending password reset email:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error during password reset',
				};
			}
		},

		/**
		 * Reset password with token
		 */
		async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
			try {
				const response = await fetch(`${baseUrl}${endpoints.resetPassword}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token, newPassword }),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					return service.handleAuthError(response.status, errorData);
				}

				return { success: true };
			} catch (error) {
				console.error('Error resetting password:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error during password reset',
				};
			}
		},

		/**
		 * Resend verification email
		 * @param email - User's email address
		 * @param sourceAppUrl - Optional URL to redirect after verification (current app origin)
		 */
		async resendVerificationEmail(email: string, sourceAppUrl?: string): Promise<AuthResult> {
			try {
				const response = await fetch(`${baseUrl}${endpoints.resendVerification}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, sourceAppUrl }),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					return service.handleAuthError(response.status, errorData);
				}

				return { success: true };
			} catch (error) {
				console.error('Error resending verification email:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				};
			}
		},

		/**
		 * Refresh the authentication tokens
		 */
		async refreshTokens(currentRefreshToken: string): Promise<TokenRefreshResult> {
			const storage = getStorageAdapter();
			const deviceAdapter = getDeviceAdapter();

			// Check for device ID mismatch
			const storedDeviceId = await deviceAdapter.getStoredDeviceId();
			const deviceInfo = await deviceAdapter.getDeviceInfo();

			if (storedDeviceId && deviceInfo.deviceId !== storedDeviceId) {
				throw new Error('Device ID has changed. Please sign in again.');
			}

			const response = await fetch(`${baseUrl}${endpoints.refresh}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken: currentRefreshToken }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));

				if (response.status === 401 && errorData.message === 'Invalid refresh token') {
					throw new Error('Session expired. Please sign in again.');
				}

				throw new Error(errorData.message || 'Failed to refresh tokens');
			}

			const data = await response.json();
			const appToken = data.accessToken; // Mana Core Auth uses 'accessToken'
			const refreshToken = data.refreshToken;

			if (!appToken || !refreshToken) {
				throw new Error('Invalid response from token refresh - missing tokens');
			}

			// Store new tokens
			await storage.setItem(storageKeys.APP_TOKEN, appToken);
			await storage.setItem(storageKeys.REFRESH_TOKEN, refreshToken);

			// Extract user data from new token
			const storedEmail = await storage.getItem<string>(storageKeys.USER_EMAIL);
			const userData = getUserFromToken(appToken, storedEmail || undefined);

			// Notify callback if registered
			if (userData && onTokenRefreshCallback) {
				onTokenRefreshCallback(userData);
			}

			return { appToken, refreshToken, userData };
		},

		/**
		 * Check if WebAuthn/Passkeys are supported in this browser.
		 *
		 * Browser-only gate — does NOT tell you whether the server has
		 * the passkey plugin wired up. Use `getPasskeyCapability()` for
		 * the full gate before rendering UI; this stays as a cheap
		 * pre-check that avoids an HTTP round-trip when WebAuthn isn't
		 * available at all (e.g. in a non-browser runtime).
		 */
		isPasskeyAvailable(): boolean {
			if (typeof window === 'undefined') return false;
			return !!window.PublicKeyCredential;
		},

		/**
		 * Probe both browser + server support for passkeys.
		 *
		 * Cached for the lifetime of the service instance so the login
		 * page can call this on mount + the settings page can call it
		 * when the security tab opens without re-hitting the server.
		 *
		 * The cache deliberately doesn't persist across page reloads —
		 * a fresh tab means a fresh probe. Server capability can change
		 * after a deploy and we want that to take effect without the
		 * user having to clear their storage.
		 */
		async getPasskeyCapability(): Promise<PasskeyCapability> {
			if (passkeyCapabilityCache) return passkeyCapabilityCache;
			if (passkeyCapabilityInFlight) return passkeyCapabilityInFlight;

			passkeyCapabilityInFlight = (async (): Promise<PasskeyCapability> => {
				const browser = typeof window !== 'undefined' && !!window.PublicKeyCredential;

				let conditionalUI = false;
				if (browser) {
					const PKC = window.PublicKeyCredential as unknown as {
						isConditionalMediationAvailable?: () => Promise<boolean>;
					};
					if (typeof PKC.isConditionalMediationAvailable === 'function') {
						try {
							conditionalUI = await PKC.isConditionalMediationAvailable();
						} catch {
							conditionalUI = false;
						}
					}
				}

				let server = false;
				let rpId: string | null = null;
				try {
					const res = await fetch(`${baseUrl}${endpoints.passkeyCapability}`);
					if (res.ok) {
						const data = (await res.json()) as { enabled?: boolean; rpId?: string | null };
						server = !!data.enabled;
						rpId = data.rpId ?? null;
					}
				} catch {
					// Network error → server disabled from the client's POV.
					// Don't log — the probe runs on every app boot and a flaky
					// network shouldn't spam the error tracker.
				}

				const capability: PasskeyCapability = {
					browser,
					conditionalUI,
					server,
					available: browser && server,
					rpId,
				};
				passkeyCapabilityCache = capability;
				return capability;
			})();

			try {
				return await passkeyCapabilityInFlight;
			} finally {
				passkeyCapabilityInFlight = null;
			}
		},

		/**
		 * Register a new passkey for the current user.
		 *
		 * The shape of the server's options response and the verify
		 * request body match Better-Auth's `@better-auth/passkey` plugin
		 * exactly: the options endpoint returns the raw
		 * PublicKeyCredentialCreationOptionsJSON (no envelope), and the
		 * verify endpoint accepts `{ response, name? }`. The challenge
		 * is carried in a server-set signed cookie — that's why every
		 * fetch in the flow MUST send `credentials: 'include'` so the
		 * cookie survives the round-trip.
		 */
		async registerPasskey(friendlyName?: string): Promise<AuthResult> {
			try {
				const { startRegistration } = await import('@simplewebauthn/browser');
				const appToken = await service.getAppToken();
				if (!appToken) return { success: false, error: 'Not authenticated' };

				// Step 1: Get registration options from server
				const optionsRes = await fetch(`${baseUrl}${endpoints.passkeyRegisterOptions}`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${appToken}`,
					},
				});

				if (!optionsRes.ok) {
					const err = await optionsRes.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to get registration options' };
				}

				const webauthnOptions = await optionsRes.json();

				// Step 2: Create credential via browser WebAuthn API
				const credential = await startRegistration({ optionsJSON: webauthnOptions });

				// Step 3: Send credential to server for verification.
				// `name` is the Better-Auth parameter name for the
				// passkey label; `response` is the credential payload.
				const verifyRes = await fetch(`${baseUrl}${endpoints.passkeyRegisterVerify}`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${appToken}`,
					},
					body: JSON.stringify({ response: credential, name: friendlyName }),
				});

				if (!verifyRes.ok) {
					const err = await verifyRes.json().catch(() => ({}));
					return { success: false, error: err.message || 'Passkey registration failed' };
				}

				return { success: true };
			} catch (error) {
				// User cancelled or WebAuthn error
				if (error instanceof Error && error.name === 'NotAllowedError') {
					return { success: false, error: 'Passkey registration was cancelled' };
				}
				console.error('Passkey registration error:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Passkey registration failed',
				};
			}
		},

		/**
		 * Sign in with a passkey.
		 *
		 * Pass `{ conditional: true }` to use the WebAuthn Conditional UI flow,
		 * where the browser surfaces passkeys directly inside the email autofill
		 * dropdown instead of opening a modal. The host MUST verify
		 * `PublicKeyCredential.isConditionalMediationAvailable()` first.
		 *
		 * Server / client shape matches Better-Auth's `@better-auth/passkey`
		 * plugin exactly: options endpoint returns the raw
		 * PublicKeyCredentialRequestOptionsJSON (no envelope), verify endpoint
		 * accepts `{ response: credential }`. The challenge lives in a signed
		 * cookie set by the server, so every fetch MUST send `credentials:
		 * 'include'` for the cookie to round-trip.
		 */
		async signInWithPasskey(options: { conditional?: boolean } = {}): Promise<AuthResult> {
			try {
				const { startAuthentication } = await import('@simplewebauthn/browser');
				const storage = getStorageAdapter();

				// Step 1: Get authentication options from server
				const optionsRes = await fetch(`${baseUrl}${endpoints.passkeyAuthOptions}`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				});

				if (!optionsRes.ok) {
					const err = await optionsRes.json().catch(() => ({}));
					// PASSKEY_NOT_ENABLED is a feature gate, not an error. The
					// login page may call this on mount for conditional UI; we
					// must not log anything or the error tracker fires on
					// every visitor. The caller branches on `code`.
					return {
						success: false,
						error: err.message || 'Failed to get authentication options',
						code: err.error as AuthErrorCode | undefined,
					};
				}

				const webauthnOptions = await optionsRes.json();

				// Step 2: Authenticate via browser WebAuthn API
				const credential = await startAuthentication({
					optionsJSON: webauthnOptions,
					useBrowserAutofill: options.conditional === true,
				});

				// Step 3: Send credential to server for verification.
				// Better-Auth expects `{ response: credential }` — the
				// challenge is read from the signed cookie, not the body.
				const verifyRes = await fetch(`${baseUrl}${endpoints.passkeyAuthVerify}`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ response: credential }),
				});

				if (!verifyRes.ok) {
					const err = await verifyRes.json().catch(() => ({}));
					return { success: false, error: err.message || 'Passkey authentication failed' };
				}

				const data = await verifyRes.json();
				const appToken = data.accessToken;
				const refreshToken = data.refreshToken;

				await Promise.all([
					storage.setItem(storageKeys.APP_TOKEN, appToken),
					storage.setItem(storageKeys.REFRESH_TOKEN, refreshToken),
					storage.setItem(storageKeys.USER_EMAIL, data.user?.email || ''),
				]);

				return { success: true };
			} catch (error) {
				if (error instanceof Error && error.name === 'NotAllowedError') {
					return { success: false, error: 'Passkey authentication was cancelled' };
				}
				console.error('Passkey authentication error:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Passkey authentication failed',
				};
			}
		},

		/**
		 * List user's registered passkeys
		 */
		async listPasskeys(): Promise<any[]> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return [];

				const res = await fetch(`${baseUrl}${endpoints.passkeyList}`, {
					headers: { Authorization: `Bearer ${appToken}` },
				});

				if (!res.ok) return [];
				return await res.json();
			} catch {
				return [];
			}
		},

		/**
		 * Delete a passkey
		 */
		async deletePasskey(passkeyId: string): Promise<AuthResult> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return { success: false, error: 'Not authenticated' };

				const res = await fetch(`${baseUrl}${endpoints.passkeyList}/${passkeyId}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${appToken}` },
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to delete passkey' };
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to delete passkey',
				};
			}
		},

		/**
		 * Rename a passkey
		 */
		async renamePasskey(passkeyId: string, friendlyName: string): Promise<AuthResult> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return { success: false, error: 'Not authenticated' };

				const res = await fetch(`${baseUrl}${endpoints.passkeyList}/${passkeyId}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${appToken}`,
					},
					body: JSON.stringify({ friendlyName }),
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to rename passkey' };
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to rename passkey',
				};
			}
		},

		/**
		 * Enable 2FA - returns TOTP URI for QR code and backup codes
		 */
		async enableTwoFactor(
			password: string
		): Promise<{ success: boolean; totpURI?: string; backupCodes?: string[]; error?: string }> {
			try {
				const response = await fetch(`${baseUrl}/api/auth/two-factor/enable`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ password }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to enable 2FA' };
				}

				const data = await response.json();
				return { success: true, totpURI: data.totpURI, backupCodes: data.backupCodes };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to enable 2FA',
				};
			}
		},

		/**
		 * Disable 2FA
		 */
		async disableTwoFactor(password: string): Promise<AuthResult> {
			try {
				const response = await fetch(`${baseUrl}/api/auth/two-factor/disable`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ password }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to disable 2FA' };
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to disable 2FA',
				};
			}
		},

		/**
		 * Verify TOTP code during login (when 2FA is required)
		 */
		async verifyTwoFactor(code: string, trustDevice?: boolean): Promise<AuthResult> {
			try {
				const storage = getStorageAdapter();

				const response = await fetch(`${baseUrl}/api/auth/two-factor/verify-totp`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code, trustDevice }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Invalid code' };
				}

				// After 2FA verification, we need to get tokens
				// The session cookie is now set by Better Auth
				// Exchange session for JWT tokens via session-to-token
				const tokenResponse = await fetch(`${baseUrl}/api/v1/auth/session-to-token`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				});

				if (tokenResponse.ok) {
					const tokenData = await tokenResponse.json();
					if (tokenData.accessToken && tokenData.refreshToken) {
						await Promise.all([
							storage.setItem(storageKeys.APP_TOKEN, tokenData.accessToken),
							storage.setItem(storageKeys.REFRESH_TOKEN, tokenData.refreshToken),
							storage.setItem(storageKeys.USER_EMAIL, tokenData.user?.email || ''),
						]);
					}
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Verification failed',
				};
			}
		},

		/**
		 * Verify backup code during login
		 */
		async verifyBackupCode(code: string): Promise<AuthResult> {
			try {
				const storage = getStorageAdapter();

				const response = await fetch(`${baseUrl}/api/auth/two-factor/verify-backup-code`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Invalid backup code' };
				}

				// Exchange session for JWT tokens
				const tokenResponse = await fetch(`${baseUrl}/api/v1/auth/session-to-token`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				});

				if (tokenResponse.ok) {
					const tokenData = await tokenResponse.json();
					if (tokenData.accessToken && tokenData.refreshToken) {
						await Promise.all([
							storage.setItem(storageKeys.APP_TOKEN, tokenData.accessToken),
							storage.setItem(storageKeys.REFRESH_TOKEN, tokenData.refreshToken),
							storage.setItem(storageKeys.USER_EMAIL, tokenData.user?.email || ''),
						]);
					}
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Verification failed',
				};
			}
		},

		/**
		 * Generate new backup codes (replaces existing ones)
		 */
		async generateBackupCodes(
			password: string
		): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
			try {
				const response = await fetch(`${baseUrl}/api/auth/two-factor/generate-backup-codes`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ password }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to generate backup codes' };
				}

				const data = await response.json();
				return { success: true, backupCodes: data.backupCodes };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to generate backup codes',
				};
			}
		},

		/**
		 * Change password
		 */
		async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return { success: false, error: 'Not authenticated' };

				const response = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${appToken}`,
					},
					body: JSON.stringify({ currentPassword, newPassword }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to change password' };
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to change password',
				};
			}
		},

		/**
		 * Send magic link for passwordless login
		 */
		async sendMagicLink(email: string): Promise<AuthResult> {
			try {
				const response = await fetch(`${baseUrl}/api/auth/magic-link/send-magic-link`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email }),
				});

				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to send magic link' };
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to send magic link',
				};
			}
		},

		/**
		 * Get security events (audit log)
		 */
		async getSecurityEvents(limit = 50): Promise<any[]> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return [];

				const res = await fetch(`${baseUrl}/api/v1/auth/security-events?limit=${limit}`, {
					headers: { Authorization: `Bearer ${appToken}` },
				});

				if (!res.ok) return [];
				return await res.json();
			} catch {
				return [];
			}
		},

		/**
		 * List active sessions
		 */
		async listSessions(): Promise<any[]> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return [];

				const res = await fetch(`${baseUrl}/api/v1/auth/sessions`, {
					headers: { Authorization: `Bearer ${appToken}` },
				});

				if (!res.ok) return [];
				return await res.json();
			} catch {
				return [];
			}
		},

		/**
		 * Revoke a session
		 */
		async revokeSession(sessionId: string): Promise<AuthResult> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return { success: false, error: 'Not authenticated' };

				const res = await fetch(`${baseUrl}/api/v1/auth/sessions/${sessionId}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${appToken}` },
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					return { success: false, error: err.message || 'Failed to revoke session' };
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to revoke session',
				};
			}
		},

		/**
		 * Get the current app token
		 */
		async getAppToken(): Promise<string | null> {
			try {
				const storage = getStorageAdapter();
				return await storage.getItem<string>(storageKeys.APP_TOKEN);
			} catch (error) {
				console.error('Error getting app token:', error);
				return null;
			}
		},

		/**
		 * Get the current refresh token
		 */
		async getRefreshToken(): Promise<string | null> {
			try {
				const storage = getStorageAdapter();
				return await storage.getItem<string>(storageKeys.REFRESH_TOKEN);
			} catch (error) {
				console.debug('Error getting refresh token:', error);
				return null;
			}
		},

		/**
		 * Update stored tokens
		 */
		async updateTokens(appToken: string, refreshToken: string): Promise<void> {
			const storage = getStorageAdapter();
			await Promise.all([
				storage.setItem(storageKeys.APP_TOKEN, appToken),
				storage.setItem(storageKeys.REFRESH_TOKEN, refreshToken),
			]);

			// Notify callback
			const storedEmail = await storage.getItem<string>(storageKeys.USER_EMAIL);
			const userData = getUserFromToken(appToken, storedEmail || undefined);
			if (userData && onTokenRefreshCallback) {
				onTokenRefreshCallback(userData);
			}
		},

		/**
		 * Get user from current token
		 */
		async getUserFromToken(): Promise<UserData | null> {
			const storage = getStorageAdapter();
			const appToken = await storage.getItem<string>(storageKeys.APP_TOKEN);
			if (!appToken) return null;

			const storedEmail = await storage.getItem<string>(storageKeys.USER_EMAIL);
			return getUserFromToken(appToken, storedEmail || undefined);
		},

		/**
		 * Clear all authentication data
		 */
		async clearAuthStorage(): Promise<void> {
			const storage = getStorageAdapter();
			await Promise.all(Object.values(storageKeys).map((key) => storage.removeItem(key)));
		},

		/**
		 * Check if user is authenticated
		 */
		async isAuthenticated(): Promise<boolean> {
			const appToken = await service.getAppToken();
			if (!appToken) return false;
			return isTokenValidLocally(appToken);
		},

		/**
		 * Check if token is valid locally
		 */
		isTokenValidLocally(token: string): boolean {
			return isTokenValidLocally(token);
		},

		/**
		 * Decode token
		 */
		decodeToken(token: string) {
			return decodeToken(token);
		},

		/**
		 * Get user credits
		 */
		async getUserCredits(): Promise<CreditBalance | null> {
			try {
				const appToken = await service.getAppToken();
				if (!appToken) return null;

				const response = await fetch(`${baseUrl}${endpoints.credits}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${appToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					throw new Error('Failed to fetch user credits');
				}

				const data = await response.json();
				return {
					credits: (data.balance || 0) + (data.freeCreditsRemaining || 0),
					maxCreditLimit: data.maxCreditLimit || 1000,
					userId: data.userId || 'unknown',
				};
			} catch (error) {
				console.error('Error fetching user credits:', error);
				return null;
			}
		},

		/**
		 * Check if user is B2B
		 */
		async isB2BUser(): Promise<boolean> {
			const appToken = await service.getAppToken();
			if (!appToken) return false;
			return checkB2BUser(appToken);
		},

		/**
		 * Get B2B information
		 */
		async getB2BInfo(): Promise<B2BInfo | null> {
			const appToken = await service.getAppToken();
			if (!appToken) return null;
			return getB2BInfoFromToken(appToken);
		},

		/**
		 * Check if RevenueCat should be disabled
		 */
		async shouldDisableRevenueCat(): Promise<boolean> {
			const appToken = await service.getAppToken();
			if (!appToken) return false;
			return checkRevenueCat(appToken);
		},

		/**
		 * Get app settings from token
		 */
		async getAppSettings(): Promise<Record<string, unknown> | null> {
			const appToken = await service.getAppToken();
			if (!appToken) return null;
			return getAppSettingsFromToken(appToken);
		},

		/**
		 * Set callback for token refresh events
		 */
		set onTokenRefresh(callback: ((userData: UserData) => void) | null) {
			onTokenRefreshCallback = callback;
		},

		/**
		 * Get callback for token refresh events
		 */
		get onTokenRefresh(): ((userData: UserData) => void) | null {
			return onTokenRefreshCallback;
		},

		/**
		 * Handle authentication errors from the mana-auth wrapper.
		 *
		 * As of the auth-errors refactor, the server returns a structured
		 * envelope:
		 *
		 *   { error: AuthErrorCode, message: string, status: number,
		 *     retryAfterSec?: number }
		 *
		 * `error` is a stable machine-readable code the UI switches on
		 * (and translates). `message` is a localised, user-safe fallback
		 * for codes the UI doesn't recognise yet (forward-compat).
		 *
		 * The legacy string-matching heuristics below are kept for
		 * resilience against a) handlers that haven't been refactored
		 * yet and b) Better Auth native endpoints the client still calls
		 * directly (passkey options, /api/auth/* fallbacks).
		 */
		handleAuthError(status: number, errorData: Record<string, unknown>): AuthResult {
			// New envelope: trust `error` as the canonical code.
			const envelopeCode = typeof errorData.error === 'string' ? errorData.error : undefined;
			const envelopeMessage = typeof errorData.message === 'string' ? errorData.message : undefined;
			const retryAfterSec =
				typeof errorData.retryAfterSec === 'number' ? errorData.retryAfterSec : undefined;

			if (envelopeCode && /^[A-Z_]+$/.test(envelopeCode)) {
				return {
					success: false,
					error: envelopeCode,
					code: envelopeCode as AuthResult['code'],
					retryAfter: retryAfterSec,
				};
			}

			// Legacy paths: infer from status + message heuristics.
			if (status === 401) {
				const message = String(errorData.message || '');
				const code = errorData.code;

				if (
					message.includes('Firebase user detected') ||
					message.includes('password reset required') ||
					code === 'FIREBASE_USER_PASSWORD_RESET_REQUIRED'
				) {
					return { success: false, error: 'FIREBASE_USER_PASSWORD_RESET_REQUIRED' };
				}

				if (
					message.includes('Email not confirmed') ||
					message.includes('Email not verified') ||
					code === 'EMAIL_NOT_VERIFIED'
				) {
					return { success: false, error: 'EMAIL_NOT_VERIFIED', code: 'EMAIL_NOT_VERIFIED' };
				}

				return {
					success: false,
					error: 'INVALID_CREDENTIALS',
					code: 'INVALID_CREDENTIALS',
				};
			}

			if (status === 403) {
				return { success: false, error: 'EMAIL_NOT_VERIFIED', code: 'EMAIL_NOT_VERIFIED' };
			}

			return { success: false, error: envelopeMessage || 'Authentication failed' };
		},

		/**
		 * Get the base URL
		 */
		getBaseUrl(): string {
			return baseUrl;
		},

		/**
		 * Get storage keys
		 */
		getStorageKeys(): StorageKeys {
			return storageKeys;
		},

		/**
		 * Try to authenticate using SSO session cookie
		 *
		 * This enables cross-domain SSO: If the user is logged in on another app
		 * (e.g., calendar.mana.how), they will automatically be logged in here
		 * via the shared session cookie on .mana.how
		 *
		 * @returns AuthResult with success=true if SSO succeeded
		 */
		async trySSO(): Promise<AuthResult> {
			try {
				const storage = getStorageAdapter();

				// Check if we already have valid tokens - skip SSO if so
				const existingToken = await storage.getItem<string>(storageKeys.APP_TOKEN);
				if (existingToken && isTokenValidLocally(existingToken)) {
					return { success: true };
				}

				// Try to get session from cookie (credentials: 'include' sends cookies)
				// Use AbortController with timeout so the app doesn't hang when auth is unreachable
				const ssoAbort = AbortSignal.timeout(5000);
				const response = await fetch(`${baseUrl}${endpoints.getSession}`, {
					method: 'GET',
					credentials: 'include', // Send cookies cross-origin
					headers: {
						'Content-Type': 'application/json',
					},
					signal: ssoAbort,
				});

				if (!response.ok) {
					// No valid session cookie - user needs to login manually
					return { success: false, error: 'No SSO session found' };
				}

				const data = await response.json();

				// Better Auth returns session with user info
				if (!data.session || !data.user) {
					return { success: false, error: 'Invalid session response' };
				}

				// Now get tokens by signing in with the session
				// We need to exchange the session for JWT tokens
				const tokenAbort = AbortSignal.timeout(5000);
				const tokenResponse = await fetch(`${baseUrl}/api/v1/auth/session-to-token`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					signal: tokenAbort,
				});

				if (!tokenResponse.ok) {
					// Fallback: Session exists but no token endpoint
					// Store session info for display, but user may need to re-authenticate for API calls
					console.warn('SSO: Session found but token exchange not available');
					return { success: false, error: 'Token exchange not available' };
				}

				const tokenData = await tokenResponse.json();
				const appToken = tokenData.accessToken;
				const refreshToken = tokenData.refreshToken;

				if (!appToken || !refreshToken) {
					return { success: false, error: 'Invalid token response' };
				}

				// Store the tokens
				await Promise.all([
					storage.setItem(storageKeys.APP_TOKEN, appToken),
					storage.setItem(storageKeys.REFRESH_TOKEN, refreshToken),
					storage.setItem(storageKeys.USER_EMAIL, data.user.email || ''),
				]);

				console.log('SSO: Successfully authenticated via session cookie');
				return { success: true };
			} catch (error) {
				// SSO failed - this is expected if user hasn't logged in anywhere
				console.debug('SSO check failed:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'SSO check failed',
				};
			}
		},
	};

	return service;
}

/**
 * Type for the auth service instance.
 * Uses the explicit interface instead of ReturnType<> to avoid TS inference truncation.
 */
export type AuthService = AuthServiceInterface;

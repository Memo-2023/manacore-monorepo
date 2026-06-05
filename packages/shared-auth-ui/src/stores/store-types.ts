/**
 * Shared Auth Store Types
 * Generic types for creating auth stores with custom user types
 */

/**
 * Base user interface that all app-specific user types must extend
 */
export interface BaseUser {
	id: string;
	email: string;
}

/**
 * Auth operation result with typed user
 */
export interface AuthResult<TUser extends BaseUser = BaseUser> {
	success: boolean;
	error?: string;
	needsVerification?: boolean;
	user?: TUser;
}

/**
 * Auth service interface that auth stores expect
 * Apps implement this to integrate with their auth backend
 */
export interface AuthServiceAdapter<TUser extends BaseUser = BaseUser> {
	/** Check if user is authenticated */
	isAuthenticated(): Promise<boolean>;

	/** Get user data from stored token/session */
	getUserFromToken(): Promise<TUser | null>;

	/** Sign in with email and password */
	signIn(email: string, password: string): Promise<AuthResult<TUser>>;

	/** Sign up with email and password */
	signUp(email: string, password: string): Promise<AuthResult<TUser>>;

	/** Send password reset email */
	forgotPassword(email: string): Promise<{ success: boolean; error?: string }>;

	/** Sign out user */
	signOut(): Promise<void>;
}

/**
 * Auth store state interface
 */
export interface AuthStoreState<TUser extends BaseUser = BaseUser> {
	user: TUser | null;
	loading: boolean;
	error: string | null;
	isAuthenticated: boolean;
}

/**
 * Auth store actions interface
 */
export interface AuthStoreActions<TUser extends BaseUser = BaseUser> {
	/** Initialize auth state from stored tokens */
	initialize(): Promise<void>;

	/** Set user manually */
	setUser(user: TUser | null): void;

	/** Sign in with email and password */
	signIn(email: string, password: string): Promise<AuthResult<TUser>>;

	/** Sign up with email and password */
	signUp(email: string, password: string): Promise<AuthResult<TUser>>;

	/** Send password reset email */
	forgotPassword(email: string): Promise<{ success: boolean; error?: string }>;

	/** Sign out user */
	signOut(): Promise<void>;

	/** Check authentication status */
	checkAuth(): Promise<boolean>;

	/** Clear error state */
	clearError(): void;
}

/**
 * Complete auth store interface
 */
export interface AuthStore<TUser extends BaseUser = BaseUser>
	extends AuthStoreState<TUser>, AuthStoreActions<TUser> {}

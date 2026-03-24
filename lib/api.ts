
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL =
  configuredApiBaseUrl ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5056' : '');

export interface User {
  id: number;
  username: string;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  userId: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateContactRequest {
  name: string;
  email: string;
  phone: string;
}

export interface UpdateContactRequest {
  name: string;
  email: string;
  phone: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

/**
 * Set the JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

/**
 * Clear the JWT token from localStorage
 */
export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  if (!API_BASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not configured for production. Set it in Azure Static Web Apps application settings and redeploy.'
    );
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    let parsedBody: { message?: string } | null = null;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      parsedBody = null;
    }

    const message =
      parsedBody?.message ||
      rawBody ||
      response.statusText ||
      `API error: ${response.status}`;

    const apiError = new Error(message) as Error & {
      status?: number;
      endpoint?: string;
    };
    apiError.status = response.status;
    apiError.endpoint = endpoint;
    throw apiError;
  }

  // Some servers omit content-length (chunked transfer), so rely on body text.
  const rawBody = await response.text().catch(() => "");
  if (!rawBody) {
    return { success: true };
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return { success: true, raw: rawBody };
  }
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * Register a new user
 */
export async function registerUser(
  username: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  return fetchAPI('/User/CreateUser', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/**
 * Login a user and get JWT token
 */
export async function loginUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  // Always clear any stale token before a new login attempt.
  clearToken();

  const response = await fetchAPI('/User/Login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  // Backend may return Token (PascalCase) depending on serializer settings.
  const token = response.token ?? response.Token;
  if (token) {
    setToken(token);
  } else {
    throw new Error("Login succeeded but no JWT token was returned by the API.");
  }

  return {
    ...response,
    token,
  };
}

/**
 * Logout (clear local token)
 */
export function logoutUser(): void {
  clearToken();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// ============================================================================
// CONTACT ENDPOINTS
// ============================================================================

/**
 * Get all contacts for the current user
 */
export async function getContacts(): Promise<Contact[]> {
  return fetchAPI('/Contact/GetContacts', {
    method: 'GET',
  });
}

/**
 * Add a new contact
 */
export async function addContact(
  contact: CreateContactRequest
): Promise<{ success: boolean; id?: number }> {
  return fetchAPI('/Contact/AddContact', {
    method: 'POST',
    body: JSON.stringify(contact),
  });
}

/**
 * Update an existing contact
 */
export async function updateContact(
  id: number,
  contact: UpdateContactRequest
): Promise<{ success: boolean }> {
  return fetchAPI(`/Contact/EditContact/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contact),
  });
}

/**
 * Delete a contact
 */
export async function deleteContact(id: number): Promise<{ success: boolean }> {
  return fetchAPI(`/Contact/RemoveContact/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Search contacts by name or email
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  return fetchAPI(`/Contact/Search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
  });
}

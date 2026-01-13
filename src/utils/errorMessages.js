/**
 * Friendly error message mapper
 * Converts backend error messages to user-friendly messages
 */

const errorMessageMap = {
  // Authentication errors
  'Invalid credentials': 'Incorrect email or password. Please try again.',
  'User not found': 'No account found with this email. Would you like to create one?',
  'Email not verified': 'Please verify your email before logging in. Check your email for the verification link.',
  'User with this email already exists': 'An account with this email already exists. Would you like to sign in instead?',
  'Email is required': 'Please enter your email address.',
  'Password is required': 'Please enter your password.',

  // Email verification errors
  'Invalid or expired token': 'This link has expired. Request a new verification email.',
  'Email already verified': 'Your email is already verified. You can now log in.',
  'Token not found': 'This verification link is invalid. Request a new one.',
  'Invalid token': 'This verification link is invalid. Request a new one.',

  // Password reset errors
  'Invalid email': 'Please enter a valid email address.',
  'Password must be at least 8 characters': 'Password must be at least 8 characters long.',
  'Password must contain at least one uppercase letter': 'Password must include at least one uppercase letter (A-Z).',
  'Password must contain at least one number': 'Password must include at least one number (0-9).',
  'Passwords do not match': 'The passwords you entered do not match.',
  'Current password is incorrect': 'Your current password is incorrect.',

  // Organization/invitation errors
  'Organization not found': 'This organization does not exist.',
  'Invitation not found': 'This invitation does not exist or has expired.',
  'Invitation already used': 'This invitation has already been used.',
  'You must use the invited email': 'Please use the email address this invitation was sent to.',
  'User is already a member': 'This user is already a member of the organization.',
  'Seat limit reached': 'Your organization has reached its member limit. Please contact your administrator.',
  'You are not a member of this organization': 'You do not have access to this organization.',

  // Rate limiting errors
  'Too many requests': 'Too many attempts. Please wait a moment before trying again.',
  'Too many verification email requests': 'You\'ve requested too many verification emails. Please wait 1 hour before trying again.',
  'You have reached the limit for requesting registration links': 'You\'ve reached the daily limit for registration links. Please try again tomorrow.',
  'Too many login attempts': 'Too many login attempts. Please wait 1 hour before trying again.',

  // Network/server errors
  'Failed to send email': 'We couldn\'t send the email. Please check your email address and try again.',
  'Failed to fetch': 'Connection error. Please check your internet connection and try again.',
  'Network error': 'Network error. Please check your internet connection and try again.',
  'Internal server error': 'Something went wrong on our end. Please try again later.',
  'Bad request': 'The request was invalid. Please check your input and try again.',

  // Registration specific
  'First name is required': 'Please enter your first name.',
  'Last name is required': 'Please enter your last name.',
  'You must agree to the terms': 'Please accept the terms of service to continue.',

  // Generic fallbacks
  'Unauthorized': 'Your session has expired. Please log in again.',
  'Forbidden': 'You do not have permission to access this resource.',
  'Not found': 'The requested resource was not found.',
  'Server error': 'A server error occurred. Please try again later.',
};

/**
 * Get a friendly error message
 * @param {string|Error|Object} error - The error message, Error object, or API error response
 * @returns {string} User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  let errorMsg = '';

  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle Error objects
  if (error instanceof Error) {
    errorMsg = error.message;
  }
  // Handle API response objects
  else if (error?.response?.data?.message) {
    errorMsg = error.response.data.message;
  }
  // Handle string messages
  else if (typeof error === 'string') {
    errorMsg = error;
  }
  // Handle objects with message property
  else if (error?.message) {
    errorMsg = error.message;
  }

  // Check if we have a friendly mapping
  for (const [key, friendly] of Object.entries(errorMessageMap)) {
    if (errorMsg.toLowerCase().includes(key.toLowerCase())) {
      return friendly;
    }
  }

  // If no mapping found, return original message (sanitized)
  if (errorMsg) {
    return errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1);
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get an array of form validation error messages
 * @param {Array|Object} errors - Error object from backend validation
 * @returns {Object} Formatted errors with friendly messages
 */
export function getFriendlyValidationErrors(errors) {
  if (Array.isArray(errors)) {
    // Convert array of errors to user-friendly messages
    return errors.map(err => ({
      field: err.property,
      message: getFriendlyErrorMessage(err.message || err),
    }));
  }

  if (typeof errors === 'object') {
    // Convert object of errors
    return Object.entries(errors).reduce((acc, [field, messages]) => {
      const msgArray = Array.isArray(messages) ? messages : [messages];
      acc[field] = msgArray.map(msg => getFriendlyErrorMessage(msg)).join(' ');
      return acc;
    }, {});
  }

  return {};
}

/**
 * Suggestions for common errors
 * @param {string} errorMsg - The error message
 * @returns {string|null} Helpful suggestion for the user
 */
export function getErrorSuggestion(errorMsg) {
  const msg = (errorMsg || '').toLowerCase();

  if (msg.includes('password') && msg.includes('incorrect')) {
    return 'Forgot your password? Click "Can\'t sign in?" to reset it.';
  }

  if (msg.includes('email') && msg.includes('not found')) {
    return 'Don\'t have an account? Click "Get Started" to create one.';
  }

  if (msg.includes('verify') || msg.includes('verification')) {
    return 'Check your email (including spam folder) for the verification link.';
  }

  if (msg.includes('invitation') || msg.includes('expired')) {
    return 'Ask your organization administrator to send you a new invitation.';
  }

  if (msg.includes('rate') || msg.includes('too many')) {
    return 'Please wait a moment and try again.';
  }

  return null;
}

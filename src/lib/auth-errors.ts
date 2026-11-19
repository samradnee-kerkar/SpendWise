// Turns Firebase's technical error codes into messages a user can read.
export function friendlyAuthError(error: any): string {
  switch (error?.code) {
    case "auth/invalid-email":
      return "That email address is not valid.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "No internet connection. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

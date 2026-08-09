import "server-only";
import { createHmac } from "node:crypto";
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import { awsRegion, cognitoClientId, cognitoClientSecret } from "@/lib/aws/env";

/**
 * Cognito, wrapped so the rest of the app never sees its API.
 *
 * The wrapping is worth it for one reason above all: Cognito reports failures
 * as exceptions with names like `UsernameExistsException`, and passing those
 * straight to a form both leaks whether an address is registered and shows
 * people AWS jargon. Every function here returns a discriminated result instead.
 */

const client = new CognitoIdentityProviderClient({
  region: awsRegion,
  requestHandler: { requestTimeout: 5_000 },
  maxAttempts: 3,
});

/**
 * The app client was created *with* a secret, so every call must carry a
 * `SECRET_HASH`: an HMAC of the username and client id, keyed by the secret.
 *
 * This is Cognito's least discoverable requirement. Omit it and every call
 * fails with "Unable to verify secret hash for client", which reads like a
 * misconfigured pool rather than a missing parameter. The alternative — a
 * client with no secret — would mean the client id alone is enough to attempt
 * sign-ups from anywhere, so the secret is worth keeping and this is its cost.
 */
function secretHash(username: string): string {
  return createHmac("sha256", cognitoClientSecret())
    .update(username + cognitoClientId())
    .digest("base64");
}

export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export interface SignUpOutcome {
  /** Cognito's immutable user id. This is what a profile is keyed by, never the email. */
  userSub: string;
  /** False when Cognito has emailed a confirmation code. */
  confirmed: boolean;
  /** Where the code went, as Cognito reports it — already partly masked. */
  codeSentTo?: string;
}

export async function cognitoSignUp(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<AuthResult<SignUpOutcome>> {
  try {
    const res = await client.send(
      new SignUpCommand({
        ClientId: cognitoClientId(),
        SecretHash: secretHash(input.email),
        Username: input.email,
        Password: input.password,
        UserAttributes: [
          { Name: "email", Value: input.email },
          { Name: "custom:full_name", Value: input.fullName },
        ],
      })
    );

    return {
      ok: true,
      data: {
        userSub: res.UserSub!,
        confirmed: Boolean(res.UserConfirmed),
        codeSentTo: res.CodeDeliveryDetails?.Destination,
      },
    };
  } catch (e) {
    return failure(e);
  }
}

export async function cognitoConfirmSignUp(
  email: string,
  code: string
): Promise<AuthResult<true>> {
  try {
    await client.send(
      new ConfirmSignUpCommand({
        ClientId: cognitoClientId(),
        SecretHash: secretHash(email),
        Username: email,
        ConfirmationCode: code,
      })
    );
    return { ok: true, data: true };
  } catch (e) {
    return failure(e);
  }
}

export async function cognitoResendCode(email: string): Promise<AuthResult<true>> {
  try {
    await client.send(
      new ResendConfirmationCodeCommand({
        ClientId: cognitoClientId(),
        SecretHash: secretHash(email),
        Username: email,
      })
    );
    return { ok: true, data: true };
  } catch (e) {
    return failure(e);
  }
}

/**
 * Start a password reset. Cognito emails a six-digit code.
 *
 * Always reports success, even for an address that does not exist. Cognito's
 * own `UserNotFoundException` would otherwise turn this form into an account
 * enumeration oracle — type an address, learn whether it is registered. The
 * pool has `PreventUserExistenceErrors` on for the same reason.
 */
export async function cognitoForgotPassword(email: string): Promise<AuthResult<true>> {
  try {
    await client.send(
      new ForgotPasswordCommand({
        ClientId: cognitoClientId(),
        SecretHash: secretHash(email),
        Username: email,
      })
    );
    return { ok: true, data: true };
  } catch (e) {
    const name = (e as { name?: string }).name;
    // Genuinely nothing to tell them apart from rate limiting, which is real
    // feedback rather than a leak.
    if (name === "UserNotFoundException" || name === "InvalidParameterException") {
      return { ok: true, data: true };
    }
    return failure(e);
  }
}

export async function cognitoConfirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<AuthResult<true>> {
  try {
    await client.send(
      new ConfirmForgotPasswordCommand({
        ClientId: cognitoClientId(),
        SecretHash: secretHash(email),
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      })
    );
    return { ok: true, data: true };
  } catch (e) {
    return failure(e);
  }
}

export async function cognitoSignIn(
  email: string,
  password: string
): Promise<AuthResult<AuthenticationResultType>> {
  try {
    const res = await client.send(
      new InitiateAuthCommand({
        ClientId: cognitoClientId(),
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash(email),
        },
      })
    );

    if (!res.AuthenticationResult) {
      // A challenge (new password required, MFA) rather than a session. None are
      // configured today, so reaching here means the pool changed underneath us.
      return { ok: false, error: "Additional verification is required.", code: res.ChallengeName };
    }
    return { ok: true, data: res.AuthenticationResult };
  } catch (e) {
    return failure(e);
  }
}

/**
 * Cognito exceptions → messages a person should see.
 *
 * `UsernameExistsException` is deliberately *not* passed through. Telling an
 * anonymous visitor that an address is already registered is an account
 * enumeration oracle — the same reason the existing sign-in action returns one
 * vague message for both a wrong password and an unknown address.
 */
function failure(e: unknown): { ok: false; error: string; code?: string } {
  const name = (e as { name?: string }).name ?? "UnknownError";

  const messages: Record<string, string> = {
    UsernameExistsException:
      "If that address isn't already registered, you'll receive a confirmation email shortly.",
    InvalidPasswordException: "Choose a password with at least 8 characters.",
    InvalidParameterException: "Please check the details and try again.",
    CodeMismatchException: "That confirmation code isn't right. Check the email and try again.",
    ExpiredCodeException: "That code has expired. Request a new one.",
    NotAuthorizedException: "That email and password combination didn't work.",
    UserNotConfirmedException: "Confirm your email address first — check your inbox.",
    UserNotFoundException: "That email and password combination didn't work.",
    TooManyRequestsException: "Too many attempts. Wait a moment and try again.",
    LimitExceededException: "Too many attempts. Wait a moment and try again.",
  };

  return { ok: false, error: messages[name] ?? "Something went wrong. Please try again.", code: name };
}

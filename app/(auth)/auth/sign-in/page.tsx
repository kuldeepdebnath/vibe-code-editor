import SignInFormClient from "@/modules/auth/components/sign-in-form-client";
import Image from "next/image";
import React from "react";

const authErrorMessages: Record<string, string> = {
  Configuration:
    "Authentication could not reach your database. If you're using MongoDB Atlas, add your current IP address to Network Access and try again.",
  AccessDenied: "You do not have access to sign in with that account.",
  Verification: "Your sign-in link is no longer valid. Please try again.",
};

const page = async ({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) => {
  const resolvedSearchParams = searchParams
    ? await searchParams
    : undefined;

  const errorMessage = resolvedSearchParams?.error
    ? authErrorMessages[resolvedSearchParams.error] ??
      "Sign-in failed. Please try again."
    : null;

  return (
    <>
      <Image
        src="/login.svg"
        alt="Login-Image"
        height={300}
        width={300}
        loading="eager"
        className="m-6"
        style={{ height: "auto" }}
      />
      {errorMessage ? (
        <div className="mb-4 w-full max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}
      <SignInFormClient />
    </>
  );
};

export default page;

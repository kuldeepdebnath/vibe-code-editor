import SignInFormClient from "@/modules/auth/components/sign-in-form-client";
import Image from "next/image";
import React from "react";

const page = () => {
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
      <SignInFormClient />
    </>
  );
};

export default page;

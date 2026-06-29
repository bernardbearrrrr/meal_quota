"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, getToken } from "../lib/api";

type Role = "admin" | "operator" | "it";

type RoleGuardProps = {
  allowedRole: Role;
  children: React.ReactNode;
};

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role !== allowedRole) {
      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "operator") {
        router.replace("/scan/scanner");
      } else if (role === "it") {
        router.replace("/it/users");
      } else {
        router.replace("/login");
      }
      return;
    }

    setAuthorized(true);
  }, [allowedRole, router]);

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}

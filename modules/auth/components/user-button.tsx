"use client";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LogOut, User } from "lucide-react";
import LogoutButton from "./logout-button";
import type { DefaultSession } from "next-auth";

type UserButtonProps = {
  user?: DefaultSession["user"] | null;
};

const UserButton = ({ user }: UserButtonProps) => {
  const userImage = user?.image ?? undefined;
  const userName = user?.name ?? "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={cn("relative rounded-full")}>
          <Avatar>
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-red-500">
              <User className="text-white" />
            </AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-64"
      >
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-medium leading-none">{userName}</p>
          <p className="break-all text-xs font-normal text-muted-foreground">
            {user?.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <LogoutButton>
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            LogOut
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;

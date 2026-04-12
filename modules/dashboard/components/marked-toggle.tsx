"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleStarMarked } from "@/modules/dashboard/actions";
import { StarIcon, StarOffIcon } from "lucide-react";
import React, { forwardRef, useEffect, useState } from "react";
import { toast } from "sonner";

interface MarkedToggleButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  markedForRevision?: boolean;
  id: string;
}

export const MarkedToggleButton = forwardRef<HTMLButtonElement, MarkedToggleButtonProps>(
  ({ markedForRevision = false, id, onClick, className, children, ...props }, ref) => {
    const [isMarked, setIsMarked] = useState(markedForRevision);

    useEffect(() => {
      setIsMarked(markedForRevision);
    }, [markedForRevision]);

    const handleToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      const newMarkedState = !isMarked;
      setIsMarked(newMarkedState);

      try {
        const res = await toggleStarMarked(id, newMarkedState);

        if (!res.success) {
          throw new Error(res.error || "Failed to update marked status");
        }

        setIsMarked(res.isMarked);
        toast.success(res.isMarked ? "Added to Favourites successfully" : "Removed from Favorites successfully");
      } catch (err) {
        console.error("Error toggling marked for revision:", err);
        toast.error("Failed to update marked for revision status");
        setIsMarked(!newMarkedState);
      }
    };

    return (
      <Button
        ref={ref}
        variant="ghost"
        className={cn("flex w-full cursor-pointer items-center justify-start rounded-md px-2 py-1.5 text-sm", className)}
        onClick={handleToggle}
        {...props}
      >
        {isMarked ? (
          <StarIcon size={16} className="mr-2 text-red-500" />
        ) : (
          <StarOffIcon size={16} className="mr-2 text-gray-500" />
        )}
        {children || (isMarked ? "Remove Favourite" : "Add to Favorites")}
      </Button>
    );
  },
);

MarkedToggleButton.displayName = "MarkedToggleButton";
